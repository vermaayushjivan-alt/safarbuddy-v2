-- SafarBuddy — 028_referral01_referrals.sql
-- REFERRAL-01 — Refer & Earn.
--
-- STATUS: new tables + two new columns on public.coupons. NOT yet run
-- in production. Run manually in the Supabase SQL editor, then confirm
-- with information_schema.columns (RULE 13/35) before relying on it.
--
-- OWNER DECISIONS (2026-10-05 chat):
--   * Referrer reward : percentage discount coupon (e.g. 10% off)
--   * Reward timing   : when the referred friend's FIRST PAID booking is
--                       confirmed (Cashfree webhook success)
--   * Friend benefit  : the new user also gets a percentage coupon
--
-- DESIGN (RULE 9 — reuse the coupon system, do not build a second one):
-- Both rewards are ordinary rows in public.coupons. Two additive columns
-- make a coupon personal and one-time:
--   owner_user_id  — only this public.users.id may redeem it
--   is_single_use  — redeemable once (a confirmed/completed booking
--                    already carrying coupon_id blocks reuse)
-- Existing coupons get owner_user_id = null / is_single_use = false, so
-- their behaviour is unchanged.
--
-- public.users.id is used for every user reference below (same id that
-- bookings.customer_id stores), NOT auth.users.id.

-- ---------------------------------------------------------------------
-- 1. Coupons — personal / single-use support (additive, idempotent)
-- ---------------------------------------------------------------------
alter table public.coupons
  add column if not exists owner_user_id uuid
    references public.users(id)
    on delete cascade,
  add column if not exists is_single_use boolean not null default false;

create index if not exists coupons_owner_user_id_idx
  on public.coupons(owner_user_id)
  where owner_user_id is not null and deleted_at is null;

-- ---------------------------------------------------------------------
-- 2. Each user's shareable referral code (one per user)
-- ---------------------------------------------------------------------
create table if not exists public.referral_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  code text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists referral_codes_user_unique
  on public.referral_codes(user_id);

create unique index if not exists referral_codes_code_unique
  on public.referral_codes(upper(code));

-- ---------------------------------------------------------------------
-- 3. Referral relationships (one row per referred friend)
-- ---------------------------------------------------------------------
create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),

  referrer_user_id uuid not null references public.users(id) on delete cascade,
  referred_user_id uuid not null references public.users(id) on delete cascade,

  -- The code the friend signed up with (audit trail).
  referral_code text not null,

  -- 'signed_up' — friend registered, no paid booking yet.
  -- 'rewarded'  — friend's first paid booking confirmed, referrer's
  --               reward coupon issued.
  status text not null default 'signed_up'
    check (status in ('signed_up', 'rewarded')),

  friend_coupon_id uuid references public.coupons(id) on delete set null,
  referrer_coupon_id uuid references public.coupons(id) on delete set null,

  rewarded_booking_id uuid references public.bookings(id) on delete set null,
  rewarded_at timestamptz,

  created_at timestamptz not null default now(),

  constraint referrals_no_self_referral check (referrer_user_id <> referred_user_id)
);

-- A friend can be referred only once, ever.
create unique index if not exists referrals_referred_unique
  on public.referrals(referred_user_id);

create index if not exists referrals_referrer_idx
  on public.referrals(referrer_user_id);

-- ---------------------------------------------------------------------
-- 4. RLS — enabled, NO policies (service-role only), same convention as
--    coupons / vendor_payout_details (RULE 24). All access goes through
--    Server Actions / the webhook using createServiceRoleClient().
-- ---------------------------------------------------------------------
alter table public.referral_codes enable row level security;
alter table public.referrals enable row level security;
