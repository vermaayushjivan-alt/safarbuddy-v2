-- SafarBuddy — BOOKING-02 (candidate fix, NOT auto-applied)
--
-- STATUS: unconfirmed / diagnostic. This file documents the most likely
-- external root cause of production's INR_CURRENCY_NOT_FOUND error and
-- gives the exact remediation SQL, per Development Bible Rule "do not
-- weaken RLS" and "no service-role shortcut for normal user operations."
-- It intentionally is NOT run automatically by this codebase — run it
-- manually in the Supabase SQL editor only after confirming the
-- diagnosis below against the live project (see "How to confirm" at the
-- bottom).
--
-- WHY THIS IS THE LEADING CANDIDATE:
-- getInrCurrencyId() (src/app/actions/booking.actions.ts) already
-- queries the confirmed-correct columns:
--   .eq("code", "INR").is("deleted_at", null)
-- against a row confirmed to exist and not be soft-deleted. That query
-- runs through src/lib/supabase/server.ts's createClient(), which is
-- the cookie-bound, anon-key client — i.e. it executes as Postgres role
-- `authenticated` (or `anon`), NOT service_role, and is therefore
-- subject to RLS.
--
-- If RLS is enabled on public.currencies (ALTER TABLE ... ENABLE ROW
-- LEVEL SECURITY) but no SELECT policy exists for that role, Postgres
-- silently returns ZERO rows for every query — not an error. That is
-- indistinguishable, from the application's perspective, from "the row
-- doesn't exist": `.maybeSingle()` returns `{ data: null, error: null }`,
-- which is exactly the code path that throws INR_CURRENCY_NOT_FOUND.
-- No SQL file in this repository's src/db/sql/ directory creates any
-- policy on public.currencies (or any table) — RLS on this table cannot
-- be verified statically from this repository and must be checked
-- directly in the Supabase dashboard / SQL editor.
--
-- SAFE TO EXPOSE:
-- public.currencies is a small reference/lookup table (currency code,
-- name, symbol) with no per-user or sensitive data. Allowing public
-- SELECT on it is standard practice for lookup tables and does not
-- weaken any authorization boundary elsewhere in the app.

alter table public.currencies enable row level security;

create policy if not exists "Public read access to currencies"
  on public.currencies
  for select
  using (deleted_at is null);

-- --------------------------------------------------------------------
-- How to confirm this is the actual root cause before running the
-- above:
--
-- In the Supabase SQL editor, run:
--
--   select relrowsecurity, relforcerowsecurity
--   from pg_class
--   where relname = 'currencies';
--
--   select policyname, roles, cmd, qual
--   from pg_policies
--   where tablename = 'currencies';
--
-- If relrowsecurity is true and the second query returns no SELECT
-- policy covering `authenticated`/`anon`/`public`, this is the
-- confirmed root cause and the policy above should be applied.
-- --------------------------------------------------------------------
