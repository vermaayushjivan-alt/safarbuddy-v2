-- SafarBuddy — 008_room05_booking_room_linkage.sql
--
-- STATUS: documentation/reproducibility fix (RULE 32), NOT a live schema
-- change. This column already exists in production. This file previously
-- did not exist on disk despite being referenced as "created" in
-- SESSION_HANDOFF.md/DATABASE_BIBLE.md — see DOC_DEBT.md item 2 and 5.
-- It is written now, after direct confirmation against the live schema,
-- purely so the on-disk migration history matches production reality and
-- can be replayed against a fresh database.
--
-- CONFIRMED LIVE STATE (2026-08-28, via information_schema.columns and
-- pg_attribute/pg_attrdef/pg_constraint run directly against
-- public.bookings — see PROJECT_STATUS.md v12 for the audit trail):
--   column:     room_id
--   type:       uuid
--   nullable:   yes (not_null = false)
--   default:    none
--   references: hotel_rooms(id)
--
-- This resolves the DATABASE_BIBLE.md vs. 2026-08-23 SESSION_HANDOFF.md
-- contradiction: DATABASE_BIBLE.md was correct — room_id is live. The
-- 2026-08-23 audit's claim that the column was absent does not match the
-- confirmed current state (either that reading was mistaken, or the
-- column was added by an undocumented later change — which of the two
-- is unknown and is not guessed at here).
--
-- IF NOT EXISTS guards make this safe to run against production (a
-- no-op, since the column already exists) or against a fresh database
-- being built up from migration 001 onward.
--
-- No index is added here: this file only documents columns/constraints
-- directly confirmed against the live schema (see header above). Whether
-- an index already exists on bookings.room_id has not been checked and
-- is intentionally left out of scope — do not assume either way.

alter table public.bookings
  add column if not exists room_id uuid references public.hotel_rooms(id);

