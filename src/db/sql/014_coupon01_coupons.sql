-- SafarBuddy — 014_coupon01_coupons.sql
-- COUPON-01 — Discount Coupons
--
-- STATUS: new table + new columns, not yet run in production. Run
-- manually in the Supabase SQL editor, then confirm with
-- information_schema.columns per RULE 13 before building anything else
-- on top of it.
--
-- DESIGN DECISION (RULE 15 audit, 2026-09-17): bookings.subtotal /
-- discount / coupon_discount / grand_total already exist live, but:
--   1. grand_total is a generated column whose expression is not
--      recorded in any migration on disk — its formula is unverified
--      (RULE 13), so this milestone does NOT write to coupon_discount
--      or rely on grand_total at all.
--   2. Critically, the amount actually charged via Cashfree is read
--      from bookings.price_snapshot (see payment.actions.ts), which is
--      completely independent of subtotal/grand_total. Writing a
--      coupon amount into coupon_discount would show a "discount" that
--      never actually reduces what the customer pays — a real bug that
--      already existed dormant in the schema, surfaced while scoping
--      this milestone.
--
-- The fix: a coupon's discount is subtracted directly from
-- price_snapshot before it is stored (src/app/actions/booking.actions.ts),
-- since that is the one field the payment flow actually reads. The
-- three new columns below on `bookings` are purely a record of what
-- coupon was used and for how much — proof/audit trail, not part of
-- the charge calculation itself.

-- ---------------------------------------------------------------------
-- 1. Coupons
-- ---------------------------------------------------------------------

create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),

  code text not null,
  description text,

  discount_type text not null
    check (discount_type in ('percentage', 'flat')),

  discount_value numeric(10,2) not null
    check (discount_value > 0),

  -- Only meaningful when discount_type = 'percentage' — caps the
  -- rupee amount a percentage coupon can take off. Null = no cap.
  max_discount_amount numeric(10,2),

  -- Booking subtotal must be at least this much for the coupon to
  -- apply. Null = no minimum.
  min_booking_amount numeric(10,2),

  -- 'global' — valid across every hotel and package.
  -- 'vendor' — valid only for bookings whose vendor_id matches
  -- vendor_id below. vendor_id is used (not hotel_id) because it is
  -- the one column populated on BOTH hotel and package bookings (see
  -- createBooking() in booking.actions.ts), so a single scope column
  -- covers "hotel + package both" per the confirmed requirement
  -- without a separate hotel-only and package-only path.
  scope text not null default 'global'
    check (scope in ('global', 'vendor')),

  vendor_id uuid
    references public.vendors(id)
    on delete cascade,

  constraint coupons_scope_vendor_check check (
    (scope = 'global' and vendor_id is null) or
    (scope = 'vendor' and vendor_id is not null)
  ),

  valid_from timestamptz,
  valid_until timestamptz,

  -- Simple on/off switch — no usage-count limit by explicit product
  -- decision (2026-09-17). An admin disables a coupon by flipping this
  -- rather than it running out of redemptions.
  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz
);

-- Case-insensitive uniqueness so "SAVE20" and "save20" can't both
-- exist as separate coupons.
create unique index if not exists coupons_code_unique
  on public.coupons (upper(code))
  where deleted_at is null;

create index if not exists coupons_vendor_id_idx
  on public.coupons(vendor_id)
  where deleted_at is null;

-- RLS: enabled, no public/authenticated policy — same convention as
-- vendor_payout_details (migration 010) and vendor_settlements
-- (migration 013). Admin CRUD goes through requireRole(['admin',
-- 'super_admin']) with the normal session client (RLS applies but no
-- policy exists, so admin reads/writes must go through
-- createServiceRoleClient() the same way vendor-settlement.actions.ts
-- does — see coupon.actions.ts). The public coupon-validation action
-- (used at checkout, including guest checkout with no session) also
-- uses createServiceRoleClient(), the same trusted-server-write
-- pattern as property-listing.actions.ts and guest bookings.
alter table public.coupons enable row level security;

-- ---------------------------------------------------------------------
-- 2. Coupon usage record on bookings
-- ---------------------------------------------------------------------
-- Snapshot-only, informational — see the header note above for why the
-- actual discount is applied via price_snapshot, not these columns.

alter table public.bookings
  add column if not exists coupon_id uuid
    references public.coupons(id)
    on delete set null,
  add column if not exists coupon_code text,
  add column if not exists coupon_discount_amount numeric(10,2);

