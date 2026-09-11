-- SafarBuddy — BOOKING-03
-- Allows a booking to be created by an unauthenticated visitor
-- ("guest checkout"), in addition to the existing authenticated-customer
-- flow (BOOKING-01/ROOM-05). Purely additive on the live `public.bookings`
-- table — does not touch any other table.
--
-- Root cause this fixes: `customer_id` is currently NOT NULL, so
-- createBooking() has always required a signed-in user
-- (getAuthUser() -> resolvePublicUserId()). This migration makes
-- `customer_id` nullable and adds the minimum guest-contact columns
-- needed to identify who a customer_id-less booking belongs to, with a
-- DB-level constraint so a booking can never end up with neither.
--
-- Idempotent per RULE 33 — safe to re-run if production-run status is
-- ever uncertain (RULE 35).

-- 1. customer_id becomes optional.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'bookings'
      and column_name = 'customer_id'
      and is_nullable = 'NO'
  ) then
    alter table public.bookings
      alter column customer_id drop not null;
  end if;
end $$;

-- 2. Guest contact columns. All three are required together for a
-- guest booking (validated again at the Server Action layer before
-- insert) so a confirmation page / notification always has someone to
-- reach.
alter table public.bookings
  add column if not exists guest_name text,
  add column if not exists guest_email text,
  add column if not exists guest_phone text;

-- 3. Exactly one of "has an account" or "gave full guest contact
-- details" must be true. Drop-then-add so this migration can be
-- re-run safely (RULE 33) if the constraint definition ever changes.
alter table public.bookings
  drop constraint if exists bookings_customer_or_guest_check;

alter table public.bookings
  add constraint bookings_customer_or_guest_check
  check (
    customer_id is not null
    or (
      guest_name is not null
      and guest_email is not null
      and guest_phone is not null
    )
  );

comment on column public.bookings.guest_name is
  'BOOKING-03: set only for guest (unauthenticated) checkout. Null for bookings made by a signed-in customer_id.';
comment on column public.bookings.guest_email is
  'BOOKING-03: set only for guest (unauthenticated) checkout.';
comment on column public.bookings.guest_phone is
  'BOOKING-03: set only for guest (unauthenticated) checkout.';

-- NOTE on RLS (DATABASE_BIBLE.md v2 Row Level Security section): this
-- migration does not add or change any RLS policy on `bookings`. Its
-- current RLS status remains UNVERIFIED (same as before this
-- migration — flag per RULE 24, confirm before relying on it in
-- production). Guest reads/writes introduced by BOOKING-03 never go
-- through the anon/authenticated RLS path at all: they use
-- createServiceRoleClient() end-to-end (same trusted-server-write
-- pattern already established for the Cashfree webhook and the
-- VENDOR-03 self-service listing flow), specifically because a guest
-- has no session for RLS to evaluate in the first place.

