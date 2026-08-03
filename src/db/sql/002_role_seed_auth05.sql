-- SafarBuddy — AUTH-05
-- Adds the additional roles required by Role Based Authentication:
-- hotel_owner, travel_agent, super_admin. Purely additive — does not
-- touch the roles table structure, does not modify or remove the
-- admin / vendor / user rows seeded in 001_auth_sync_trigger.sql, and
-- does not change public.users, user_roles, or any FK relationship.
--
-- Run this once against the Supabase project's SQL editor (or via
-- `supabase db execute`), same as 001_auth_sync_trigger.sql was run.

insert into public.roles (name, label, description)
values
  ('hotel_owner', 'Hotel Owner', 'Manages hotel property listings, rooms and bookings.'),
  ('travel_agent', 'Travel Agent', 'Books and manages travel packages on behalf of customers.'),
  ('super_admin', 'Super Administrator', 'Full platform access, including admin management.')
on conflict (name) do nothing;

-- NOTE: the existing 'user' role (label "User") continues to represent
-- the Customer account type. No rename is performed here — renaming an
-- existing role row is a data change with no technical benefit (role_id
-- is what's referenced everywhere, not the name string) and was not part
-- of the approved AUTH-05 scope.
