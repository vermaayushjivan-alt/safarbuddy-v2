-- SafarBuddy — 015_invoice01_invoices.sql
-- INVOICE-01 Step 2 — Invoices/Vouchers schema.
--
-- STATUS: new table, not yet run in production. Run manually in the
-- Supabase SQL editor, then confirm with information_schema.columns
-- per RULE 13 before building anything else on top of it (Step 3 —
-- repository + Server Action + webhook wiring — is a separate future
-- session per SESSION_HANDOFF.md's one-step-at-a-time pattern).
--
-- PRODUCT SCOPE (from the Step 1 audit, DEVELOPMENT_BIBLE.md Section
-- J, 2026-09-17): invoice and voucher are ONE document, not two.
-- Delivered as a web page (source of truth) and a downloadable PDF
-- rendered from it. Generated exactly once per booking, inside the
-- Cashfree webhook right after bookingRepo.confirmBooking() — the
-- same call site CONTACT-02 already uses — never at booking-creation
-- and never admin-manual.
--
-- PDF LIBRARY DECISION (Step 2, this session): @react-pdf/renderer,
-- confirmed. Pure JS (no headless Chromium / native binary), so it
-- runs inside a normal Vercel serverless function the same way every
-- other Server Action here does — no new infra, no Puppeteer cold-
-- start cost. It renders from React components, which fits "one
-- shared template" driving both the web page and the PDF (Step 3
-- plan) better than a template-string/HTML-to-PDF approach would.
-- No PDF-generation package exists in package.json yet — adding the
-- dependency itself is Step 3 (backend) work, not this schema step.
--
-- DESIGN DECISION (RULE 15 audit, Section J): this table stores a
-- SNAPSHOT of everything the invoice/voucher needs to render, taken
-- once at generation time — it does not join-compute hotel/package/
-- vendor/customer fields on every view, because those rows can change
-- after the booking (hotel renamed, vendor details edited, etc.) and
-- an invoice must keep showing what was true when it was issued. This
-- mirrors the price_snapshot precedent already established on
-- `bookings` (see COUPON-01 finding, migration 014) — the amount this
-- table records as `amount_paid` is read from bookings.price_snapshot
-- (the actual Cashfree-charged amount), not from subtotal/grand_total.
--
-- One invoice per booking (booking_id is UNIQUE) — the webhook path
-- only ever calls confirmBooking() once per successful payment
-- (idempotency already enforced there per PAY-02), so invoice
-- generation inherits that same one-shot guarantee rather than
-- needing its own.

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),

  booking_id uuid not null
    references public.bookings(id)
    on delete restrict,

  payment_id uuid
    references public.payments(id)
    on delete set null,

  vendor_id uuid
    references public.vendors(id)
    on delete set null,

  -- Internal sequence backing the human-facing invoice number below.
  -- Not exposed directly — always read invoice_number instead. Same
  -- generated-column pattern as vendor_settlements.receipt_number
  -- (migration 013), for the same concurrency-safe reason.
  invoice_seq bigserial,

  -- e.g. SB-INV-000001.
  invoice_number text
    generated always as (
      'SB-INV-' || lpad(invoice_seq::text, 6, '0')
    ) stored,

  -- --- Booking identity snapshot ---
  booking_number text not null,
  booking_type text not null
    check (booking_type in ('hotel', 'package')),

  -- --- Recipient snapshot ---
  -- Resolved once at generation time from either the signed-in
  -- customer (public.users) or BOOKING-03's guest_name/guest_email/
  -- guest_phone — whichever the booking actually populated. Storing
  -- the resolved values here means the invoice never needs to know
  -- which path the booking took.
  customer_name text not null,
  customer_email text,
  customer_phone text,

  -- --- Item snapshot ---
  -- hotels.hotel_name or packages.package_name at generation time.
  item_name text not null,
  item_location text,
  vendor_name text,

  -- --- Stay/travel details snapshot ---
  check_in_date date,
  check_out_date date,
  travel_date date,
  num_guests integer not null default 1
    check (num_guests > 0),

  -- --- Amount snapshot ---
  -- amount_paid = bookings.price_snapshot at generation time (the
  -- actual amount Cashfree charged — see header note above). The
  -- other figures are shown for a line-item breakdown only; they are
  -- never re-summed to produce amount_paid.
  currency text not null default 'INR',
  subtotal numeric(10,2),
  taxes numeric(10,2),
  discount numeric(10,2),
  coupon_code text,
  coupon_discount_amount numeric(10,2),
  amount_paid numeric(10,2) not null,

  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create unique index if not exists invoices_booking_id_unique
  on public.invoices(booking_id);

create unique index if not exists invoices_invoice_number_unique
  on public.invoices(invoice_number);

create index if not exists invoices_vendor_id_idx
  on public.invoices(vendor_id)
  where deleted_at is null;

-- RLS: enabled, no anon/authenticated policy — same convention as
-- vendor_payout_details (010), vendor_settlements (013), and coupons
-- (014). Generation happens inside the Cashfree webhook, which
-- already uses createServiceRoleClient() for every write on this
-- path (CONTACT-02 precedent). Customer/admin reads (Step 3/4/5) must
-- likewise go through Server Actions using the service role client,
-- scoped explicitly (booking ownership for the customer view,
-- requireRole(['admin','super_admin']) for the admin view) — RLS
-- itself is not the authorization boundary here, per the same pattern
-- flagged as an open question for vendor_payout_details/
-- vendor_settlements in DATABASE_BIBLE.md.
alter table public.invoices enable row level security;

