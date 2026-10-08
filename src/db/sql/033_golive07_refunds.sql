-- 033_golive07_refunds.sql
-- GOLIVE-07a — Refund backend.  RULE 22/24/32/33/34/35.
--
-- BEFORE RUNNING (RULE 7/13): confirm the live schema with
--   select column_name, data_type from information_schema.columns
--    where table_schema='public' and table_name in ('payments','bookings')
--    order by table_name, ordinal_position;
--   select conname, pg_get_constraintdef(oid) from pg_constraint
--    where conrelid = 'public.payments'::regclass and contype = 'c';
-- Expected payments (used here): id, booking_id, amount, currency_code, status,
--   platform_commission_amount, vendor_payout_amount, deleted_at.
-- Expected bookings (used here): id, deleted_at.
--
-- Decisions (RULE 12, owner D4): refunds are ADMIN-INITIATED only. Nothing here
-- refunds automatically. This migration only adds the ledger + atomic helpers.
--
-- Not destructive. Fully idempotent (if not exists / create or replace).

-- 1. payments: running total refunded, and make sure the status check allows
--    the refund states. NOT VALID = enforced on new writes only, so existing
--    rows can never make this migration fail.
alter table public.payments
  add column if not exists refunded_amount numeric(10,2) not null default 0;

alter table public.payments drop constraint if exists payments_status_check;
alter table public.payments
  add constraint payments_status_check
  check (status in (
    'pending','success','failed','cancelled','refunded','partially_refunded',
    -- legacy values from 004_payment_schema.sql, kept so old rows stay valid
    'initiated','processing','paid','flagged'
  )) not valid;

-- 2. bookings: "money is owed back to the customer" flag for the admin list.
alter table public.bookings
  add column if not exists refund_due boolean not null default false;

create index if not exists bookings_refund_due_idx
  on public.bookings (refund_due) where refund_due;

-- 3. Refund ledger. One row per refund request. Never deleted (financial record).
create table if not exists public.payment_refunds (
  id                         uuid primary key default gen_random_uuid(),
  payment_id                 uuid not null references public.payments(id),
  booking_id                 uuid not null references public.bookings(id),
  refund_id                  text not null,            -- OUR id, sent to Cashfree (idempotency key)
  cf_refund_id               text,                     -- Cashfree's id, once known
  amount                     numeric(10,2) not null,
  currency_code              text not null,
  status                     text not null default 'pending',
  reason                     text not null,
  gateway_status             text,
  gateway_message            text,
  -- Settlement snapshot, filled when the refund succeeds (see finalize_refund).
  platform_commission_reversed numeric(10,2) not null default 0,
  vendor_payout_reversed       numeric(10,2) not null default 0,
  requested_by               uuid,                     -- public.users.id of the admin
  requested_at               timestamptz not null default now(),
  processed_at               timestamptz,
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now(),
  constraint payment_refunds_amount_positive check (amount > 0),
  constraint payment_refunds_status_check
    check (status in ('pending','success','failed','cancelled')),
  constraint payment_refunds_refund_id_unique unique (refund_id)
);

create index if not exists payment_refunds_payment_idx on public.payment_refunds (payment_id);
create index if not exists payment_refunds_booking_idx on public.payment_refunds (booking_id);
create index if not exists payment_refunds_pending_idx
  on public.payment_refunds (requested_at) where status = 'pending';

-- RULE 24: RLS on, NO policies = service-role only. Browser/anon/authenticated
-- can neither read nor write refunds.
alter table public.payment_refunds enable row level security;
revoke all on public.payment_refunds from anon, authenticated;

-- 4. create_refund_request: atomically reserve a refund against a payment.
--    Locks the payment row so two admins clicking at once cannot together
--    refund more than was paid.
--    remaining = payment.amount - payment.refunded_amount - (refunds still pending)
create or replace function public.create_refund_request(
  p_payment   uuid,
  p_amount    numeric,
  p_reason    text,
  p_requested_by uuid,
  p_refund_id text
) returns public.payment_refunds
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pay      public.payments%rowtype;
  v_pending  numeric(10,2);
  v_remaining numeric(10,2);
  v_row      public.payment_refunds%rowtype;
begin
  if p_amount is null or p_amount <= 0 or p_amount <> round(p_amount, 2) then
    raise exception 'INVALID_AMOUNT' using errcode = 'P0001';
  end if;
  if p_reason is null or length(btrim(p_reason)) = 0 then
    raise exception 'REASON_REQUIRED' using errcode = 'P0001';
  end if;

  select * into v_pay from public.payments
   where id = p_payment and deleted_at is null
   for update;

  if not found then
    raise exception 'PAYMENT_NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_pay.status not in ('success','partially_refunded') then
    raise exception 'NOT_REFUNDABLE' using errcode = 'P0001';
  end if;

  select coalesce(sum(amount), 0) into v_pending
    from public.payment_refunds
   where payment_id = p_payment and status = 'pending';

  v_remaining := v_pay.amount - v_pay.refunded_amount - v_pending;

  if p_amount > v_remaining then
    raise exception 'AMOUNT_EXCEEDS_REMAINING' using errcode = 'P0001';
  end if;

  insert into public.payment_refunds
    (payment_id, booking_id, refund_id, amount, currency_code, reason, requested_by)
  values
    (v_pay.id, v_pay.booking_id, p_refund_id, p_amount, v_pay.currency_code,
     btrim(p_reason), p_requested_by)
  returning * into v_row;

  return v_row;
end $$;

-- 5. finalize_refund: move a PENDING refund to its final state, exactly once.
--    Idempotent: calling it again for an already-final refund changes nothing
--    and returns applied = false. Webhook, sync job and the request path may
--    all race here; only the first one wins.
--    On 'success' (same transaction):
--      * payments.refunded_amount += amount; status -> refunded | partially_refunded
--      * commission / vendor share reversed proportionally (the LAST refund takes
--        the exact remainder, so rounding can never leave paise behind)
--      * bookings.refund_due -> false
create or replace function public.finalize_refund(
  p_refund_row  uuid,
  p_new_status  text,
  p_cf_refund_id text,
  p_gateway_status text,
  p_message     text
) returns table (applied boolean, final_status text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ref public.payment_refunds%rowtype;
  v_pay public.payments%rowtype;
  v_new_total numeric(10,2);
  v_vendor_rev numeric(10,2);
  v_comm_rev   numeric(10,2);
  v_prev_vendor numeric(10,2);
  v_prev_comm   numeric(10,2);
begin
  if p_new_status not in ('success','failed','cancelled') then
    raise exception 'INVALID_STATUS' using errcode = 'P0001';
  end if;

  select * into v_ref from public.payment_refunds where id = p_refund_row for update;
  if not found then
    raise exception 'REFUND_NOT_FOUND' using errcode = 'P0001';
  end if;

  if v_ref.status <> 'pending' then
    return query select false, v_ref.status;
    return;
  end if;

  if p_new_status <> 'success' then
    update public.payment_refunds
       set status = p_new_status,
           cf_refund_id = coalesce(p_cf_refund_id, cf_refund_id),
           gateway_status = p_gateway_status,
           gateway_message = p_message,
           processed_at = now(),
           updated_at = now()
     where id = v_ref.id;
    return query select true, p_new_status;
    return;
  end if;

  select * into v_pay from public.payments where id = v_ref.payment_id for update;

  v_new_total := v_pay.refunded_amount + v_ref.amount;

  select coalesce(sum(vendor_payout_reversed), 0), coalesce(sum(platform_commission_reversed), 0)
    into v_prev_vendor, v_prev_comm
    from public.payment_refunds
   where payment_id = v_ref.payment_id and status = 'success';

  if v_new_total >= v_pay.amount then
    -- final refund: take the exact remainder of both shares
    v_vendor_rev := coalesce(v_pay.vendor_payout_amount, 0) - v_prev_vendor;
    v_comm_rev   := coalesce(v_pay.platform_commission_amount, 0) - v_prev_comm;
  else
    v_vendor_rev := round(v_ref.amount * coalesce(v_pay.vendor_payout_amount, 0) / v_pay.amount, 2);
    v_comm_rev   := v_ref.amount - v_vendor_rev;
  end if;

  update public.payment_refunds
     set status = 'success',
         cf_refund_id = coalesce(p_cf_refund_id, cf_refund_id),
         gateway_status = p_gateway_status,
         gateway_message = p_message,
         vendor_payout_reversed = v_vendor_rev,
         platform_commission_reversed = v_comm_rev,
         processed_at = now(),
         updated_at = now()
   where id = v_ref.id;

  update public.payments
     set refunded_amount = v_new_total,
         status = case when v_new_total >= v_pay.amount then 'refunded' else 'partially_refunded' end,
         updated_at = now()
   where id = v_pay.id;

  update public.bookings
     set refund_due = false, updated_at = now()
   where id = v_ref.booking_id;

  return query select true, 'success'::text;
end $$;

-- 6. Only the server (service role) may call these.
revoke execute on function public.create_refund_request(uuid, numeric, text, uuid, text) from public, anon, authenticated;
revoke execute on function public.finalize_refund(uuid, text, text, text, text)          from public, anon, authenticated;
grant  execute on function public.create_refund_request(uuid, numeric, text, uuid, text) to service_role;
grant  execute on function public.finalize_refund(uuid, text, text, text, text)          to service_role;
