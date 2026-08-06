# DATABASE_BIBLE.md

Database: Supabase PostgreSQL
ORM: Drizzle ORM (DB-01 core tables only — see note below)
Auth: Supabase Auth
Storage: Supabase Storage

## Auth architecture (LOCKED)
`public.users.id === auth.users.id`. No `auth_user_id` / `supabase_uid` /
external UID column is ever created. `auth.uid()` is used directly.
(This corrects an earlier draft of this file that incorrectly stated
`public.users.auth_user_id` — the real, deployed schema.ts and SQL
trigger both confirm `.id`.)

## Known tables
- users, roles, permissions, role_permissions, user_roles — defined in
  Drizzle `src/db/schema.ts` (DB-01).
- vendors, vendor_branches, app_settings, otp_verifications — also in
  Drizzle `src/db/schema.ts` (DB-01).
- hotels, hotel_images, packages, package_images, destinations,
  destination_images (planned), offers, vendors (content tables) — **not**
  in Drizzle schema. Accessed directly via the Supabase client through
  `BaseRepository` + a hand-written TypeScript interface per table
  (e.g. `HotelRecord`, `PackageRecord`, `DestinationRecord`). Column
  shape for these tables is only as verified as what already appears in
  their repository interface — nothing beyond that is confirmed.
- Booking tables, Payment tables — not yet built.

## Rules
- Never invent columns.
- Never invent enums.
- Never create a migration without inspection.
- Repository stores `storage_path`, never a public URL (URLs are
  resolved on read via `getPublicUrl()`).

## Remaining production schema
UNVERIFIED beyond what's already reflected in existing repository
interfaces (`HotelRecord`, `PackageRecord`, `DestinationRecord`, image
row types). If a field is needed that isn't already in one of these
interfaces, STOP per RULE 13 and confirm with the project owner instead
of guessing.
