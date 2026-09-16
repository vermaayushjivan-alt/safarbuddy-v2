-- SafarBuddy — 013_pay04_manual_settlement.sql
-- PAY-04 — Manual Settlement Tracking (interim, pre-Cashfree-Payouts).
--
-- STATUS: new columns + new table, not yet run in production. Run
-- manually in the Supabase SQL editor, then confirm with
-- information_schema.columns per RULE 13 before building anything else
-- on top of it.
--
-- DESIGN DECISION (RULE 15 audit, 2026-09-17): the owner is paying
-- hotel owners manually (bank/UPI transfer outside the app) until
-- enough hotels are onboarded to justify wiring the real Cashfree
-- Payouts beneficiary flow (see vendor_payout_details / RULE 15 note
-- in migration 010). This milestone does NOT move any money — it only:
--   1. Records, per successful payment, how much was platform
--      commission vs. how much is owed to the vendor (fixed 20% rate,
--      no per-vendor override — explicit product decision).
--   2. Lets an admin log a manual payout as a "settlement" once they've
--      actually sent the money, generating a receipt number the vendor
--      can see as proof of payment.
--
-- Commission rate is intentionally NOT stored in the database (no
-- settings table, no per-vendor column) because it is fixed today.
-- See src/lib/payments/commission.ts — that is the single place the
-- 20% figure lives in code. If a variable/per-vendor rate is ever
-- needed, that is a new RULE 15 audit, not a silent change here.

-- ---------------------------------------------------------------------
-- 1. Commission snapshot on payments
-- ---------------------------------------------------------------------
-- Snapshot columns, same pattern as payments.amount: computed once when
-- a payment is marked "success" (see the webhook handler) and never
-- recalculated afterwards, even if the commission rate changes later.
-- Both are null until a payment succeeds.

alter table public.payments
  add column if not exists platform_commission_amount numeric(10,2),
  add column if not exists vendor_payout_amount numeric(10,2);

-- ---------------------------------------------------------------------
-- 2. Manual settlement ledger
-- ---------------------------------------------------------------------
-- One row per manual payout an admin has actually sent to a vendor.
-- This is the source of truth for "how much has this vendor already
-- been paid" — subtracted from the sum of vendor_payout_amount across
-- their successful payments to compute what is still due.

create table if not exists public.vendor_settlements (
  id uuid primary key default gen_random_uuid(),

  vendor_id uuid not null
    references public.vendors(id)
    on delete restrict,

  amount numeric(10,2) not null
    check (amount > 0),

  -- Internal sequence backing the human-facing receipt number below.
  -- Not exposed directly — always read receipt_number instead.
  receipt_seq bigserial,

  -- e.g. SB-RCPT-00001. Generated, not app-assigned, so it can never
  -- collide or be skipped even under concurrent inserts.
  receipt_number text
    generated always as (
      'SB-RCPT-' || lpad(receipt_seq::text, 5, '0')
    ) stored,

  -- Free-text reference for the admin's own records — a UPI transaction
  -- ID, a bank reference number, or just a note. Optional.
  reference_note text,

  -- When the money was actually sent (defaults to "now", but an admin
  -- logging a payment a day late can backdate it).
  paid_at timestamptz not null default now(),

  -- auth.users id of the admin who logged this settlement. Not FK'd —
  -- same convention as vendor_payout_details.created_by in migration
  -- 010 — this is an audit trail field, not a referential constraint.
  created_by uuid,

  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists vendor_settlements_vendor_id_idx
  on public.vendor_settlements(vendor_id)
  where deleted_at is null;

create unique index if not exists vendor_settlements_receipt_number_unique
  on public.vendor_settlements(receipt_number);

-- RLS: enabled, no public/authenticated policy defined — same pattern
-- as vendor_payout_details (migration 010). Reads/writes only ever go
-- through BaseRepository with the service-role key from:
--   - admin-only Server Actions (requireRole(['admin','super_admin']))
--     for creating settlements and viewing any vendor's ledger, and
--   - the vendor's own read-only Server Action (requireVendorContext(),
--     scoped to vendor_id in application code, same pattern as
--     VENDOR-BOOKING-01) for a vendor viewing their own receipts.
alter table public.vendor_settlements enable row level security;
