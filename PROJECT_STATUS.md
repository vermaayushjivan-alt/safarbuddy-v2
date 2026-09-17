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

Authenticated hotel/package booking, booking repository, customer/admin actions, booking pages, My Bookings, and admin bookings management. Room/departure inventory, availability, vendor booking access and related features remain deferred. Guest checkout is no longer deferred — see BOOKING-03 below.

BOOKING-03 (Guest Checkout) — CODE COMPLETE 2026-09-11, NOT VERIFIED

Restored after a regression: this milestone was previously delivered but absent from the repo zip uploaded at the start of the 2026-09-11 session (createBooking() still threw UNAUTHENTICATED, migration 012 and the confirmation route did not exist) — confirmed by the user as the actual latest state, not a stale upload. See DOC_DEBT.md item 12 and CHANGELOG.md 2026-09-11 for full detail.

Delivered: src/db/sql/012_booking03_guest_checkout.sql (customer_id nullable + guest_name/guest_email/guest_phone + bookings_customer_or_guest_check), createBooking() accepting unauthenticated callers via createServiceRoleClient() with required guest contact fields, getGuestBookingConfirmation(), BookingForm.tsx guest-contact section (isAuthenticated prop), public /booking-confirmation/[id] page, and the /packages/ + /booking-confirmation/ middleware public-route fix (package guest checkout was also blocked at the middleware layer, not just the page level).

tsc --noEmit and eslint both clean on every changed file. NOT verified: migration 012 has not been run in production (no reachable Supabase instance in this sandbox); no live functional walkthrough. RULE 22 applies (bookings-mutation path) — do not mark Frozen until both are done.

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

Room/departure inventory, availability calendars, invoices, vouchers.
Coupons, commissions, notifications, guest checkout, and vendor-facing
booking access are no longer deferred — see COUPON-01, PAY-04,
CONTACT-01/CONTACT-02, BOOKING-03, and VENDOR-BOOKING-01 respectively.

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

/hotel-owner — CODE COMPLETE 2026-09-05 (P0.3 Steps 2-5), NOT VERIFIED. See Next Development Phase entry below. No longer an empty route, but not yet Frozen — needs a real functional walkthrough first.

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

ROOM-05 — COMPLETE (see above). BOOKING-02 — COMPLETE (see Known Issues above). VENDOR-02 — CODE COMPLETE, migration confirmed live 2026-09-03 (see below). VENDOR-03 — M1 CODE COMPLETE, migration confirmed live 2026-09-05; M2 CODE COMPLETE, NOT VERIFIED (see below); M3 not scoped (dangling claim corrected 2026-09-17, see DOC_DEBT.md item 16c); M4 CODE COMPLETE, backfilled 2026-09-17, NOT VERIFIED live (see below). CONTACT-02 — CODE COMPLETE 2026-09-17, NOT VERIFIED live (see below). PAY-04 — CODE COMPLETE 2026-09-17 (RULE 15 audit performed in chat session, see CHANGELOG.md same date) — this turned out to be manual settlement tracking (fixed 20% commission split + admin-logged payout receipts), not the originally-scoped Cashfree Payouts split-settlement automation; that automation is still not started and remains blocked on migration 010 (not yet run in production) and the unwired Cashfree Payouts client. Migration 013 (PAY-04's own schema) is also not yet run in production — see DATABASE_BIBLE.md Migration Registry. CONTACT-02's RULE 15 audit was performed and recorded 2026-09-17 (see CONTACT-02 entry above and CHANGELOG.md same date) — DOC_DEBT.md item 5's original dangling-audit claim remains open only as a historical record of the earlier false claim, not as a live blocker anymore.

Planned (not started) — OWNER-DASH-01 (unified owner portal),
OFFERS-01 (owner self-service coupons), CALENDAR-01 (owner room
availability calendar + pricing). Full RULE 15 pre-coding audit for
all three recorded in DEVELOPMENT_BIBLE.md Section I
(2026-09-17) — read that section before starting any of them.

VENDOR-BOOKING-01 — Vendor-Facing Booking Visibility (read-only).
CODE COMPLETE, backfilled into this file 2026-09-17 (previously
undocumented — DOC_DEBT.md item 17). Discovered already fully
implemented on disk during the same 2026-09-17 audit session that
found VENDOR-03 M4. Closes the "vendor-facing booking access" gap
this file's own Pending section had listed since at least the
2026-08-27 planning session. A signed-in `vendor`/`hotel_owner`
account can view their own bookings (dates, guests, price, status),
filterable by status and paginated — read-only by explicit design; no
confirm/cancel/complete action exists here, that stays admin-only
until a vendor-write workflow is separately scoped and audited (RULE
11/28). requireVendorContext() (src/lib/auth/vendor-context.ts) is a
new, deliberately separate read-only counterpart to owner-context.ts's
write-scoped requireOwnerVendor() — accepts the 'vendor' role, which
the write path intentionally does not. Created: src/lib/auth/vendor-context.ts,
src/app/actions/vendor-booking.actions.ts, src/app/vendor/page.tsx
(redirects to /vendor/bookings — no full vendor dashboard home is in
scope yet), src/app/vendor/bookings/page.tsx. Modified:
src/lib/repositories/booking.repository.ts (getBookingsByVendorId, a
new read-only method scoped to a single vendor_id — no existing method
signature changed). No schema/migration change — reuses the existing
bookings.vendor_id column already populated at booking-creation time.
Verification (2026-09-17 audit session): tsc --noEmit PASS, eslint
PASS (0 errors, whole project). NOT verified: no live Supabase
reachable in this sandbox — no real vendor account has exercised this
page end-to-end (RULE 21/23).

PAY-04 — Manual Settlement Tracking. CODE COMPLETE 2026-09-17, NOT
VERIFIED (migration 013 not yet run in production, no live functional
walkthrough). Full file list and design reasoning in CHANGELOG.md's
2026-09-17 entry. Summary: payments.platform_commission_amount /
vendor_payout_amount computed once at webhook-success time (fixed 20%
rate, single source of truth in src/lib/payments/commission.ts); new
public.vendor_settlements table logs each manual payout an admin sends
outside the app, auto-generating a receipt number; /admin/settlements
(list + per-vendor detail with a "Mark as Paid" form capped at the
actual due amount) and /vendor/payments (the owner's own receipt
history) are the two new UI surfaces. Remaining scope after this:
invoices/vouchers — coupons and commissions are both done now (coupons
as COUPON-01 below, commissions as manual tracking, not automated
payouts).

COUPON-01 — Discount Coupons. CODE COMPLETE 2026-09-17, PRODUCTION
HOTFIXED 2026-09-17 (same day, follow-up chat session — see
CHANGELOG.md "Admin panel + coupons production incident" entry and
DOC_DEBT.md item 15). Migration 014 as written on disk was a no-op
against production (a pre-existing, differently-shaped legacy
`coupons` table already existed there); reconciled live via a
hand-written ALTER-based migration instead — the on-disk migration
file has NOT yet been rewritten to match (pending). Admin CRUD
(coupon.actions.ts) also required switching from the session client
to createServiceRoleClient() to work around coupons' RLS-enabled-
no-policy state (same fix pattern flagged as an open question for
vendor_payout_details/vendor_settlements — see DATABASE_BIBLE.md).
Verified live by the user: /admin/coupons lists and creates coupons
successfully. Full file list and RULE 15 audit summary in
CHANGELOG.md's original 2026-09-17 entry. Headline finding from that
audit: bookings.
price_snapshot — not subtotal/coupon_discount/grand_total — is what
Cashfree actually charges, so the discount is applied there directly;
the new coupon_id/coupon_code/coupon_discount_amount columns on
bookings are record-keeping only. Percentage or flat, admin chooses
global or single-vendor scope per coupon, works for both hotel and
package bookings, no usage-count limit (on/off only) — all per explicit
product decision. /admin/coupons (list + create/edit + activate/
deactivate) and an "Apply Coupon" control on the public BookingForm are
the two new UI surfaces. Remaining booking-setup scope after this:
invoices/vouchers, then SEO.

VENDOR-03 — Self-Service "List Your Property" (4-milestone plan, requested by project owner for international launch: a hotel owner should submit their property — details, facilities, payout, contact — in one form, without an admin manually creating records).

- M1 — Schema Foundation. CODE COMPLETE 2026-08-28. Migration RUN AND CONFIRMED IN PRODUCTION 2026-09-05: public.hotel_facilities and public.hotel_facility_links verified live via information_schema.columns — all expected columns present with correct types (hotel_facilities: id uuid, code/label/category text, display_order integer, is_active boolean, created_at/updated_at timestamptz; hotel_facility_links: id/hotel_id/facility_id uuid, created_at timestamptz), per RULE 13/35. M1 is now DEPLOYMENT READY. RULE 15 audit recorded in chat session (not duplicated here in full — summary: hotels had no facilities column; no safe user_roles-write path existed). Delivered: src/db/sql/011_vendor03_hotel_facilities.sql (hotel_facilities catalog + hotel_facility_links junction, RLS enabled with public-read policies), src/lib/repositories/hotel-facility.repository.ts, src/lib/auth/roles.ts (grantSelfServiceRole/hasSelfServiceRole, hardcoded to hotel_owner/vendor only — see file for why this is safe without its own requireRole() call). tsc --noEmit and eslint both clean on new files.
- M2 — Public "List Your Property" flow. CODE COMPLETE 2026-08-28.
  Migration (011, from M1) RUN AND CONFIRMED IN PRODUCTION 2026-09-05
  (see M1 above) — M2's dependency is now satisfied; the live form can
  be functionally tested end-to-end for the first time. RULE 15 decision: submitPropertyListing() is NOT requireRole()
  gated (a brand-new visitor has no role yet); safety instead comes
  from using createServiceRoleClient() for all writes (trusted-server
  pattern already established for the Cashfree webhook), only ever
  acting on the user id returned by this action's own signUp() call
  (never a client-supplied id), and grantSelfServiceRole()'s hardcoded
  hotel_owner/vendor allowlist. New hotel+vendor rows always start
  status='pending' — never auto-published. Delivered: one consolidated
  Zod schema/form covering owner account + property details +
  facilities checklist (from M1's catalog) + payout/contact, submitted
  in one form/one submit via property-listing.actions.ts
  (getFacilityCatalog() + submitPropertyListing()), a public
  /list-your-property route, and a "List Your Property" button on the
  homepage Navbar. Property photo/ID-proof upload explicitly out of
  scope (no Storage bucket designed yet — see M3 below). Full file
  list in CHANGELOG.md's 2026-08-28 "VENDOR-03 (M2)" entry.
  Verification: tsc --noEmit PASS, eslint PASS (0 errors). NOT
  verified: no functional walkthrough (no live Supabase reachable in
  any sandbox session yet); migration 011 not run in production at
  the time M2 was written (RUN AND CONFIRMED 2026-09-05, see M1
  above — M2 itself has still never been walked through live).

- M3 — Property Photo / ID-Proof Upload. NOT SCOPED. No session has
  ever written a milestone-plan entry defining M3's boundaries beyond
  the one-line deferral in M2's own CHANGELOG entry ("property
  photo/ID-proof upload — no Storage bucket/path designed yet").
  PROJECT_STATUS.md's own "Next Development Phase" summary line has
  claimed "M3 partially covered" since at least 2026-09-05 with
  nothing behind that claim anywhere in this file, SESSION_HANDOFF.md,
  or CHANGELOG.md — logged as DOC_DEBT.md item 16c (2026-09-17 audit).
  Do not start coding M3 until a real RULE 15 audit + scope decision
  (what "partially covered" was ever supposed to mean, whether ID-proof
  upload needs its own private Storage bucket + admin-only read
  access given it's identity-document-adjacent, and how it interacts
  with M4's approval queue) is recorded here.

- M4 — Admin Approval Queue. CODE COMPLETE, backfilled into this file
  2026-09-17 (previously undocumented — DOC_DEBT.md item 16d).
  Discovered already fully implemented on disk during a 2026-09-17
  audit session, with its own RULE 15 audit note already written
  in-code (see hotel.actions.ts). Reviews hotels+vendors created via
  M2's self-service flow (status='pending') and lets an admin
  approve (hotel → 'active', and its linked vendor → 'active' only if
  the vendor is still 'pending' — never overwrites a vendor an admin
  separately suspended for another reason) or reject (hotel →
  'suspended' — HOTEL_STATUS_VALUES has no 'rejected' member and
  RULE 8 forbids inventing one; the linked vendor is deliberately left
  untouched on reject, since one rejected listing shouldn't suspend an
  owner account that may submit another property later).
  Created: src/app/admin/hotels/pending/page.tsx. Modified:
  src/app/actions/hotel.actions.ts (getPendingHotelsAdmin,
  approveHotelAdmin, rejectHotelAdmin), src/lib/repositories/hotel.repository.ts
  (getHotelsByStatus). Role-gated requireRole(['admin','super_admin'])
  on every action (RULE 6/27). Linked from /admin/hotels and mentioned
  on the /admin dashboard card. No schema/migration change — reuses
  the existing hotels.status/vendors.status columns from M1/DATABASE_BIBLE.
  Verification (2026-09-17 audit session): tsc --noEmit PASS, eslint
  PASS (0 errors, whole project) — first session able to actually run
  either, since npm install succeeded in this sandbox. NOT verified:
  no live Supabase reachable, so Approve/Reject has never been walked
  through against a real pending listing (RULE 21/23) — must be done
  before Frozen.

CONTACT-02 — Payment-Triggered Notifications. CODE COMPLETE
2026-09-17 (chat session, same day as PAY-04/COUPON-01/the admin
incident above). RULE 15 audit performed before coding (see
CHANGELOG.md's 2026-09-17 "CONTACT-02" entry for the full
Existing Architecture / Root Cause / Files / Why / Minimal Plan).
Root cause: notifyBookingCreated() (CONTACT-01) fired from
createBooking() at booking-insertion time — before any payment
existed — so every checkout attempt alerted the hotel/vendor,
including ones abandoned at the Cashfree payment page and never
paid for. Fixed by moving the call from booking.actions.ts to
src/app/api/public/cashfree/webhook/route.ts, right after a
successful payment confirms the booking (bookingRepo.confirmBooking())
— fires exactly once per booking, only on a verified successful
payment. No changes to dispatch.ts itself (RULE 9 — reused the exact
same NotifyBookingCreatedInput contract CONTACT-01 already defined).
Depended on PAY-04 per the original milestone plan; PAY-04 is CODE
COMPLETE (see above) so this was unblocked for coding, though PAY-04
itself is still NOT VERIFIED/not Frozen (migration 013 not yet run in
production) — CONTACT-02's own code has no dependency on PAY-04's
migration, only on the webhook route PAY-04 already touches.
Verification: tsc --noEmit PASS, eslint PASS (0 errors, whole
project, same run as VENDOR-03/M4 above). NOT verified (RULE 21/22 —
this is a notification-adjacent path off the payment webhook, not a
bookings/payments mutation itself, but still): no live Cashfree
webhook has been triggered against this code — must be walked through
with a real test payment before Frozen.
