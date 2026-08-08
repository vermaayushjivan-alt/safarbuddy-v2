# PROJECT_STATUS.md

Single source of truth for SafarBuddy V2 progress. Update existing entries in place — do not create duplicate milestone headings. See `## Version History` at the bottom for a log of when this file itself was revised.

---

## Completed

### HOME-01 — COMPLETE — Frozen

### HOME-02 — COMPLETE — Frozen

### HOME-03 — COMPLETE — Frozen

Features: Image fallback, Storage integration, Placeholder fallback.

### ADMIN-01 — COMPLETE — Frozen

Features: Admin Dashboard, Role protection, Admin layout.

### ADMIN-02 — COMPLETE — Frozen

Features: Hotel CRUD, Repository, Server Actions, Hotel Form, Hotel Edit.

### ADMIN-03 — COMPLETE — Frozen

Features: Hotel Image Upload, Storage Upload, Primary Image, Gallery, Delete, Sort Order.

### ADMIN-04 (Package CRUD) — COMPLETE — Frozen

### ADMIN-05 (Package Image Management) — COMPLETE — Frozen

### AUTH-05 (Role-Based Authentication) — COMPLETE — Frozen

Features: `requireRole()` / session helpers (`src/lib/auth/session.ts`, `server.ts`, `client.ts`, `route-guards.ts`, `api-guard.ts`), middleware session refresh + public-route allowlist (`middleware.ts`), protected layout shells with role guards for `dashboard`, `hotel-owner`, `travel-agent`, `super-admin`, and `vendor`, `/unauthorized` page, DB role seed (`src/db/sql/002_role_seed_auth05.sql`).

**2026-08-08 stabilization:** Role-name normalization was added in `src/lib/auth/session.ts` so database role names such as `Super Admin` resolve correctly to the application's `super_admin` role value. Super Admin access to `/admin` is now working in the live environment.

### AUTH-06 (Public Route Allowlist) — COMPLETE — Frozen

Middleware recognizes `/hotels`, `/destinations`, `/about`, `/contact` as public (no session check), plus the `/hotels/*` and `/destinations/*` dynamic detail routes. All four listed pages exist under `src/app/`.

### ADMIN-06 (Destination CRUD) — COMPLETE — Frozen

Features: Destination CRUD (create/read/update/delete), Repository extension (`getAllDestinations`, `getDestinationById`, `createDestination`, `updateDestination`, `deleteDestination`), Server Actions (Zod-validated, `requireRole(['admin','super_admin'])`), Destination Form, Destination list/new/edit admin pages.

**Stability hardening:** Destination edit and image routes now validate dynamic UUID parameters before querying the repository, preventing malformed values such as `%5Bid%5D` from reaching PostgreSQL as UUID parameters.

### ADMIN-07 (Destination Image Management) — COMPLETE — Frozen

Features: `DestinationRepository` image methods (`listDestinationImages`, `getDestinationImageById`, `insertDestinationImageRow`, `setPrimaryDestinationImage`, `updateDestinationImageSortOrder`, `deleteDestinationImageRow`), matching admin actions in `destination.actions.ts` (`getDestinationImagesAdmin`, `uploadDestinationImageAdmin`, `setPrimaryDestinationImageAdmin`, `reorderDestinationImageAdmin`, `deleteDestinationImageAdmin`), `DestinationImageManager` component, `/admin/destinations/[id]/images` page.

**Stability hardening:** Invalid destination IDs are rejected at the route boundary instead of producing database UUID errors.

**Important:** Supabase Storage/RLS live upload behavior has not been independently verified in the current stabilization pass.

### ADMIN-08 (Offers) — COMPLETE — Frozen

Features: `OfferRepository` (`getActiveOffers`, `getAllOffers`, `getOfferById`, `createOffer`, `updateOffer`, `deleteOffer`), `offer.actions.ts` (Zod-validated, `requireRole(['admin','super_admin'])`), `OfferForm` component (supports `create` and `edit` modes), `/admin/offers` list page, `/admin/offers/new` page, `/admin/offers/[id]/edit` page, public `getActiveOffers()` wired into the homepage `Offers` section.

### ADMIN-09 (Vendor Management) — COMPLETE — Frozen

Features: `VendorRepository` extends `BaseRepository` for vendor CRUD (`getAllVendors`, `getVendorById`, `createVendor`, `updateVendor`, `deleteVendor` with soft-delete via `deleted_at`), direct Supabase calls for `vendor_branches` (`listVendorBranches`, `getVendorBranchById`, `createVendorBranch`, `updateVendorBranch`, `deleteVendorBranch`), `vendor.actions.ts` with role protection and validation, `VendorForm`, `VendorBranchManager`, `/admin/vendors`, `/admin/vendors/new`, `/admin/vendors/[id]/edit`, `/admin/vendors/[id]/branches`.

**Stability hardening:** `src/lib/repositories/base.repository.ts` was corrected after a production/build parsing failure so the repository layer can be imported safely by vendor and other repository consumers.

### BOOKING-01 (Hotel + Package Bookings) — COMPLETE — Frozen

Authenticated-customer booking for hotels and packages, decoupled from payment. Approved schema: single `bookings` table (`booking_type` discriminator, mutually-exclusive `hotel_id`/`package_id`, `price_snapshot` captured at creation from the hotel/package's current `starting_price`, lifecycle `pending → confirmed/cancelled → completed`). No room/departure inventory, no availability engine, no guest checkout, no payment, no vendor access — all deferred per approved scope.

Features:
- DB: `bookings` table added to `src/db/schema.ts` (Drizzle — schema/type source of truth only, per BOOKING-01 approval; the repository itself uses the same Supabase-client `BaseRepository` pattern as `hotels`/`packages`, consistent with `DATABASE_BIBLE.md`) and `src/db/sql/003_booking01_schema.sql` (raw SQL, additive only, includes CHECK constraints for `booking_type`, `status`, `num_guests > 0`, and the hotel/package XOR rule).
- Repository: `BookingRepository` (`createBooking`, `getBookingById`, `getMyBookings`, `getAllBookings`, `cancelBooking`, `confirmBooking`, `completeBooking`).
- Server Actions (`booking.actions.ts`): customer (`createBooking`, `getMyBookings`, `getMyBookingById`, `cancelMyBooking` — ownership-checked, auth-derived `user_id`, never trusted from client) and admin (`getAllBookingsAdmin`, `getBookingByIdAdmin`, `confirmBookingAdmin`, `cancelBookingAdmin`, `completeBookingAdmin` — `requireRole(['admin','super_admin'])`), full Zod validation including hotel/package cross-field rules.
- One additive public action, `getPackageForBooking(id)`, added to `package.actions.ts` — no public `/packages/[slug]` page exists yet, so package booking is addressed by id, not slug.
- UI: `/hotels/[slug]/book`, `/packages/[id]/book` (customer booking forms), `/dashboard/bookings` (customer "My Bookings", with cancel), `/admin/bookings` (admin list with status filter, confirm/cancel/complete). Hotel detail page's previously-disabled "Booking coming soon" button now links to `/hotels/[slug]/book`. Admin dashboard and `ProfileMenu` link to the new pages. No existing UI/design system changed — new pages reuse existing Tailwind tokens and component patterns (mirrors `OfferForm`/admin list pages).
- Auth note: `/hotels/*` is in `middleware.ts`'s public allowlist (AUTH-06, frozen — not modified), so the hotel booking page adds its own explicit `getAuthUser()` guard rather than touching that frozen rule. The package booking page is naturally covered by middleware's default-protected behavior, with the same explicit guard for consistency.

**Verification:** TypeScript PASS, ESLint PASS (0 errors; 1 pre-existing unrelated warning). Production build blocked by the same environment-only Google Fonts network restriction documented in the 2026-08-08 stabilization pass above — not a code error.

---

## Pending

### Payments

- Payment tables / payment flow — Pending.

Must not be invented or implemented until the database architecture is explicitly defined according to `DATABASE_BIBLE.md`. Booking (BOOKING-01) intentionally creates bookings independent of payment so this can follow as its own milestone.

### Booking — deferred to a later milestone

Room/departure inventory, availability calendars, coupons, commissions, invoices, vouchers, notifications, guest checkout, and vendor-facing booking access were explicitly out of scope for BOOKING-01 and remain unbuilt.

### Architecture Cleanup

Pending as a dedicated milestone and must not be bundled into unrelated feature work.

Known dead/duplicate files requiring explicit cleanup/sign-off:

- `src/lib/repository/` — singular duplicate repository tree.
- `src/lib/repositories/user.repository.ts` — unused legacy repository.
- `src/lib/repositories/hotel.repository.ts ts` — stray file.
- `src/lib/auth/redirect.ts` — unused legacy redirect helper.
- `src/lib/auth/server.ts` — unused legacy auth helper.

### Role-Based Dashboard Pages

The following route shells exist but do not yet have their own `page.tsx`:

- `/dashboard`
- `/hotel-owner`
- `/travel-agent`
- `/super-admin`
- `/vendor`

These remain future feature work and are not considered part of the current stability fixes.

### Remaining Public Routes

The following navigation destinations still do not have corresponding pages:

- Flights
- Bus
- Train
- Holiday
- Visa
- Forex
- Careers
- Blog
- Privacy Policy
- Other footer/navigation destinations currently without implemented routes

These should be implemented before their navigation links are treated as complete.

### Image Storage Verification

Image-management code exists for destinations, hotels and packages, including upload/list/primary/reorder/delete flows.

However, the current pass has **not independently live-verified**:

- Supabase Storage bucket configuration
- Storage RLS policies
- Upload permissions
- Production image upload success

If image uploads continue to fail after deployment, the exact Supabase/Storage error must be checked before making further application-layer changes.

---

## 2026-08-08 — Authentication & Admin Stability Pass

### Completed during this pass

1. **Role normalization**
   - Updated `src/lib/auth/session.ts`.
   - Database role names such as `Super Admin` are normalized to the application's `super_admin` role.
   - Live Super Admin access to `/admin` confirmed working.

2. **Users schema issue isolated**
   - Live `public.users` schema was inspected.
   - The live table contains `auth_user_id`, `full_name`, `email`, `phone`, `status`, `is_verified` and audit columns.
   - Legacy fields such as `avatar_url`, `is_active`, `is_email_verified`, etc. are not present in the live table.
   - The active authentication path was kept independent from those legacy columns.

3. **Destination UUID hardening**
   - Added reusable UUID validation.
   - Destination edit/images routes reject malformed IDs such as `[id]` and `%5Bid%5D` before database access.
   - Prevents PostgreSQL error `22P02` from becoming a generic application crash.

4. **Repository stability**
   - Corrected `src/lib/repositories/base.repository.ts` after a source parsing/build failure.
   - Repository imports used by Vendor Management and other repository consumers are now syntactically valid.

5. **Auth redirect stability**
   - Client-side protected-route redirects were aligned from the nonexistent `/auth/login` route to the actual `/login` route.
   - Role-protected layouts distinguish unauthenticated users, unauthorized roles and unexpected errors.

### Verification

- TypeScript: PASS during the latest Claude verification pass.
- ESLint: PASS during the latest Claude verification pass, with one pre-existing unrelated warning.
- Production build: environment-dependent; previous sandbox verification was blocked by external Google Fonts network access, while the application build itself was reported to compile successfully when the network restriction was bypassed.
- Live Admin access: CONFIRMED.
- Live Super Admin role authorization: CONFIRMED through successful Admin access.
- Supabase Storage upload: NOT independently confirmed in this pass.
- Booking/payment flows: NOT implemented.

---

## Next Development Phase

### 1. Payment Flow

After booking architecture is established:

- Payment database design
- Cashfree integration
- Payment actions
- Payment status handling
- Success/failure handling
- Booking/payment relationship (linking a `bookings` row to its payment once the payment schema exists)

### 2. Dedicated Architecture Cleanup

After feature milestones are complete:    

### ADMIN-09 (Vendor Management) — COMPLETE — Frozen

Features: `VendorRepository` extends `BaseRepository` for vendor CRUD (`getAllVendors`, `getVendorById`, `createVendor`, `updateVendor`, `deleteVendor` with soft-delete via `deleted_at`), direct Supabase calls for `vendor_branches` (`listVendorBranches`, `getVendorBranchById`, `createVendorBranch`, `updateVendorBranch`, `deleteVendorBranch`), `vendor.actions.ts` with role protection and validation, `VendorForm`, `VendorBranchManager`, `/admin/vendors`, `/admin/vendors/new`, `/admin/vendors/[id]/edit`, `/admin/vendors/[id]/branches`.

**Stability hardening:** `src/lib/repositories/base.repository.ts` was corrected after a production/build parsing failure so the repository layer can be imported safely by vendor and other repository consumers.

**2026-08-09 — VENDOR-01 field-mapping correction:** An audit proved `VendorRecord`, `vendorInputSchema`, and the vendor admin UI were reading/writing column names (`business_name`, `user_id`, `gst_number`, `is_approved`, `approved_at`) that never existed on the live `public.vendors` table, which uses `vendor_name`, `vendor_type`, `owner_user_id`, `business_email`, `business_phone`, `gstin`, `pan_number`, `status`. The live table was queried correctly and all 3 existing vendor rows were always returned — only the field mapping was wrong, which is why business names rendered blank while the count was correct. Reconciled `src/lib/repositories/vendor.repository.ts` (`VendorRecord`), `src/app/actions/vendor.actions.ts` (`vendorInputSchema`), `src/components/admin/vendors/VendorForm.tsx`, `src/app/admin/vendors/page.tsx`, and `src/app/admin/vendors/[id]/branches/page.tsx` to the real live column names. No schema/SQL change, no data migration — application-layer mapping only. `owner_user_id` is kept nullable/optional (nullability unverified beyond existing rows having it null) and `status` is validated as a non-empty string with no invented enum (its allowed values are unverified). Existing vendor UUIDs (Golden Sands Hospitality, Grand Palace Hospitality Group, SafarBuddy Holidays Pvt Ltd) untouched. `vendor_branches` and its table/columns were not touched — out of scope for this fix. Hotel `vendor_id` creation gap, `findWithPagination` error, and Google OAuth issue remain separate, unfixed, and intentionally out of scope for this milestone.

- Remove confirmed dead repository tree.
- Remove unused legacy auth helpers.
- Remove stray files.
- Reconcile documentation and source definitions.
- Verify no active imports depend on the files before deletion.

### 3. Final Production Hardening

At the end of the feature roadmap, perform one dedicated final pass covering:

- Image uploads / Storage / RLS
- UUID route handling
- Database schema consistency
- Auth and role guards
- Error boundaries
- Navigation links
- Dead code
- TypeScript
- ESLint
- Production build
- Production deployment verification

**Current strategy:** Do not interrupt upcoming feature milestones for isolated backlog items unless they block the current milestone.

---

## Version History

- **v1** — Reconciled `PROJECT_STATUS.md` with actual repo state. Added AUTH-05, AUTH-06, ADMIN-07 as Completed. Added ADMIN-08 as In Progress with the missing edit route identified. Restructured the file into Completed / Pending / Next Development Phase sections.

- **v2 (2026-08-06 routing audit)** — Verified and moved ADMIN-09 Vendor Management to Completed. Closed ADMIN-08's previously missing edit route. Created missing `/about` and `/contact` pages. Fixed role-protected layout error handling and public-route behavior.

- **v3 (2026-08-07 stability audit)** — Verified TypeScript and ESLint, audited authentication routing, fixed client-side redirects from nonexistent `/auth/login` to `/login`, and documented additional architecture debt.

- **v4 (2026-08-08 auth/database stabilization)** — Fixed role-name normalization in `src/lib/auth/session.ts`, verified live Super Admin access to `/admin`, investigated the live `public.users` schema mismatch, and confirmed that legacy user columns were not part of the active authentication path.

- **v5 (2026-08-08 admin routing/repository hardening)** — Added UUID boundary validation for destination edit/images routes, added reusable UUID validation utility, corrected `base.repository.ts` after a parsing/build failure, and documented image Storage/RLS live verification as remaining production-hardening work. Updated this status file to make Booking/Payment the next major development phase while retaining technical debt and stability items for the final hardening pass.

- **v6 (2026-08-08 BOOKING-01)** — Implemented BOOKING-01: `bookings` table (schema + SQL migration), `BookingRepository`, `booking.actions.ts`, one additive public `getPackageForBooking()` action, customer booking pages (`/hotels/[slug]/book`, `/packages/[id]/book`), customer "My Bookings" (`/dashboard/bookings`), admin bookings management (`/admin/bookings`). Moved Booking from Pending to Completed/Frozen; Payment remains the next milestone.
