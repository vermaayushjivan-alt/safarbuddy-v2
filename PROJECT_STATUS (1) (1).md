PROJECT_STATUS.md

Single source of truth for SafarBuddy V2 progress.

Completed

HOME-01 — COMPLETE — Frozen

HOME-02 — COMPLETE — Frozen

HOME-03 — COMPLETE — Frozen

Features: Image fallback, Storage integration, Placeholder fallback.

ADMIN-01 — COMPLETE — Frozen

Features: Admin Dashboard, Role protection, Admin layout.

ADMIN-02 — COMPLETE — Frozen

Features: Hotel CRUD, Repository, Server Actions, Hotel Form, Hotel Edit.

ADMIN-03 — COMPLETE — Frozen

Features: Hotel Image Upload, Storage Upload, Primary Image, Gallery, Delete, Sort Order.

ADMIN-04 (Package CRUD) — COMPLETE — Frozen

ADMIN-05 (Package Image Management) — COMPLETE — Frozen

2026-08-16 hotfix (PACKAGE-IMG-01): getPackageImagesAdmin, uploadPackageImageAdmin, setPrimaryPackageImageAdmin, reorderPackageImageAdmin, and deletePackageImageAdmin in package.actions.ts threw raw errors instead of returning ActionResult<T>, unlike the identical Hotel image actions (ADMIN-03). Any underlying Supabase/Storage/RLS failure on these Server Actions therefore surfaced in production as an opaque 500 ("An error occurred in the Server Components render") on POST /admin/packages/[id]/images instead of a graceful inline error. Fixed by wrapping all five functions in runAction (matching hotel.actions.ts exactly) and updating PackageImageManager.tsx to unwrap the ActionResult, mirroring HotelImageManager.tsx. No repository, schema, RLS, or Storage bucket changes. Underlying trigger for the specific production 500 (e.g. package_images RLS/table state) not independently verified — see SESSION_HANDOFF.md for what remains open.

AUTH-05 (Role-Based Authentication) — COMPLETE — Frozen

Role protection, session helpers, middleware session refresh, protected layouts, /unauthorized, and role seed.

2026-08-08 stabilization: Database role names such as Super Admin are normalized to the application's super_admin role. Super Admin access to /admin is working.

AUTH-06 (Public Route Allowlist) — COMPLETE — Frozen

Public /hotels, /destinations, /about, /contact routes and their dynamic detail routes are allowed by middleware.

ADMIN-06 (Destination CRUD) — COMPLETE — Frozen

Destination CRUD, repository methods, Zod-validated Server Actions, role protection, and admin list/new/edit pages.

Stability hardening: Destination edit/image routes validate UUID parameters before database access.

ADMIN-07 (Destination Image Management) — COMPLETE — Frozen

Destination image list/upload/primary/reorder/delete flow and admin image manager.

Important: Supabase Storage/RLS live upload behavior has not been independently verified.

ADMIN-08 (Offers) — COMPLETE — Frozen

Offer repository, Zod/role-protected actions, create/edit form, admin pages, and public homepage offers integration.

ADMIN-09 (Vendor Management) — COMPLETE — Frozen

Vendor CRUD, vendor branches, role-protected actions, VendorForm, VendorBranchManager, and admin vendor pages.

2026-08-09 VENDOR-01 field-mapping correction: Reconciled the application to the live public.vendors columns (vendor_name, vendor_type, owner_user_id, business_email, business_phone, gstin, pan_number, status). No SQL/schema/data migration was performed.

BOOKING-01 (Hotel + Package Bookings) — COMPLETE — Frozen

Authenticated hotel/package booking, booking repository, customer/admin actions, booking pages, My Bookings, and admin bookings management. Room/departure inventory, availability, guest checkout, vendor booking access and related features remain deferred.

PAY-01 (Payments Schema) — COMPLETE — Frozen

public.payments schema plus matching Drizzle schema/types. Multiple payment attempts supported; refunds out of scope.

PAY-02 (Cashfree Integration) — COMPLETE — Frozen

Payment repository, Cashfree client, customer payment actions, signature-verified/idempotent webhook, and customer pay flow.

PAY-03 (Admin Payment Management UI) — COMPLETE — Frozen

/admin/payments paginated payment list with status filters.

/admin/payments/[id] payment detail and linked booking summary.

Payments card on /admin.

Reuses existing payment/booking actions; no schema change.

Verification: TypeScript PASS, ESLint PASS (0 errors; one pre-existing unrelated warning). Previous sandbox Google Fonts restriction was environment-only.

ADMIN-10 (Hotel Room Type Management / ROOM-01) — COMPLETE — Frozen

Hotel-nested room type management is complete and deployment-ready.

Features:

/admin/hotels/[id]/rooms room type list.

/admin/hotels/[id]/rooms/[roomId]/edit room type edit.

RoomTypeForm.

RoomTypeRepository.

room-type.actions.ts.

room-type.schema.ts.

Existing hotel admin navigation wired to room management.

Existing repository/action/form architecture retained.

Created:

src/app/admin/hotels/[id]/rooms/page.tsx

src/app/admin/hotels/[id]/rooms/new/page.tsx

src/app/admin/hotels/[id]/rooms/[roomId]/edit/page.tsx

src/components/admin/rooms/RoomTypeForm.tsx

src/lib/actions/room-type.actions.ts

src/lib/repositories/room-type.repository.ts

src/lib/validations/room-type.schema.ts

Modified:

src/app/admin/hotels/[id]/page.tsx

src/components/admin/hotels/HotelTable.tsx

src/lib/validations/index.ts

src/components/admin/layout/AdminSidebar.tsx

Scope: ROOM-01 only. ROOM-02 room images, ROOM-03 room rates, ROOM-04 room inventory/availability, and ROOM-05 booking-room linkage are separate future milestones.

Fixes completed: Missing RoomTypeForm export, RoomTypeFormProps/mode mismatch, and room-list return-shape TypeScript mismatch were resolved. The rooms/new route (referenced by the room list's "Add Room Type" link but never created) was added, reusing the existing RoomTypeForm in create mode.

Final status: Deployment Ready.

ROOM-02 (Room Image Management) — COMPLETE — Frozen

Room-type image upload, listing, primary-image selection, reordering, and deletion via Supabase Storage (room-images bucket) + the room_images table.

Features:

RoomImageManager admin component.

Upload / list / set-primary / reorder / delete actions in room-type.actions.ts.

/admin/hotels/[id]/rooms/[roomId]/images page.

Hardening applied in the pre-ROOM-03 audit:

Server-side ownership verification: setPrimaryRoomImage, updateRoomImageSortOrder, and deleteRoomImageRow are now scoped to both id and room_type_id, so an image belonging to a different room type can no longer be mutated. reorderRoomImageAdmin and deleteRoomImageAdmin now take roomTypeId as a required parameter.

Upload failure handling: if the DB insert fails after a successful Storage upload, the orphaned Storage object is now removed automatically.

Delete ordering changed to DB-row-delete-first, then Storage removal, so a Storage failure can no longer leave a DB row pointing at a deleted file. A Storage-removal failure after a successful DB delete is now logged as a non-fatal orphaned-object warning instead of throwing.

Created: src/app/admin/hotels/[id]/rooms/[roomId]/images/page.tsx, src/components/admin/rooms/RoomImageManager.tsx (pre-existing, from ROOM-02 implementation).

Final status: Deployment Ready.

ROOM-03 (Room Rates / Pricing) — COMPLETE — Frozen

Per-day room rate management (public.room_prices), confirmed live columns: id, room_id, price_date, base_price, discount_amount, tax_amount, final_price, currency_id, created_at, updated_at, created_by, updated_by, deleted_at. Parent table for room_prices.room_id is hotel_rooms (production; room_types does not exist — PGRST205).

Note: this session found the RoomPriceRepository, room-price.actions.ts, and RoomPriceManager component already implemented and schema-verified from a prior, undocumented session — but with no admin page ever wired up (RoomPriceManager was unreferenced/dead code) and no PROJECT_STATUS/CHANGELOG/SESSION_HANDOFF entry recording the work. This entry backfills that gap and completes the milestone by adding the missing route.

Features:

/admin/hotels/[id]/rooms/[roomId]/pricing — per-room rate management page.

Create / edit / delete a rate for a single date.

Bulk "Apply to Date Range" with a review/confirm step before overwriting existing rates (capped at 366 days per call).

Final price (base − discount + tax, floored at 0) computed and stored server-side, never trusted from the client.

Currency selection sourced from public.currencies (defaults to INR when present).

Server-side ownership verification (verifyRoomOwnership) scoping every mutation to the correct room_id/hotel_id pair before allowing admin/hotel_owner writes — a hotel_owner cannot price another hotel's room.

Loading, empty, validation-error, and success/error states throughout.

Created:

src/app/admin/hotels/[id]/rooms/[roomId]/pricing/page.tsx

Not created (pre-existing from the undocumented prior session, unchanged this session):

src/lib/repositories/room-price.repository.ts

src/app/actions/room-price.actions.ts

src/components/admin/rooms/RoomPriceManager.tsx

Scope: ROOM-03 only. ROOM-04 (room_inventory / availability) completed separately (see v11 below). ROOM-05 booking-room linkage remains untouched.

Final status: Deployment Ready.

ROOM-04 — Room Inventory / Availability. COMPLETE — Frozen (v11).

Created this session:

src/app/admin/hotels/[id]/rooms/[roomId]/availability/page.tsx

src/components/admin/rooms/RoomInventoryManager.tsx

Extended this session (pre-existing file, new exports added — no existing export changed):

src/app/actions/room-inventory.actions.ts — added setInventoryForDateAction, deleteInventoryForDateAction, getInventoryForRangeAction, bulkSetInventoryAction. Pre-existing getRoomInventorySummaryForHotelAdmin left unchanged.

src/lib/repositories/room-inventory.repository.ts — added deleteInventoryForDate (soft-delete, guarded: refuses when booked_rooms > 0 for that date, same "never invalidate an existing booking" principle as the pre-existing setInventoryForDate). No other method changed.

Not created (pre-existing from an earlier undocumented session, unchanged this session): src/lib/repositories/room-inventory.repository.ts's RoomInventoryRow interface, getInventoryForRange, getInventoryForDate, getInventoryForRoomsOnDate, verifyRoomOwnership, setInventoryForDate.

Scope: ROOM-04 only, following the ROOM-03 architectural pattern exactly (Zod-validated Server Actions returning ActionResult<T>, ownership check via requireRole(['admin','hotel_owner']) + repo.verifyRoomOwnership, client-component manager with single-date and bulk-date-range modals). No schema, RLS, or database changes — confirmed live room_inventory columns from the prior session's audit were used as-is. ROOM-05 booking-room linkage remains untouched.

Final status: Deployment Ready.

ROOM-05 — Booking-Room Linkage. COMPLETE — Frozen (backfilled, 2026-08-23 session).

Audited against the live schema per RULE 13/15 (information_schema.columns run directly against public.bookings). Two previously undocumented issues found and fixed: (1) public read gap — room-type.actions.ts/room-price.actions.ts were requireRole-gated so public hotel/booking pages couldn't read hotel_rooms/room_prices; added public getBookableRoomsForHotel(). (2) booking.repository.ts's createBooking() unconditionally inserts room_id into public.bookings; whether the live table actually has this column is disputed — see Known Issues below.

Created/modified: getBookableRoomsForHotel() in room-type.actions.ts; hotels/[slug]/page.tsx (renders rooms + resolved per-night price); hotels/[slug]/book/page.tsx + BookingForm.tsx (room selection, room_id passed through, per-room pricing); booking.actions.ts (optional room_id in createBookingSchema, per-room price_snapshot).

Claimed but not delivered this session (discovered later, 2026-08-27): src/db/sql/008_room05_booking_room_linkage.sql, reported as created, does not exist in the repo. Tracked as BOOKING-02.

Verification: tsc --noEmit clean, ESLint clean on changed files. Production build not run to completion (sandbox Google Fonts restriction).

Final status: Deployment Ready, but see BOOKING-02 / Known Issues — hotel bookings should be assumed broken until the room_id column question is resolved against the live schema.

Known Issues (added 2026-08-28)

RESOLVED 2026-08-28: information_schema.columns + pg_attribute/pg_attrdef/pg_constraint run directly against public.bookings confirm room_id exists (uuid, nullable, no default, FK → hotel_rooms(id)). DATABASE_BIBLE.md was correct; the 2026-08-23 audit's claim that the column was absent does not match current live state (which of the two was actually true at the time, or whether the column was added later by an undocumented change, is unknown and not guessed at). Migration src/db/sql/008_room05_booking_room_linkage.sql now exists on disk (idempotent, IF NOT EXISTS — documents the confirmed live state rather than attempting to re-apply it). BOOKING-02 closed — hotel bookings are not broken by a missing room_id column; no code changes were needed since the application already treats room_id as nullable and correctly typed.

Build-stability audit + launch-readiness planning (backfilled, 2026-08-27 session)

Two build-blocking bugs fixed, neither previously logged: whatsapp.client.ts recreated as inert stub (file was missing, broke tsc/Vercel builds); nodemailer + @types/nodemailer added to package.json (missing, broke Vercel builds). Both confirmed via tsc --noEmit and clean Vercel production builds.

Cashfree live-mode 401 diagnosed as stale/mismatched production keys in Vercel, not a code bug (cashfree.client.ts confirmed already correct). Resolved by the user re-entering matched live keys and redeploying; confirmed with a real live payment.

BOOKING-02 opened (see Next Development Phase) as the top-priority item — migration 008 missing on disk, room_id column state on live bookings table unresolved. CLOSED 2026-08-28 — see Known Issues below.

Four further milestones were discussed and named this session — BOOKING-02, VENDOR-02, PAY-04, CONTACT-02 — but on direct inspection of this file, none of them have an actual RULE 15 pre-coding audit (Existing Architecture / Root Cause / Files / Why / Minimal Plan) recorded here, despite SESSION_HANDOFF.md stating one exists for each. This is itself a claimed-but-absent documentation gap — see DOC_DEBT.md item 5. No code was written for any of the four.

Pending

Booking — deferred scope

Room/departure inventory, availability calendars, coupons, commissions, invoices, vouchers, notifications, guest checkout, and vendor-facing booking access.

Room Management — future milestones

ROOM-05 — Booking-Room Linkage

Do not combine these with ADMIN-10/ROOM-03 without explicit milestone approval.

Architecture Cleanup

src/lib/repository/ — dead duplicate repository tree (confirmed in pre-ROOM-03 audit: zero imports anywhere in src/).

src/lib/repositories/user.repository.ts — unused legacy repository (confirmed zero imports; only self-referenced by the also-unused src/lib/repositories/index.ts barrel).

src/lib/db/index.ts — unused duplicate DB client (confirmed zero imports; src/db/index.ts is the one actually used, by src/lib/auth/session.ts and src/app/api/health/route.ts).

src/lib/auth/redirect.ts — unused legacy helper.

src/lib/auth/server.ts — unused legacy helper.

Root-level components/, lib/, home.ts (outside src/) — appear to be stray duplicates of files that also exist under src/; not verified as part of the active Next.js app dir, left untouched pending confirmation.

Cleanup requires a dedicated milestone and explicit sign-off.

Documentation Gap — ROOM-01 Migration

src/db/sql/005_room01_schema.sql does not exist and was never listed as "Created" in the ROOM-01 CHANGELOG entry, consistent with DATABASE_BIBLE.md's documented pattern for "content tables" (created directly in Supabase, not via a committed migration). room_types itself is not in question — 006_room02_schema.sql's FK to it works and ROOM-01/02 are functionally complete — but the exact live column types/constraints/defaults are unverified beyond what RoomTypeRepository's RoomTypeRecord interface already states. LIVE VERIFICATION REQUIRED: pull the actual live schema (e.g. via Supabase dashboard or `pg_dump --schema-only`) before writing a documentation-only migration file. Do not guess the DDL.

Role-Based Dashboard Pages

/dashboard

/hotel-owner

/travel-agent

/super-admin

/vendor

Remaining Public Routes

Flights, Bus, Train, Holiday, Visa, Forex, Careers, Blog, Privacy Policy, and other currently unimplemented footer/navigation destinations.

Image Storage Verification

Still requires independent live verification of Supabase Storage bucket configuration, RLS, upload permissions, and production upload success.

Carried-over unresolved issues

Hotel vendor_id creation gap.

findWithPagination empty-message production error, pending log evidence.

Google OAuth unexpected_failure, likely Supabase/Google dashboard configuration.

Next Development Phase

ROOM-05 — COMPLETE (see above). BOOKING-02 — COMPLETE (see Known Issues above). VENDOR-02 — CODE COMPLETE, migration not yet run in production (see below). PAY-04/CONTACT-02 have no RULE 15 pre-coding audit recorded yet — SESSION_HANDOFF.md's original claim that one exists for each was false (DOC_DEBT.md item 5). Do not start coding either until that audit is actually performed and recorded here.

VENDOR-02 — Hotel Owner Payout KYC Capture. RULE 15 audit performed and code written 2026-08-28 (see v14 above). NOT YET DEPLOYMENT READY: src/db/sql/010_vendor02_payout_kyc.sql has not been run against production yet — run it manually in the Supabase SQL editor, then confirm public.vendor_payout_details exists via information_schema.columns before relying on the new admin page. Cashfree beneficiary creation is intentionally not implemented (inert stub) pending Payout API credentials.

PAY-04 — Automated Split Settlement via Cashfree Easy Split. Depends on VENDOR-02 (code complete, migration pending) and on Cashfree Payout credentials being provided. Named in SESSION_HANDOFF.md 2026-08-27; audit not yet done.

CONTACT-02 — Payment-Triggered Notifications (move CONTACT-01's notification trigger from booking-creation to payment-success). Depends on PAY-04. Named in SESSION_HANDOFF.md 2026-08-27; audit not yet done.

Dedicated Architecture Cleanup

Perform only after explicit cleanup sign-off and dependency/import verification.

Final Production Hardening

Storage/RLS, UUID routes, schema consistency, auth/role guards, error boundaries, navigation, dead code, TypeScript, ESLint, build and deployment verification.

Version History

v1 — Reconciled project status with actual repository state.

v2 (2026-08-06) — Routing audit and ADMIN-09 completion.

v3 (2026-08-07) — Stability/auth routing audit.

v4 (2026-08-08) — Auth/database stabilization and Super Admin role normalization.

v5 (2026-08-08) — UUID routing and repository hardening.

v6 (2026-08-08) — BOOKING-01 completed/frozen.

v7 (2026-08-12) — PAY-01/PAY-02 documentation backfill and PAY-03 admin UI.

v8 (2026-08-12) — ADMIN-10 / ROOM-01 completed/frozen. Room type list/edit flow, form, repository, actions and Zod schema completed. Build/type errors related to RoomTypeForm and room-list return shape resolved. Deployment-ready state recorded.

v9 (2026-08-12) — Pre-ROOM-03 hardening pass. Missing rooms/new route created (reuses RoomTypeForm). ROOM-02 image ownership vulnerability fixed (reorder/set-primary/delete now scoped to room_type_id). Upload/delete Storage↔DB failure handling hardened. ROOM-02 marked COMPLETE — Frozen. .gitignore restored from misnamed `gitignore` file (repo secrets were previously untracked-by-name only, not actually git-ignored); .env.example added. Two confirmed-unused stray files removed (stray-extension repository file, duplicate next.config). 005_room01_schema.sql confirmed genuinely absent — flagged LIVE VERIFICATION REQUIRED rather than reconstructed. src/lib/repository/, user.repository.ts, and src/lib/db/index.ts confirmed fully unused (documented for future cleanup, not deleted). TypeScript: PASS. ESLint: PASS (0 errors, 1 pre-existing unrelated warning). Production build: blocked by sandbox network restriction on Google Fonts fetch (environment-only, not a code defect — see PAY-03 note above for precedent).

v10 (2026-08-16) — ROOM-03 documentation backfill and admin page wiring. Audit found RoomPriceRepository, room-price.actions.ts, and the RoomPriceManager component already implemented and live-schema-verified from an undocumented prior session, but never wired to a route (RoomPriceManager was dead/unreferenced code) and never recorded in PROJECT_STATUS/CHANGELOG/SESSION_HANDOFF. Added the missing /admin/hotels/[id]/rooms/[roomId]/pricing page (existing nav links in the rooms list, edit, and images pages already pointed at this exact route). No repository, action, schema, or RLS changes — only the route was added. ROOM-03 marked COMPLETE — Frozen. Also discovered, but explicitly left out of scope: RoomInventoryRepository (ROOM-04 backend) exists with confirmed live room_inventory columns, but only a read-only summary action and no admin CRUD/page exist yet — documented under Next Development Phase rather than implemented, per RULE 11 (one milestone at a time). TypeScript: PASS. ESLint: PASS (0 errors, 1 pre-existing unrelated warning — components/layout/ProfileMenu.tsx img element). Production build: blocked only by the same sandbox Google Fonts network restriction as v9 (403 fetching Inter from fonts.googleapis.com); no code-level build errors.

v11 (2026-08-18) — ROOM-04 completed. Added the missing create/update/delete Server Actions (setInventoryForDateAction, deleteInventoryForDateAction, getInventoryForRangeAction, bulkSetInventoryAction) to the pre-existing room-inventory.actions.ts, one new repository method (deleteInventoryForDate, guarded against clearing a date with existing bookings), the RoomInventoryManager admin component, and the /admin/hotels/[id]/rooms/[roomId]/availability page already referenced by existing nav links. Followed the ROOM-03 architectural pattern exactly (Zod validation, ActionResult<T>, requireRole + verifyRoomOwnership, single-date and bulk-date-range UI). No schema, RLS, or database changes. ROOM-04 marked COMPLETE — Frozen. TypeScript: PASS. ESLint: PASS (0 errors, 1 pre-existing unrelated warning — components/layout/ProfileMenu.tsx img element). Production build: not run this session (same sandbox Google Fonts network restriction noted in v9/v10 applies; no code-level build errors — tsc/eslint both clean).

v12 (2026-08-28) — Documentation backfill only, no code changes. User confirmed PROJECT_STATUS.md/CHANGELOG.md were not updated in the prior two sessions (2026-08-23 ROOM-05, 2026-08-27 build-stability/planning), matching what direct inspection of the delivered repo found. Backfilled both files from SESSION_HANDOFF.md and DOC_DEBT.md's account of those sessions. ROOM-05 marked COMPLETE — Frozen (backfilled). Surfaced and logged, but deliberately NOT resolved by invention: (1) a direct contradiction between DATABASE_BIBLE.md (says bookings.room_id is live-confirmed) and the 2026-08-23 audit record (says it is not) — flagged under Known Issues, must be re-verified against information_schema before BOOKING-02 is coded; (2) SESSION_HANDOFF.md's claim that BOOKING-02/VENDOR-02/PAY-04/CONTACT-02 each have a full RULE 15 audit recorded here is false — no such audits exist in this file. Logged as DOC_DEBT.md item 5. No migration written, no schema assumed, per RULE 13.

v13 (2026-08-28) — BOOKING-02 closed. User ran information_schema.columns and pg_attribute/pg_attrdef/pg_constraint directly against public.bookings, confirming room_id exists (uuid, nullable, no default, FK → hotel_rooms(id)). This resolves the v12 DATABASE_BIBLE.md/2026-08-23-audit contradiction in DATABASE_BIBLE.md's favor. Migration src/db/sql/008_room05_booking_room_linkage.sql created (idempotent, ADD COLUMN IF NOT EXISTS) to close the RULE 32 gap — it documents the confirmed live state rather than re-applying a change that was already live. No application code changed: booking.repository.ts already treated room_id as nullable/optional and was already correct. DATABASE_BIBLE.md's Migration Registry and Known Tables entries updated to match. VENDOR-02/PAY-04/CONTACT-02 remain named-but-unaudited — see Next Development Phase; none started.

v14 (2026-08-28) — VENDOR-02 implemented (Hotel Owner Payout KYC Capture). RULE 15 audit recorded above led to a new src/db/sql/010_vendor02_payout_kyc.sql migration (not yet run in production — must be run manually in Supabase, then confirmed via information_schema.columns per RULE 13) creating public.vendor_payout_details as a table separate from public.vendors (bank_account_number, bank_ifsc, upi_id, cashfree_beneficiary_id, payout_status default 'pending'; unique index on vendor_id; RLS enabled with no public/authenticated policy — access is admin-only via BaseRepository + service role, same pattern as other content tables). PAN stays on public.vendors (pan_number) and is not duplicated. Created: src/lib/repositories/vendor-payout.repository.ts (VendorPayoutRepository, getByVendorId/upsertForVendor), src/app/actions/vendor-payout.actions.ts (admin-only, Zod-validated inline per vendor.actions.ts's actual convention — no src/lib/validations/ directory exists in this repo despite the ADMIN-10 entry referencing one), src/components/admin/vendors/VendorPayoutForm.tsx, src/app/admin/vendors/[id]/payout/page.tsx, src/lib/cashfree/cashfree-payouts.client.ts (inert stub — Cashfree Payouts needs its own separate credentials, not yet provided; matches the whatsapp.client.ts precedent, no invented API contract). Modified: src/app/admin/vendors/[id]/edit/page.tsx — added "Manage Payout Details" link next to the existing "Manage Branches" link. Decision (made by Claude, approved by user via "jo professional bhi ho aur asani se ho bhi jaye"): admin-managed capture rather than owner self-service, since src/app/vendor/ has only a role-guard layout and no actual page — building owner-facing auth/UI was out of scope for this milestone. Scope: capture + storage only. Cashfree beneficiary creation (calling cashfree-payouts.client.ts for real) and PAY-04's split-settlement logic are NOT implemented — both need real Payout API credentials first. TypeScript: PASS (0 errors). ESLint: PASS (0 errors) on all new/changed files.
