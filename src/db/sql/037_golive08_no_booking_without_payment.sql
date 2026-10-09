-- ROOT PATH: src/db/sql/037_golive08_no_booking_without_payment.sql
-- GOLIVE-08 step 3 (part 1 of 2) — a booking can NEVER become "confirmed"
-- without a successful payment. Run in the Supabase SQL editor. Safe to run
-- right now, BEFORE the new code is deployed. Idempotent.
--
-- Replaces the guard from 035 with a stricter one:
--   1. Nobody using a normal login (customer, vendor OR admin) can move a
--      booking to "confirmed" unless a payment for that booking is already
--      successful (success / partially_refunded / refunded).
--   2. A customer can only CANCEL their own booking. They cannot confirm it,
--      re-open a cancelled one, or change price, dates, vendor, coupon, etc.
--
-- Not affected (service role runs as "service_role" / "postgres"): the Cashfree
-- webhook, the reconciliation cron, refunds, expiry. They confirm bookings after
-- Cashfree has reported the money, exactly as before.
--
-- NOTE for admins: the admin "Confirm booking" button now only works for a booking
-- that already has a successful payment. A booking paid outside the website
-- (cash / bank transfer) must be recorded as a payment first, or confirmed in the
-- SQL editor by the owner.

create or replace function public.guard_bookings_update()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  customer_may_change text[] := array[
    'booking_status', 'cancellation_status', 'cancellation_reason',
    'cancelled_at', 'updated_at', 'updated_by'
  ];
begin
  -- Server code (service role) and the SQL editor are not restricted here.
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  -- RULE 1 — applies to everyone with a normal login, admins included.
  if new.booking_status::text = 'confirmed'
     and old.booking_status::text is distinct from 'confirmed' then
    if not exists (
      select 1
      from public.payments p
      where p.booking_id = new.id
        and p.status::text in ('success', 'partially_refunded', 'refunded')
    ) then
      raise exception 'GOLIVE-08: a booking cannot be confirmed without a successful payment'
        using errcode = '42501';
    end if;
  end if;

  -- Admins may otherwise edit as before.
  if public.is_admin() then
    return new;
  end if;

  -- RULE 2 — customers: only the cancel fields may change ...
  if (to_jsonb(new) - customer_may_change) is distinct from (to_jsonb(old) - customer_may_change) then
    raise exception 'GOLIVE-08: this booking field cannot be changed by the customer'
      using errcode = '42501';
  end if;

  -- ... and the only status change allowed is "cancelled", from pending/confirmed.
  if new.booking_status::text is distinct from old.booking_status::text then
    if new.booking_status::text <> 'cancelled' then
      raise exception 'GOLIVE-08: customers can only cancel a booking'
        using errcode = '42501';
    end if;
    if old.booking_status::text not in ('pending', 'confirmed') then
      raise exception 'GOLIVE-08: a % booking cannot be changed', old.booking_status::text
        using errcode = '42501';
    end if;
  end if;

  return new;
end
$$;

drop trigger if exists trg_guard_bookings_update on public.bookings;
create trigger trg_guard_bookings_update
  before update on public.bookings
  for each row execute function public.guard_bookings_update();

-- ---------------------------------------------------------------------
-- TEST (SQL editor, everything rolled back). Replace the two uuids with a
-- real customer's auth user id and one of THEIR pending, unpaid bookings.
-- Each update must FAIL with a "GOLIVE-08" message.
--
--   begin;
--   set local role authenticated;
--   select set_config('request.jwt.claims',
--     '{"sub":"<CUSTOMER_AUTH_USER_ID>","role":"authenticated"}', true);
--   update public.bookings set booking_status = 'confirmed' where id = '<PENDING_UNPAID_BOOKING_ID>';
--   update public.bookings set notes = '{}'              where id = '<PENDING_UNPAID_BOOKING_ID>';
--   rollback;
-- ---------------------------------------------------------------------
