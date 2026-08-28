CHANGELOG.md

All significant SafarBuddy V2 changes are recorded here.

2026-08-28 — P0.3 audit continuation — owner_id bug fix + owner-room-image actions

Status: PARTIAL — Step 1 of the P0.3 onboarding plan re-verified as already complete (contrary to SESSION_HANDOFF_2026-08-28_P0_FIXES.md's "not yet started" claim — see DOC_DEBT.md item 8). Steps 2-5 (onboarding wizard, redirects) confirmed genuinely not started.

P0-adjacent bug found and fixed (DOC_DEBT.md item 9): room-price.repository.ts and room-inventory.repository.ts's verifyRoomOwnership() queried a nonexistent vendors.owner_id column (live column is owner_user_id) with the resulting error silently swallowed — hotel_owner accounts could never actually price or manage inventory for their own rooms. Both fixed to use owner_user_id.

Created: src/app/actions/owner-room-image.actions.ts — owner-scoped counterpart to room-type.actions.ts's *Admin image actions (upload/list/set-primary/reorder/delete), gated via requireOwnerVendor()/assertHotelOwnedByVendor() + a room-belongs-to-hotel check, mirroring owner-room-type.actions.ts's pattern. Closes the "future owner-image actions" gap noted in owner-context.ts's header comment.

Not created: owner-room-price/owner-room-inventory action wrappers — turned out unnecessary, since room-price.actions.ts and room-inventory.actions.ts already accept the hotel_owner role directly and delegate to verifyRoomOwnership() for scoping (once the owner_id bug above is fixed, these already work for owners as-is).

Not started: onboarding wizard page, post-submit session-based redirect, first-login smart redirect, submitted-for-review screen (P0.3 steps 2-5).

Verified this session: tsc --noEmit clean (whole project). eslint clean on all changed/created files.

Not verified: no live Supabase reachable from this sandbox — the owner_id fix and the new owner-room-image actions need a real hotel_owner account walkthrough (set a rate, set inventory, upload a room photo) before being trusted in production.

2026-08-28 — VENDOR-03 (M2) — Public "List Your Property" Self-Service Flow

Status: CODE COMPLETE — depends on M1's migration 011 being run first (still not run in production).

RULE 15 decision: submitPropertyListing() is deliberately not requireRole()-gated — a brand-new visitor has no role yet. Safety comes from createServiceRoleClient() for every write (same trusted-server pattern already used for the Cashfree webhook), only ever acting on the user id returned by this action's own supabase.auth.signUp() call (never a client-supplied id), and grantSelfServiceRole()'s hardcoded hotel_owner/vendor allowlist (src/lib/auth/roles.ts, M1). New hotel + vendor rows always start status='pending' — never auto-published; M4 (not started) will add the admin approval queue.

One consolidated form, one submit — owner account (name/email/phone/password), property details, a facilities checklist sourced from M1's hotel_facilities catalog, and payout (bank/UPI) + booking-contact details, per explicit project-owner requirement that a small hotel owner shouldn't have to navigate multiple sections.

Created:
- src/app/actions/property-listing.actions.ts — getFacilityCatalog() (public read) and submitPropertyListing() (the full pipeline: signUp → vendor → hotel → facility links → payout upsert → role grant → best-effort admin alert email).
- src/components/public/PropertyListingForm.tsx — the single-page form, reusing existing TextField/PasswordField/Alert components (RULE 9).
- src/app/list-your-property/page.tsx — public route.

Modified:
- src/components/home/Navbar.tsx — added "List Your Property" button.
- src/lib/config/env.ts, src/types/env.d.ts, .env.example — added GMAIL_USER, GMAIL_APP_PASSWORD (RULE 29 backfill — see DOC_DEBT.md item 7), and ADMIN_NOTIFICATION_EMAIL.

Verified this session:
- TypeScript (`tsc --noEmit`): PASS.
- ESLint, whole project: PASS, 0 errors (one pre-existing unrelated warning in components/layout/ProfileMenu.tsx, not touched this session). One real lint error found and fixed during this session — setState called synchronously inside a useEffect in the form's owner/contact-mirroring logic — refactored to update state directly in the change handler instead.

Not verified (RULE 23):
- `next build`: fails in this sandbox only on fonts.googleapis.com being network-blocked — unrelated to any code written here; needs confirming on a real deploy.
- No functional walkthrough — no live Supabase project reachable from this sandbox. Must be walked through end-to-end (real signup, email confirmation, login, pending-listing visibility) before this milestone is marked Frozen.
- Migration 011 (M1) not run against production yet — M2 cannot be functionally tested until it is.

Out of scope for M2 (explicitly, not silently dropped): property photo/ID-proof upload — no Storage bucket/path designed yet.

2026-08-28 — VENDOR-03 (M1) — Hotel Facilities Schema Foundation

Status: CODE COMPLETE — migration not yet run in production.

Context: first step of a 4-milestone plan (M1–M4) toward a self-service
"List Your Property" flow requested by the project owner for
international launch — a hotel owner should be able to submit their
property (details, facilities, payout, contact) in one form from the
homepage, without an admin manually creating records for them. Per
RULE 11, scope is split across milestones; this entry covers M1
(schema foundation) only. No public-facing UI was added in this
session — see PROJECT_STATUS.md for M2–M4.

RULE 15 audit: `hotels` table has no facilities/amenities column
(confirmed absent from HotelRecord and DATABASE_BIBLE.md). No safe
mechanism existed to grant `hotel_owner`/`vendor` role to a
self-registering user — `user_roles` is a Drizzle table with no
Server Action ever writing to it.

Decision: facilities modeled as a master catalog + junction table
(not a hardcoded enum/array column) so the list can grow without a
migration — required for an international launch where the amenity
list will differ by market (RULE 8 — never invent enums). Role
grant restricted to a hardcoded allowlist (`hotel_owner`, `vendor`
only) in a non-public helper module, never exposed as a callable
action accepting an arbitrary role string.

Created:
- src/db/sql/011_vendor03_hotel_facilities.sql — hotel_facilities
  (master catalog, seeded with 15 starter amenities) and
  hotel_facility_links (per-hotel junction). RLS enabled in the same
  migration: public SELECT on active facilities / all links, no
  public write policy (writes go through the service-role repository
  only).
- src/lib/repositories/hotel-facility.repository.ts —
  HotelFacilityRepository (getActiveFacilities) and
  HotelFacilityLinkRepository (getFacilityIdsForHotel,
  setFacilitiesForHotel — full-replace semantics).
- src/lib/auth/roles.ts — grantSelfServiceRole() / hasSelfServiceRole(),
  restricted via a literal-typed allowlist
  (SELF_SERVICE_GRANTABLE_ROLES = ['hotel_owner', 'vendor']). Not a
  Server Action itself — internal infra only, to be called from M2's
  onboarding action, which is responsible for establishing the
  authenticated user id before calling it.

Verified this session:
- TypeScript (`tsc --noEmit`): PASS.
- ESLint on new files: PASS.
- Migration file: exists on disk (RULE 32), idempotent
  (`if not exists` / `on conflict do nothing` throughout, RULE 33).

Not verified (RULE 23):
- Migration not run against any live Supabase instance in this
  sandbox (no DB credentials available here) — status is "not yet
  run," not implied to be applied.
- No functional walkthrough yet — there is no UI in M1 to walk
  through; RULE 21/22 apply starting M2, where a real form submits
  through this schema end-to-end.

Also this session (documentation, RULE 40): "CHANGELOG.md" and
"PROJECT_STATUS.md" existed on disk under mangled filenames
("CHANGELOG (1).md", "PROJECT_STATUS (1) (1).md") — renamed to
canonical names, no content altered by the rename. See DOC_DEBT.md
item 6. (Also found and logged, item 5: PROJECT_STATUS.md's "Next
Development Phase" section cites a "DOC_DEBT.md item 5" that never
existed — left open, out of scope for this milestone.)

2026-08-28 — VENDOR-02 — Hotel Owner Payout KYC Capture

Status: CODE COMPLETE — migration not yet run in production.

RULE 15 audit (see PROJECT_STATUS.md): existing vendors table (vendor_name, vendor_type, owner_user_id, business_email, business_phone, gstin, pan_number, status) had no bank/UPI/beneficiary fields; no owner-facing page exists under src/app/vendor/ (layout-only role guard); Cashfree integration only covered Payment Gateway (PAY-01/02), not Payouts.

Decision: new public.vendor_payout_details table, separate from vendors (keeps sensitive bank/UPI data off the table read by the ordinary hotel-form vendor dropdown; PAN stays on vendors, not duplicated). Admin-managed (not owner self-service) since no owner-facing page exists yet — building one was out of scope for this milestone. Cashfree beneficiary creation left as an inert stub pending separate Payout API credentials.

Created:
- src/db/sql/010_vendor02_payout_kyc.sql — new table, unique index on vendor_id, RLS enabled with no public/authenticated policy (admin-only via service role, matching existing content-table pattern).
- src/lib/repositories/vendor-payout.repository.ts — VendorPayoutRepository (getByVendorId, upsertForVendor).
- src/app/actions/vendor-payout.actions.ts — getVendorPayoutDetailsAdmin, upsertVendorPayoutDetailsAdmin (admin/super_admin only, Zod-validated inline per vendor.actions.ts's actual convention).
- src/components/admin/vendors/VendorPayoutForm.tsx — admin form (bank account + IFSC, or UPI).
- src/app/admin/vendors/[id]/payout/page.tsx.
- src/lib/cashfree/cashfree-payouts.client.ts — inert stub, mirrors whatsapp.client.ts precedent; no invented API contract.

Modified:
- src/app/admin/vendors/[id]/edit/page.tsx — added "Manage Payout Details" link next to "Manage Branches".

Not done (explicitly out of scope this milestone): running the migration in production; wiring the real Cashfree Payouts beneficiary-creation call; PAY-04 split-settlement logic; owner self-service UI.

Verification: TypeScript (npx tsc --noEmit) PASS, 0 errors. ESLint PASS, 0 errors on all new/changed files.

2026-08-28 — BOOKING-02 — Migration gap resolved (documentation fix, no application code change)

Status: CLOSED.

User ran information_schema.columns and pg_attribute/pg_attrdef/pg_constraint directly against public.bookings. Confirmed room_id exists in production: uuid, nullable, no default, FK → hotel_rooms(id). This resolves the contradiction between DATABASE_BIBLE.md (said room_id was live-confirmed) and the 2026-08-23 SESSION_HANDOFF.md entry (said it was absent) — in DATABASE_BIBLE.md's favor. Which source was actually right at the time, or whether the column was added later by an undocumented change, is unknown and was not guessed at.

Created: src/db/sql/008_room05_booking_room_linkage.sql — idempotent (add column if not exists), documents the already-live state rather than attempting to re-apply a change already in production. Written only after the live column/nullability/FK were directly confirmed, per RULE 13.

No application code changed. booking.repository.ts already correctly typed room_id as `string | null` and treated it as optional — the code was never the problem; only the on-disk migration history was missing.

Also updated: DATABASE_BIBLE.md's Known Tables entry and Migration Registry row for 008, to match confirmed reality instead of the prior "added for ROOM-05, migration must exist" placeholder note.

2026-08-27 — Build-stability audit + launch-readiness planning (backfilled)

Status: Documentation backfill only — this entry was missing from CHANGELOG.md until now. Source: SESSION_HANDOFF.md and DOC_DEBT.md, cross-checked against this repo's actual contents.

Fixed (build-blocking, neither previously logged anywhere):

- src/lib/notifications/whatsapp.client.ts did not exist on disk though dispatch.ts imports sendWhatsApp from it, breaking tsc/Vercel builds with "Cannot find module './whatsapp.client'". Recreated as an inert stub (returns success:false, "provider not configured yet"), matching the CONTACT-01 no-WhatsApp-provider-yet state. Confirmed via tsc --noEmit and a clean Vercel production build.
- package.json was missing nodemailer and @types/nodemailer even though email.client.ts imports nodemailer, breaking Vercel builds with "Cannot find module 'nodemailer'". Added both. Confirmed via a clean Vercel production build.

Diagnosed (not a code bug): live-mode Cashfree order creation returned HTTP 401 (confirmed via Vercel function logs). cashfree.client.ts itself was already correct. Root cause was stale/mismatched production API keys in Vercel and/or a missing redeploy. Resolved by the user re-entering matched live keys and redeploying; confirmed working with a real live payment.

Found — NOT fixed (logged as BOOKING-02, top priority): src/db/sql/008_room05_booking_room_linkage.sql is referenced elsewhere as created, but does not exist anywhere in the delivered repo. booking.repository.ts's createBooking() unconditionally inserts a room_id column. Whether the live public.bookings table actually has this column is UNRESOLVED — see the Known Issues / Doc Contradiction note below.

Documentation debt logged: DOC_DEBT.md created this session, recording this item plus the CONTACT-01 backfill and the whatsapp.client.ts/package.json "claimed but absent" pattern.

Four milestones planned (not started, no code written): BOOKING-02, VENDOR-02, PAY-04, CONTACT-02. SESSION_HANDOFF.md states each has "a full RULE 15 pre-coding audit recorded in PROJECT_STATUS.md" — direct inspection of PROJECT_STATUS.md found no such audits present. See DOC_DEBT.md item 5.

Verification: tsc --noEmit clean. Two separate clean Vercel production builds. Cashfree live payment confirmed working end-to-end.

2026-08-23 — ROOM-05 — Booking-Room Linkage (backfilled)

Status: COMPLETE — Frozen (per SESSION_HANDOFF.md/PROJECT_STATUS.md). Documentation backfill only — this entry was missing from CHANGELOG.md until now.

Audited against the live schema per RULE 13/15 (user ran information_schema.columns against public.bookings directly). Two previously undocumented issues found:

1. Public read gap: room-type.actions.ts and room-price.actions.ts are requireRole-gated; the public hotel detail/booking pages had no legal way to read hotel_rooms/room_prices, so rooms never rendered and booking always fell back to hotel.starting_price.
2. booking.repository.ts's createBooking() has been unconditionally inserting a room_id column into public.bookings since an earlier undocumented session. SESSION_HANDOFF.md's own text for this date states the live table did NOT have that column at the time of this audit — see Known Issues / Doc Contradiction note below, this conflicts with DATABASE_BIBLE.md's Known Tables entry for bookings.

Fixed: new public getBookableRoomsForHotel() action; hotels/[slug]/page.tsx renders rooms + resolved per-night price; book/page.tsx + BookingForm.tsx add room selection with room_id passed through and per-room pricing; booking.actions.ts adds optional room_id to createBookingSchema with per-room price_snapshot resolution.

Claimed but not delivered this session (only discovered 2026-08-27): src/db/sql/008_room05_booking_room_linkage.sql, reported as "created for real this time," does not actually exist in the repo.

Verification: tsc --noEmit clean, ESLint clean on changed files. Production build not run to completion (sandbox Google Fonts restriction, unrelated to this change).

Known Issues / Doc Contradiction (added 2026-08-28, not a code change): DATABASE_BIBLE.md's Known Tables section states bookings' "live, confirmed columns include room_id," while this same 2026-08-23 entry above states the live table did NOT have room_id at time of audit. These two statements conflict and have not been reconciled. Live schema must be re-verified via information_schema.columns before BOOKING-02 is coded — do not proceed on either claim as-is.

2026-08-18 — ROOM-04 — Room Inventory / Availability

Status: COMPLETE — Frozen — Deployment Ready

Audit finding: RoomInventoryRepository (src/lib/repositories/room-inventory.repository.ts) already existed, live-schema-verified from a prior undocumented session, with getInventoryForRange, getInventoryForDate, getInventoryForRoomsOnDate, verifyRoomOwnership, and setInventoryForDate already implemented. Only a single read-only dashboard-summary Server Action (getRoomInventorySummaryForHotelAdmin) was wired up — no create/update/delete actions and no admin page existed, even though the /admin/hotels/[id]/rooms/[roomId]/availability route was already linked from the rooms list, edit, images, and pricing pages' navigation (all 404ing).

Created

- src/app/admin/hotels/[id]/rooms/[roomId]/availability/page.tsx — wires the new RoomInventoryManager into the route already referenced by existing navigation, following the ROOM-03 pricing page exactly.
- src/components/admin/rooms/RoomInventoryManager.tsx — client-component admin UI (date-range view, single-date set/edit/clear, bulk date-range apply with confirm step), structured identically to RoomPriceManager.tsx.

Modified

- src/app/actions/room-inventory.actions.ts — added setInventoryForDateAction, deleteInventoryForDateAction, getInventoryForRangeAction, and bulkSetInventoryAction (Zod-validated, ActionResult<T>, ownership-checked), matching room-price.actions.ts's pattern. Pre-existing getRoomInventorySummaryForHotelAdmin left untouched.
- src/lib/repositories/room-inventory.repository.ts — added one new method, deleteInventoryForDate: soft-deletes a date's inventory row, but refuses (throws) if booked_rooms > 0 for that date — the same "never invalidate an existing booking" guard already used by the pre-existing setInventoryForDate. No other method changed.

Confirmed live public.room_inventory columns (per repository comments from the prior session's audit, unchanged this session): id, room_id, inventory_date, total_rooms, available_rooms, blocked_rooms, booked_rooms, created_at, updated_at, created_by, updated_by, deleted_at.

Verification

TypeScript: PASS (0 errors).

ESLint: PASS (0 errors, 1 pre-existing unrelated warning — components/layout/ProfileMenu.tsx img element).

Build: not run this session; same sandbox Google Fonts network restriction noted in prior entries applies to any local build attempt — no code-level build errors (tsc/eslint both clean).

Scope

ROOM-04 implements per-day room availability (total/blocked/booked/available counts) only. No schema, RLS, or database changes — this session only added application code on top of the already-confirmed live schema. ROOM-05 (booking-room linkage) remains untouched and is the next milestone.

2026-08-16 — PACKAGE-IMG-01 — Package Images production 500 fix

Status: FIXED — code-level root cause identified and corrected.

Bug: Production POST /admin/packages/[id]/images returned 500 ("An error occurred in the Server Components render") when the client-invoked Server Actions for package images failed.

Root cause: getPackageImagesAdmin, uploadPackageImageAdmin, setPrimaryPackageImageAdmin, reorderPackageImageAdmin, and deletePackageImageAdmin (src/app/actions/package.actions.ts) threw raw, unwrapped errors instead of returning the ActionResult<T> safe-result contract that the analogous Hotel image actions (getHotelImagesAdmin etc., ADMIN-03, hotel.actions.ts) already use. Any underlying Supabase/Storage/RLS failure therefore crashed the Server Action boundary instead of resolving to a catchable {success:false, error} result.

Modified

- src/app/actions/package.actions.ts — wrapped all five package image admin functions in runAction(), matching hotel.actions.ts's ActionResult<T> pattern exactly.
- src/components/admin/packages/PackageImageManager.tsx — updated all five call sites to check result.success and unwrap result.data / result.error, matching HotelImageManager.tsx exactly.

No repository, schema, RLS, or Storage bucket configuration changed.

Not verified from repository inspection alone: the specific underlying condition that caused the original 500 in production (e.g. package_images table/RLS state, storage bucket config) — no migration file for package_images exists in the repo to confirm against. This fix guarantees the failure now surfaces as a graceful inline error instead of a hard 500, regardless of the underlying cause; the underlying cause itself needs production log confirmation (see SESSION_HANDOFF.md).

2026-08-16 — ROOM-03 — Room Rates / Pricing

Status: COMPLETE — Frozen — Deployment Ready

Audit finding: RoomPriceRepository (src/lib/repositories/room-price.repository.ts), room-price.actions.ts, and RoomPriceManager.tsx were already fully implemented and verified against the live public.room_prices schema by a prior, undocumented session — but RoomPriceManager was never imported by any page (dead code), and no PROJECT_STATUS/CHANGELOG/SESSION_HANDOFF entry existed for it.

Created

src/app/admin/hotels/[id]/rooms/[roomId]/pricing/page.tsx — wires the pre-existing RoomPriceManager into the route already referenced by the rooms list, room edit, and room images pages' navigation.

Modified

None. No repository, action, schema, or RLS files were changed — the existing backend was already correct.

Confirmed live public.room_prices columns (per repository comments, verified via production information_schema): id, room_id, price_date, base_price, discount_amount, tax_amount, final_price, currency_id, created_at, updated_at, created_by, updated_by, deleted_at. Parent table for room_id is hotel_rooms.

Verification

TypeScript: PASS (0 errors).

ESLint: PASS (0 errors, 1 pre-existing unrelated warning).

Build: blocked only by sandbox Google Fonts network restriction (environment-only, not a code defect).

Scope

ROOM-03 implements per-day room pricing only.

Also audited but explicitly deferred: ROOM-04 (room_inventory) has a similarly complete, undocumented backend (RoomInventoryRepository) but no CRUD actions or admin page — flagged as the next milestone, not implemented this session, per RULE 11 (one milestone at a time). ROOM-04 completed 2026-08-18, see entry above.

Architecture

Existing repository/action/component architecture retained. No new abstraction layers introduced.

2026-08-12 — ADMIN-10 / ROOM-01 — Hotel Room Type Management

Status: COMPLETE — Frozen — Deployment Ready

Created

src/app/admin/hotels/[id]/rooms/page.tsx

src/app/admin/hotels/[id]/rooms/[roomId]/edit/page.tsx

src/components/admin/rooms/RoomTypeForm.tsx

src/lib/actions/room-type.actions.ts

src/lib/repositories/room-type.repository.ts

src/lib/validations/room-type.schema.ts

Modified

src/app/admin/hotels/[id]/page.tsx

src/components/admin/hotels/HotelTable.tsx

src/lib/validations/index.ts

src/components/admin/layout/AdminSidebar.tsx

Scope

ROOM-01 implements hotel room types only.

Deferred:

ROOM-02 — Room Images

ROOM-03 — Room Rates

ROOM-04 — Room Inventory / Availability

ROOM-05 — Booking-Room Linkage

Fixes

Fixed missing RoomTypeForm export.

Fixed RoomTypeFormProps mode mismatch.

Fixed room-list return-shape TypeScript mismatch.

Architecture

Existing repository/action/form architecture retained. No unrelated frozen milestone intentionally reopened.

2026-08-12 — PAY-03 — Admin Payment Management UI

Status: COMPLETE — Frozen

Added:

src/app/admin/payments/page.tsx

src/app/admin/payments/[id]/page.tsx

Modified:

src/app/admin/page.tsx

PAY-01/PAY-02 were already implemented and were documented as Completed/Frozen. PAY-03 added the missing read-only admin UI. No schema change and no new payment mutation.

2026-08-09 — VENDOR-01 — ADMIN-09 Field-Mapping Correction

Status: COMPLETE — Frozen

Reconciled Vendor Management with the live public.vendors columns. No SQL/schema/data migration.

Documentation rule

Every completed milestone updates:

PROJECT_STATUS.md

SESSION_HANDOFF.md

CHANGELOG.md

Completed milestones are frozen under DEVELOPMENT_BIBLE.md RULE 20.
