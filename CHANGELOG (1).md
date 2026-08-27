CHANGELOG.md

All significant SafarBuddy V2 changes are recorded here.

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
