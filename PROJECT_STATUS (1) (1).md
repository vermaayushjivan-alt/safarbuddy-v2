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

Pending

Booking — deferred scope

Room/departure inventory, availability calendars, coupons, commissions, invoices, vouchers, notifications, guest checkout, and vendor-facing booking access.

Room Management — future milestones

ROOM-03 — Room Rates

ROOM-04 — Room Inventory / Availability

ROOM-05 — Booking-Room Linkage

Do not combine these with ADMIN-10 without explicit milestone approval.

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

ROOM-03 — Room Rates

Before coding, perform the required RULE 15 readiness audit and confirm the approved schema. Do not invent ROOM-03 schema.

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
