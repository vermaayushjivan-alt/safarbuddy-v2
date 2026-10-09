-- ROOT PATH: src/db/sql/038_golive08_server_only_inserts.sql
-- GOLIVE-08 step 3 (part 2 of 2) — customers can no longer INSERT booking or
-- payment rows with their own login. Only the server can create them.
--
-- !!! RUN THIS ONLY AFTER the new code is deployed (booking.actions.ts and
-- !!! payment.actions.ts now write with the service role) AND one test booking
-- !!! + payment has worked on the live site. If you run it earlier, "Book now"
-- !!! and "Pay" will fail with a permission error.
--
-- Why: with bookings_insert_own a customer could insert a booking directly
-- (through the Supabase API) with status "confirmed" or a price of Rs 1, and
-- with payments_insert_own a payment row of their own. The server never needs
-- these policies any more.
--
-- Rollback if something breaks (re-creates the policies exactly as audited):
--   create policy bookings_insert_own on public.bookings for insert
--     with check (customer_id = public.current_user_id());
--   create policy payments_insert_own on public.payments for insert
--     with check (user_id = public.current_user_id());

drop policy if exists bookings_insert_own on public.bookings;
drop policy if exists payments_insert_own on public.payments;

-- Verify (expected: no row for these two policy names):
--   select tablename, policyname, cmd from pg_policies
--   where schemaname = 'public'
--     and policyname in ('bookings_insert_own', 'payments_insert_own');
