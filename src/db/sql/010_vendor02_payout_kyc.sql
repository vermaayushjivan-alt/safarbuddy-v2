-- SafarBuddy — 010_vendor02_payout_kyc.sql
-- VENDOR-02 — Hotel Owner Payout KYC Capture.
--
-- STATUS: new table, not yet run in production. Run manually in the
-- Supabase SQL editor, then confirm with information_schema.columns
-- per RULE 13 before building anything else on top of it.
--
-- DESIGN DECISION (RULE 15 audit, 2026-08-28): bank/UPI/beneficiary data
-- is kept in its own table rather than added as columns on public.vendors.
-- Reasons:
--   1. public.vendors has no documented RLS policy (DATABASE_BIBLE.md has
--      no row for it) and is read via getAllVendorsForDropdown() for
--      ordinary admin hotel-form use. Keeping payout/bank data physically
--      separate means that existing read path is never at risk of
--      accidentally selecting sensitive columns.
--   2. pan_number already exists on public.vendors (confirmed live,
--      VENDOR-01) — this migration does NOT duplicate it. Any code that
--      needs PAN + bank details together reads both tables explicitly.
--   3. One-to-one via a unique index on vendor_id, so a second row for
--      the same vendor is rejected at the database level, not just in
--      application code.
--
-- cashfree_beneficiary_id / payout_status exist to record the outcome of
-- the (not yet implemented — see src/lib/cashfree/cashfree-payouts.client.ts)
-- Cashfree Payouts beneficiary-creation call once that is wired up. Until
-- then payout_status stays 'pending' and cashfree_beneficiary_id stays
-- null for every row — this migration only adds the capture/storage
-- layer, per the approved minimal plan.

create table if not exists public.vendor_payout_details (
  id uuid primary key default gen_random_uuid(),

  vendor_id uuid not null
    references public.vendors(id)
    on delete cascade,

  bank_account_number text,
  bank_ifsc text,
  upi_id text,

  cashfree_beneficiary_id text,
  payout_status text not null default 'pending',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz
);

-- One active (non-deleted) payout-details row per vendor.
create unique index if not exists vendor_payout_details_vendor_id_unique
  on public.vendor_payout_details(vendor_id)
  where deleted_at is null;

-- RLS: enabled, no public/authenticated policy defined. This table is
-- accessed only via BaseRepository with the service-role key from
-- admin-only Server Actions (requireRole(['admin','super_admin'])),
-- the same access pattern already documented in DATABASE_BIBLE.md for
-- other content tables. There is deliberately no SELECT/INSERT/UPDATE
-- policy for `authenticated`/`anon` — this table must never be reachable
-- directly from a client-side Supabase call.
alter table public.vendor_payout_details enable row level security;

