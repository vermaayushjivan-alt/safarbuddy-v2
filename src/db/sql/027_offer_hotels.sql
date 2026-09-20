
-- SafarBuddy — 027_offer_hotels.sql
-- OFFER-HOTELS-01 — link an offer to the hotels it applies to.
--
-- WHY: the homepage "Book now" button on an offer card used to do nothing
-- because an offer had no relationship to any hotel. This join table lets
-- an admin pick which hotels an offer covers; "Book now" then opens
-- /offers/[id], which lists exactly those hotels.
--
-- MIGRATION NUMBER: follows 026 (offer-images bucket). Same caution as
-- every migration in this project — confirm 027 is actually the next free
-- number before running.
--
-- SCHEMA CHECK (RULE 13): offers.id was never recorded in a migration on
-- disk (offers is a content table outside Drizzle). The guard below stops
-- the migration with a clear message if offers.id is not a uuid, instead of
-- failing halfway with a confusing foreign-key error.

do $$
declare
  offers_id_type text;
begin
  select data_type into offers_id_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'offers'
    and column_name = 'id';

  if offers_id_type is distinct from 'uuid' then
    raise exception
      'offers.id is % (expected uuid). Change offer_hotels.offer_id to match before running this migration.',
      coalesce(offers_id_type, 'missing');
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 1. Join table (many offers <-> many hotels)
-- ---------------------------------------------------------------------

create table if not exists public.offer_hotels (
  id uuid primary key default gen_random_uuid(),

  offer_id uuid not null
    references public.offers(id)
    on delete cascade,

  hotel_id uuid not null
    references public.hotels(id)
    on delete cascade,

  created_at timestamptz not null default now(),

  unique (offer_id, hotel_id)
);

create index if not exists offer_hotels_offer_idx
  on public.offer_hotels (offer_id);

create index if not exists offer_hotels_hotel_idx
  on public.offer_hotels (hotel_id);

-- ---------------------------------------------------------------------
-- 2. RLS (RULE 24 — enabled in the same session the table is created)
-- ---------------------------------------------------------------------

alter table public.offer_hotels enable row level security;

-- Public can read links. A link row only holds two ids and is not
-- sensitive; what a visitor can actually SEE is still gated by the
-- offers_public_read policy (offer must be active) and the hotels
-- read path (hotel must be status 'active', not soft-deleted).
drop policy if exists offer_hotels_public_read on public.offer_hotels;
create policy offer_hotels_public_read
  on public.offer_hotels
  for select
  to anon, authenticated
  using (true);

-- Admin writes go through the session client (createClient()) in
-- offer.actions.ts, same as every other offers write, so the policy
-- must use is_admin() — mirrors the existing offers_admin_all policy.
drop policy if exists offer_hotels_admin_all on public.offer_hotels;
create policy offer_hotels_admin_all
  on public.offer_hotels
  for all
  to authenticated
  using (is_admin())
  with check (is_admin());

