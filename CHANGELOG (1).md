# CHANGELOG

v1 — HOME-01 completed
v2 — HOME-02 completed
v3 — HOME-03 completed
  Added: Storage fallback, Image fallback, Placeholder logic
v4 — ADMIN-01 — Admin Dashboard
v5 — ADMIN-02 — Hotel CRUD
v6 — ADMIN-03 — Hotel Image Upload, Storage Upload, Primary Image, Gallery, Sort Order, Delete
v7 — ADMIN-04 — Package CRUD
v8 — ADMIN-05 — Package Image Management
v9 — AUTH-05 — Role Based Authentication, Middleware, Protected Routes, Dashboard Guards
v10 — ADMIN-06 — Destination CRUD
  Added: DestinationRepository admin methods (getAllDestinations,
  getDestinationById, createDestination, updateDestination,
  deleteDestination), destination.actions.ts admin actions (Zod +
  requireRole), DestinationForm, /admin/destinations list/new/edit pages.

v11 — Documentation sync (AUTH-05, AUTH-06, ADMIN-07, ADMIN-08 partial)
  This entry groups completed work found in the repository that had not
  yet been recorded in this changelog.
  Added:
  - AUTH-05 — Role Based Authentication: `requireRole()` and session
    helpers (`src/lib/auth/session.ts`, `server.ts`, `client.ts`,
    `route-guards.ts`, `api-guard.ts`); middleware session refresh
    (`middleware.ts`); role-guard layout shells for `dashboard`,
    `hotel-owner`, `travel-agent`, `super-admin`, `vendor`;
    `/unauthorized` page; DB role seed
    (`src/db/sql/002_role_seed_auth05.sql`).
  - AUTH-06 — Public route allowlist in `middleware.ts` for `/hotels`,
    `/destinations`, `/about`, `/contact` (page files for these routes
    do not exist yet — allowlist only).
  - ADMIN-07 — Destination Image Management: `DestinationRepository`
    image methods (list/get/insert/setPrimary/reorder/delete), matching
    admin actions in `destination.actions.ts`,
    `DestinationImageManager` component,
    `/admin/destinations/[id]/images` page.
  - ADMIN-08 (partial) — Offers: `OfferRepository` (full CRUD +
    getActiveOffers), `offer.actions.ts` (Zod + requireRole),
    `OfferForm` (create/edit modes), `/admin/offers` list page,
    `/admin/offers/new` page, homepage `Offers` section wired to
    `getActiveOffers()`.
  Known gap carried into next version:
  - `/admin/offers/[id]/edit/page.tsx` does not exist yet, even though
    the list page links to it and `OfferForm` already supports edit
    mode. See PROJECT_STATUS.md "In Progress".

v12 — ADMIN-08 completion — Offers edit page
v13 — ADMIN-09 — Vendor Management
v14 — BOOKING-01 — Hotel + Package Bookings
  Added:
  - `bookings` table: `src/db/schema.ts` (Drizzle schema/type source of
    truth) + `src/db/sql/003_booking01_schema.sql` (raw SQL, additive,
    CHECK constraints for booking_type/status/num_guests/hotel-package
    XOR rule).
  - `BookingRepository` (`src/lib/repositories/booking.repository.ts`) —
    createBooking, getBookingById, getMyBookings, getAllBookings,
    cancelBooking, confirmBooking, completeBooking. Follows the existing
    BaseRepository + hand-written *Record interface pattern used by
    HotelRepository/PackageRepository.
  - `booking.actions.ts` — Zod-validated Server Actions. Customer:
    createBooking, getMyBookings, getMyBookingById, cancelMyBooking
    (ownership-checked, auth-derived user_id). Admin:
    getAllBookingsAdmin, getBookingByIdAdmin, confirmBookingAdmin,
    cancelBookingAdmin, completeBookingAdmin (requireRole).
  - One additive public action `getPackageForBooking(id)` in
    `package.actions.ts` (no public /packages/[slug] page exists yet,
    so package booking is id-addressed).
  - UI: `/hotels/[slug]/book`, `/packages/[id]/book`,
    `/dashboard/bookings`, `/admin/bookings`. Hotel detail page's
    disabled "Booking coming soon" button now links to the booking
    page. Admin dashboard and ProfileMenu link to the new pages.
  - price_snapshot captured from hotel/package starting_price at
    creation time only, never recalculated afterward. Payment
    explicitly out of scope — booking exists independent of payment.

## Future versions
- Payment flow
- Architecture cleanup (dead `src/lib/repository/` duplicate, stray
  `hotel.repository.ts ts` file)
