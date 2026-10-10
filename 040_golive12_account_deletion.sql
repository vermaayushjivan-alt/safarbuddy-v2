-- 040_golive12_account_deletion.sql
-- GOLIVE-12 — customer account deletion (DPDP / Play Store).
-- Anonymises public.users + the customer's invoice snapshots in ONE atomic call.
-- Bookings, payments, invoices, settlements are KEPT (tax/accounting records) —
-- only the personal details on them are removed. Called ONLY by the server
-- (service role) after the customer re-authenticated.
-- NOT yet run anywhere.
--
-- RULE 13 — run this FIRST and check the result before creating the function:
--   select table_name, column_name from information_schema.columns
--   where table_schema = 'public'
--     and ((table_name = 'users' and column_name in
--            ('id','email','phone','full_name','avatar_url','is_active','deleted_at'))
--       or (table_name = 'invoices' and column_name in
--            ('booking_id','customer_name','customer_email','customer_phone'))
--       or (table_name = 'roles' and column_name in ('id','name'))
--       or (table_name = 'user_roles' and column_name in ('user_id','role_id'))
--       or (table_name = 'bookings' and column_name in
--            ('id','customer_id','booking_status','refund_due'))
--       or (table_name = 'payment_refunds' and column_name in ('booking_id','status')))
--   order by 1, 2;
--   -- EXPECTED: 21 rows. If a column is missing, STOP and send the result.

create or replace function public.anonymize_user_account(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted_at timestamptz;
begin
  -- lock the user row so two clicks / a new booking cannot race this call
  select u.deleted_at into v_deleted_at
  from public.users u
  where u.id = p_user_id
  for update;

  if not found then
    raise exception 'USER_NOT_FOUND';
  end if;

  if v_deleted_at is not null then
    return; -- already deleted: idempotent
  end if;

  -- Only plain customers may self-delete. Hotel owners, vendors, agents and
  -- staff have listings / payouts / audit trails: they go through support.
  if exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = p_user_id
      and r.name not in ('user', 'customer')
  ) then
    raise exception 'NOT_CUSTOMER_ACCOUNT';
  end if;

  if exists (
    select 1 from public.bookings b
    where b.customer_id = p_user_id
      and b.booking_status in ('pending', 'confirmed')
  ) then
    raise exception 'ACTIVE_BOOKING';
  end if;

  if exists (
    select 1 from public.bookings b
    where b.customer_id = p_user_id and b.refund_due
  ) or exists (
    select 1
    from public.payment_refunds pr
    join public.bookings b on b.id = pr.booking_id
    where b.customer_id = p_user_id and pr.status = 'pending'
  ) then
    raise exception 'REFUND_PENDING';
  end if;

  -- Personal data on retained invoices
  update public.invoices
     set customer_name  = 'Deleted user',
         customer_email = null,
         customer_phone = null
   where booking_id in (
     select b.id from public.bookings b where b.customer_id = p_user_id
   );

  delete from public.user_roles where user_id = p_user_id;

  update public.users
     set email      = 'deleted-' || p_user_id::text || '@deleted.invalid',
         full_name  = 'Deleted user',
         phone      = null,
         avatar_url = null,
         is_active  = false,
         deleted_at = now()
   where id = p_user_id;
end;
$$;

revoke all on function public.anonymize_user_account(uuid) from public, anon, authenticated;
grant execute on function public.anonymize_user_account(uuid) to service_role;

-- TEST (use a THROWAWAY account, never a real customer). Replace the uuid:
--   select public.anonymize_user_account('<throwaway public.users.id>');
--   select email, full_name, phone, is_active, deleted_at from public.users where id = '<same id>';
--   -- expect: deleted-<id>@deleted.invalid | Deleted user | null | false | now
