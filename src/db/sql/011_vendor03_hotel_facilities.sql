-- SafarBuddy — 011_vendor03_hotel_facilities.sql
-- VENDOR-03 (M1) — Hotel Facilities/Amenities schema foundation.
--
-- STATUS: new tables, not yet run in production. Run manually in the
-- Supabase SQL editor, then confirm with information_schema.columns
-- per RULE 13 before building the "List Your Property" form (M2) on
-- top of it.
--
-- DESIGN DECISION (RULE 15 audit, 2026-08-28): facilities are a master
-- table + junction, not a hardcoded enum/array column on `hotels`.
-- Reasons:
--   1. RULE 8 — never invent enums. A fixed list like
--      check (facility in ('wifi','pool',...)) would require a new
--      migration every time the business wants to add one amenity.
--   2. International launch (per project owner) implies the facility
--      list will grow/change per-market — a data-driven table lets an
--      admin add rows without a deploy.
--   3. Public-read (RULE 24 / DATABASE_BIBLE v2): the facility catalog
--      itself and the per-hotel selections need to be visible to
--      unauthenticated visitors on public hotel pages, so RLS must
--      allow anonymous SELECT explicitly rather than relying on the
--      service-role bypass pattern used for admin-only tables.

-- ---------------------------------------------------------------------------
-- Master catalog. Admin-managed. Seeded with a starter set below;
-- additional rows can be inserted later without a migration.
-- ---------------------------------------------------------------------------
create table if not exists public.hotel_facilities (
  id uuid primary key default gen_random_uuid(),

  -- Stable machine key (e.g. 'free_wifi') for icon lookup /
  -- i18n keys on the frontend. Never reused for a different meaning
  -- once shipped — add a new row instead (RULE 10, avoid breaking a
  -- frozen contract).
  code text not null unique,

  -- Human label shown in admin + public UI. Kept here (not
  -- hardcoded in frontend) so it can be corrected/translated without
  -- a redeploy.
  label text not null,

  -- Coarse grouping for UI sections (e.g. 'general', 'safety',
  -- 'wellness', 'connectivity'). Loose text, not a checked enum —
  -- see RULE 8 note above; validated at the application layer only.
  category text not null default 'general',

  display_order integer not null default 0,

  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists hotel_facilities_category_idx
  on public.hotel_facilities (category);

-- ---------------------------------------------------------------------------
-- Per-hotel selection. Many-to-many. One row per (hotel, facility).
-- ---------------------------------------------------------------------------
create table if not exists public.hotel_facility_links (
  id uuid primary key default gen_random_uuid(),

  hotel_id uuid not null
    references public.hotels(id)
    on delete cascade,

  facility_id uuid not null
    references public.hotel_facilities(id)
    on delete cascade,

  created_at timestamptz not null default now(),

  unique (hotel_id, facility_id)
);

create index if not exists hotel_facility_links_hotel_idx
  on public.hotel_facility_links (hotel_id);

create index if not exists hotel_facility_links_facility_idx
  on public.hotel_facility_links (facility_id);

-- ---------------------------------------------------------------------------
-- RLS (RULE 24 — enabled in the same session the tables are created).
-- Policy summary is mirrored in DATABASE_BIBLE.md.
-- ---------------------------------------------------------------------------
alter table public.hotel_facilities enable row level security;
alter table public.hotel_facility_links enable row level security;

-- Public can read the active facility catalog (needed for public hotel
-- pages + the public "List Your Property" facility checklist in M2).
drop policy if exists hotel_facilities_public_read on public.hotel_facilities;
create policy hotel_facilities_public_read
  on public.hotel_facilities
  for select
  to anon, authenticated
  using (is_active = true);

-- Public can read facility links for any hotel — link rows carry no
-- sensitive data, and the public hotel detail page needs this to
-- render "Amenities". Access to unpublished hotels' *details* is
-- already gated elsewhere (hotels.status); this table is intentionally
-- permissive since a stray link to a pending hotel_id is not sensitive.
drop policy if exists hotel_facility_links_public_read on public.hotel_facility_links;
create policy hotel_facility_links_public_read
  on public.hotel_facility_links
  for select
  to anon, authenticated
  using (true);

-- Writes (INSERT/UPDATE/DELETE) go through the service-role key only,
-- i.e. Server Actions using the Supabase service client — no direct
-- client-side write policy is defined, matching the existing pattern
-- for hotels/hotel_images (BaseRepository + service role bypass).
-- This is intentional, not an oversight — documented here so it is
-- never mistaken for "forgot to add write policies."

-- ---------------------------------------------------------------------------
-- Starter catalog seed (idempotent — safe to re-run).
-- ---------------------------------------------------------------------------
insert into public.hotel_facilities (code, label, category, display_order)
values
  ('free_wifi', 'Free WiFi', 'connectivity', 10),
  ('parking', 'Free Parking', 'general', 20),
  ('swimming_pool', 'Swimming Pool', 'wellness', 30),
  ('ac_rooms', 'Air Conditioning', 'general', 40),
  ('restaurant', 'On-site Restaurant', 'general', 50),
  ('room_service', '24-Hour Room Service', 'general', 60),
  ('spa', 'Spa & Wellness Centre', 'wellness', 70),
  ('gym', 'Fitness Centre', 'wellness', 80),
  ('airport_shuttle', 'Airport Shuttle', 'connectivity', 90),
  ('pet_friendly', 'Pet Friendly', 'general', 100),
  ('bar', 'Bar / Lounge', 'general', 110),
  ('conference_room', 'Conference / Banquet Hall', 'business', 120),
  ('power_backup', 'Power Backup', 'safety', 130),
  ('cctv', 'CCTV Surveillance', 'safety', 140),
  ('elevator', 'Elevator / Lift', 'general', 150)
on conflict (code) do nothing;

