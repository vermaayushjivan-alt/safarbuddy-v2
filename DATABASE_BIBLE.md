# DATABASE_BIBLE.md (v2)

Supersedes v1. v1 content preserved below; v2 adds RLS and migration
governance that v1 never specified, cross-referenced from
`DEVELOPMENT_BIBLE.md` RULE 24 and RULE 32–35.

Database: Supabase PostgreSQL
ORM: Drizzle ORM (DB-01 core tables only — see note below)
Auth: Supabase Auth
Storage: Supabase Storage

## Auth architecture (LOCKED)
`public.users.id === auth.users.id`. No `auth_user_id` / `supabase_uid`
/ external UID column is ever created. `auth.uid()` is used directly.

## Known tables
- users, roles, permissions, role_permissions, user_roles — Drizzle
  `src/db/schema.ts` (DB-01).
- vendors, vendor_branches, app_settings, otp_verifications — also in
  Drizzle `src/db/schema.ts` (DB-01).
- hotels, hotel_images, packages, package_images, destinations,
  destination_images, offers (content tables) — **not** in Drizzle
  schema. Accessed via `BaseRepository` + a hand-written TypeScript
  interface per table. Column shape is only as verified as what
  already appears in the repository interface.
- hotel_rooms, room_prices, room_inventory, room_images — content
  tables, live-schema-verified per-column during ROOM-01–04.
- bookings, payments — live, confirmed columns include `room_id`
  (added for ROOM-05; migration file must exist per RULE 32).
- notifications — added for CONTACT-01
  (`009_contact01_notifications.sql`); RLS status: **UNVERIFIED — flag
  per RULE 24, confirm before relying on it in production.**

## Rules (v1, unchanged)
- Never invent columns.
- Never invent enums.
- Never create a migration without inspection.
- Repository stores `storage_path`, never a public URL (URLs are
  resolved on read via `getPublicUrl()`).

## Row Level Security (new, v2)
- Every table above gets an explicit RLS policy row here the moment
  it's created — table name, policy summary, and verified/unverified
  status. "I assume RLS is on" is not a documented state.
- Public-read tables (hotels, destinations, offers, room_prices via
  the ROOM-05 public read path) must have their public-read policy
  explicitly scoped — e.g. published/active rows only, not a blanket
  `USING (true)` unless that's genuinely intended.
- Content tables accessed only through `BaseRepository` with the
  service-role key bypass RLS by design — this is fine, but must be
  noted here per table so it's not mistaken for "protected by RLS."

## Migration Registry (new, v2)
Every migration file that has ever been referenced as "created" in
CHANGELOG/SESSION_HANDOFF is tracked here with its actual on-disk and
production-run status, so the two can never silently drift again:

| File | On disk? | Run in production? |
|---|---|---|
| 001_auth_sync_trigger.sql | yes | assumed yes (AUTH-05 frozen) |
| 002_role_seed_auth05.sql | yes | assumed yes (AUTH-05 frozen) |
| 003_booking01_schema.sql | yes | assumed yes (BOOKING-01 frozen) |
| 004_payment_schema.sql | yes | assumed yes (PAY-01 frozen) |
| 006_room02_schema.sql | yes | assumed yes (ROOM-02 frozen) |
| 007_currencies_read_policy.sql | yes | assumed yes (ROOM-03 frozen) |
| 008_room05_booking_room_linkage.sql | **NO — missing from repo** | **NOT CONFIRMED** |
| 009_contact01_notifications.sql | yes | **NOT CONFIRMED** |
| 005_room01_schema.sql | never existed by design (content-table pattern, see v1 note) | n/a |

Any "assumed yes" above should be spot-checked against
`information_schema` next time that milestone's tables are touched —
they were never independently re-confirmed for this audit, only
carried forward from prior SESSION_HANDOFF claims.

## Remaining production schema
UNVERIFIED beyond what's already reflected in existing repository
interfaces. If a field is needed that isn't already in one of these
interfaces, STOP per DEVELOPMENT_BIBLE RULE 13/7 and confirm with the
project owner instead of guessing.
