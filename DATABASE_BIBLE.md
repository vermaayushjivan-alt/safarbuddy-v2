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
  `customer_id` is nullable as of BOOKING-03
  (`012_booking03_guest_checkout.sql`) — a guest (unauthenticated)
  booking has `customer_id = null` and populates `guest_name`/
  `guest_email`/`guest_phone` instead; `bookings_customer_or_guest_check`
  enforces at least one path is populated. RLS: **UNVERIFIED, same as
  before this migration** — guest reads/writes go through
  `createServiceRoleClient()` and never evaluate RLS at all, so this
  status is unaffected either way; still flag per RULE 24 before
  relying on RLS for the authenticated path.
- notifications — added for CONTACT-01
  (`009_contact01_notifications.sql`); RLS status: **UNVERIFIED — flag
  per RULE 24, confirm before relying on it in production.**
- vendor_payout_details — added for VENDOR-02
  (`010_vendor02_payout_kyc.sql`); one row per vendor, separate from
  `vendors` by design (see migration header). RLS: **enabled, no
  anon/authenticated policy** — service-role only, admin Server
  Actions gate access via `requireRole()`. Verified by re-reading the
  migration file directly (RULE 24).
- hotel_facilities, hotel_facility_links — added for VENDOR-03 (M1)
  (`011_vendor03_hotel_facilities.sql`). Public catalog + per-hotel
  many-to-many selection, built for the upcoming self-service "List
  Your Property" flow (M2). RLS: **enabled in the migration itself**
  (not deferred) — see Row Level Security section below.

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

### coupons (COUPON-01)
- RLS enabled, **no policy** (matches vendor_payout_details /
  vendor_settlements pattern) — confirmed live 2026-09-17 the hard
  way: the session client (`createClient()`) returned 0 rows on
  SELECT and a hard "new row violates row-level security policy"
  error on INSERT, even for a caller that had already passed
  `requireRole(['admin','super_admin'])`. Fixed by switching every
  admin CRUD function in coupon.actions.ts to
  `createServiceRoleClient()` (which bypasses RLS) — requireRole()
  remains the actual authorization gate, called before the service
  role client is ever used. The checkout-facing functions
  (`resolveCouponForBooking`, `validateCouponPublic`) already used the
  service role client correctly from the start.
- Live production schema does NOT match `014_coupon01_coupons.sql`'s
  DDL verbatim — see Migration Registry row for 014 and DOC_DEBT.md
  item 15 for the full incident (a pre-existing, differently-shaped
  legacy `coupons` table was discovered live and reconciled via a
  hand-written `ALTER TABLE` migration instead).
- **Open question, not yet checked**: `vendor_payout_details` and
  `vendor_settlements` both document the identical "RLS enabled, no
  policy" state but their Server Actions still read via the plain
  session client, not the service role client. Whether they have the
  same "admin sees 0 rows" bug coupons had is UNVERIFIED — flagged in
  DOC_DEBT.md item 15b. Check before trusting settlement/payout admin
  screens show real data, not just that they load without error.

### hotel_facilities / hotel_facility_links (VENDOR-03, M1)
- `hotel_facilities` (master catalog): RLS enabled. Policy
  `hotel_facilities_public_read` — `SELECT` for `anon, authenticated`
  where `is_active = true`. No public write policy; admin-only writes
  go through `BaseRepository` with the service-role key.
- `hotel_facility_links` (per-hotel junction): RLS enabled. Policy
  `hotel_facility_links_public_read` — `SELECT` for `anon,
  authenticated`, unrestricted (`using (true)`) since link rows carry
  no sensitive data; a link to a still-`pending` hotel is not
  considered sensitive on its own. No public write policy — writes
  go through `HotelFacilityLinkRepository` (service role), called
  only from Server Actions.
- Both defined directly in `011_vendor03_hotel_facilities.sql` — RLS
  was enabled in the same migration/session that created the tables
  (RULE 24), not deferred.

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
| 010_vendor02_payout_kyc.sql | yes | **CONFIRMED 2026-09-03** — public.vendor_payout_details verified live via information_schema.columns, all 12 columns match |
| 011_vendor03_hotel_facilities.sql | yes | **CONFIRMED 2026-09-05** — public.hotel_facilities and public.hotel_facility_links verified live via information_schema.columns, all columns match |
| 012_booking03_guest_checkout.sql | yes | **NOT CONFIRMED** |
| 013_pay04_manual_settlement.sql | yes | **PARTIALLY CONFIRMED 2026-09-17** — /admin/settlements loads without error, but this was not independently verified via information_schema.columns this session, and vendor_settlements has the identical "RLS enabled, no policy" gap discovered on coupons the same session (see row below) — vendor-settlement.actions.ts still reads via the session client (`createClient()`), not the service role client. Flagged as DOC_DEBT item 15b: the page not erroring is not proof the session client can actually see real rows; must be independently re-checked before trusting this as CONFIRMED. |
| 014_coupon01_coupons.sql | yes, but **does not match live production DDL** | **CONFIRMED 2026-09-17, via hand-applied ALTER migration, not this file verbatim** — see DOC_DEBT.md item 15 for the full incident. Summary: production already had an unrelated, differently-shaped legacy `public.coupons` table (usage_limit/per_user_limit/used_count/start_date/end_date/status columns) that this file's `CREATE TABLE IF NOT EXISTS` silently no-opped against. Reconciled live via manual `ALTER TABLE` (add new columns, backfill, drop old columns) instead of this file's DDL. This file must be rewritten to an `ALTER`-based migration matching what was actually run (RULE 32/33) — not done yet, tracked as a pending action below. Also confirmed live 2026-09-17: coupon.actions.ts's admin CRUD (`createCouponAdmin`, `updateCouponAdmin`, `setCouponActiveAdmin`, `getCouponByIdAdmin`, `getAllCouponsAdmin`) was switched from the session client to `createServiceRoleClient()` after production confirmed the session client got 0 rows on SELECT and a hard RLS-violation error on INSERT (RLS enabled, no policy, exactly as this file's own header comment already warned but the code didn't follow). |
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
