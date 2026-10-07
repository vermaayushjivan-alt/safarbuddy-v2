-- ROOT PATH: src/db/sql/031_partner_terms_acceptances.sql
-- SafarBuddy — 031_partner_terms_acceptances.sql
-- PARTNER-TERMS-01 — proof that a hotel owner agreed to the Partner Terms
-- and the platform commission (20% at the time of writing) when listing.
--
-- STATUS: NOT yet run in production. Run manually in the Supabase SQL
-- editor, then confirm with information_schema.columns (RULE 13/35).
--
-- WHY A NEW TABLE (RULE 7/9): no existing table is known to hold this, and
-- the live `vendors` columns are not fully confirmed in this repo. A
-- separate append-only table is additive, cannot break existing code, and
-- keeps the evidence (version, percent, time, IP, device) even if the
-- vendor row is later edited.
--
-- user_id  = public.users.id (same id bookings.customer_id uses), NOT auth.users.id.
-- vendor_id is nullable on purpose: the row is written BEFORE the vendor row
-- exists (so a failed insert aborts cleanly, with no half-created listing),
-- then linked to the vendor right after it is created.
-- RLS (RULE 24): enabled, NO policy -> service-role only. Owners never read
-- or edit these rows from the browser.

create table if not exists public.partner_terms_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete restrict,
  vendor_id uuid references public.vendors(id) on delete set null,
  terms_version text not null,
  commission_percent numeric(5,2) not null
    check (commission_percent >= 0 and commission_percent <= 100),
  accepted_at timestamptz not null default now(),
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists partner_terms_acceptances_user_idx
  on public.partner_terms_acceptances(user_id);

create index if not exists partner_terms_acceptances_vendor_idx
  on public.partner_terms_acceptances(vendor_id)
  where vendor_id is not null;

alter table public.partner_terms_acceptances enable row level security;
