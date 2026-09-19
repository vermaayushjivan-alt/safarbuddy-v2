-- SafarBuddy — 024_promo01_promotions.sql
-- PROMO-01 — Homepage banner-ad slots (inline auto-sliding cards, NOT
-- popups — explicitly decided against popups per SESSION_HANDOFF.md).
--
-- MIGRATION NUMBER NOTE: project owner confirmed 017-023 are already
-- run live in production (017-022 from the separate same-day
-- VENDOR-03-overhaul thread not present in this repo zip, plus 023
-- used elsewhere already) — this file was renumbered 024 to stay
-- clear of that range. This on-disk file itself was NOT run as 023;
-- do not re-run an old copy of this file under the 023 name.
--
-- STATUS: table + functions already run live in Supabase by the
-- project owner (confirmed via chat, 2026-09-20) under this same SQL,
-- prior to the rename to 024 — this file is the documentation record
-- (RULE 32 pattern) of what was actually run, not a pending change.
-- GitHub/Vercel do NOT have this code yet (separate from the DB
-- state) — push it before expecting the homepage/admin routes below
-- to have anywhere to read from.
--
-- DESIGN DECISIONS (RULE 15-style audit):
--   1. hotel_id is nullable — a SafarBuddy-listed hotel can be the
--      advertiser (paying to be shown here, separate from RANK-01's
--      paid-ranking feature), or the advertiser can be an external
--      company with no hotels row at all. FK on delete set null so a
--      deleted hotel doesn't take a promotion row down with it.
--   2. slot_position is a checked enum (RULE 8 normally forbids
--      inventing enums, but here the three slots are a fixed, agreed
--      product decision — the homepage layout itself is the source of
--      truth, not open-ended data — so a CHECK constraint is correct,
--      same reasoning already used for ROOM_TYPE_VALUES elsewhere in
--      this project).
--   3. click_count / impression_count are updated via two SQL
--      functions below (SECURITY DEFINER, atomic increment) rather
--      than read-then-write from the app — a public homepage visitor
--      can trigger many concurrent impressions and a naive
--      read/update from Postgrest would lose counts under
--      concurrency.
--   4. RLS enabled with a public-read policy scoped to active +
--      in-date-range rows only (mirrors 011's hotel_facilities public
--      read pattern) — the counters are updated only via the two
--      functions below (also callable by anon), never via a direct
--      UPDATE policy, so anon can never rewrite title/click_url/etc.
--      Admin CRUD goes through createServiceRoleClient() same as every
--      other admin-managed table in this project.

create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(),

  -- Optional: set when the advertiser is one of our own listed hotels.
  hotel_id uuid
    references public.hotels(id)
    on delete set null,

  -- External advertiser display name. Required even when hotel_id is
  -- set, so the card never has to fall back to a join at render time.
  company_name text not null,

  logo_image text,

  click_url text not null,

  slot_position text not null
    check (slot_position in (
      'after_hero',
      'between_destinations_trending',
      'between_packages_testimonials'
    )),

  start_date date,
  end_date date,

  is_active boolean not null default true,

  click_count integer not null default 0,
  impression_count integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists promotions_slot_active_idx
  on public.promotions (slot_position, is_active);

create index if not exists promotions_hotel_idx
  on public.promotions (hotel_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.promotions enable row level security;

drop policy if exists promotions_public_read on public.promotions;
create policy promotions_public_read
  on public.promotions
  for select
  to anon, authenticated
  using (
    is_active = true
    and (start_date is null or start_date <= current_date)
    and (end_date is null or end_date >= current_date)
  );

-- No direct anon/authenticated write policy — admin CRUD uses
-- createServiceRoleClient() (same pattern as hotel_facilities/coupons/
-- vendor_settlements). Counter increments go through the two functions
-- below instead of a table-level UPDATE policy.

-- ---------------------------------------------------------------------------
-- Atomic counters. SECURITY DEFINER so an anon visitor (no row-level
-- UPDATE grant) can still bump a counter without being handed general
-- write access to the table.
-- ---------------------------------------------------------------------------
create or replace function public.increment_promotion_impression(promo_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.promotions
  set impression_count = impression_count + 1
  where id = promo_id;
$$;

create or replace function public.increment_promotion_click(promo_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.promotions
  set click_count = click_count + 1
  where id = promo_id;
$$;

grant execute on function public.increment_promotion_impression(uuid) to anon, authenticated;
grant execute on function public.increment_promotion_click(uuid) to anon, authenticated;
