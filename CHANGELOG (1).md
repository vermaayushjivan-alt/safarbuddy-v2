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

## Future versions
- v12 — ADMIN-08 completion — Offers edit page
- ADMIN-09 — Vendor Management
- Public marketing pages (/hotels, /destinations, /about, /contact)
- Booking flow
- Payment flow
- Architecture cleanup (dead `src/lib/repository/` duplicate, stray
  `hotel.repository.ts ts` file)
