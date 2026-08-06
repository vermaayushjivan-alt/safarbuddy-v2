# PROJECT_STATUS.md

Single source of truth for SafarBuddy V2 progress. Update existing
entries in place — do not create duplicate milestone headings. See
`## Version History` at the bottom for a log of when this file itself
was revised.

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
Features: `requireRole()` / session helpers (`src/lib/auth/session.ts`,
`server.ts`, `client.ts`, `route-guards.ts`, `api-guard.ts`), middleware
session refresh + public-route allowlist (`middleware.ts`), protected
layout shells with role guards for `dashboard`, `hotel-owner`,
`travel-agent`, `super-admin`, and `vendor` (`layout.tsx` per route,
no pages yet — see Pending), `/unauthorized` page, DB role seed
(`src/db/sql/002_role_seed_auth05.sql`).

### AUTH-06 (Public Route Allowlist) — COMPLETE — Frozen
Middleware recognizes `/hotels`, `/destinations`, `/about`, `/contact`
as public (no session check). **Note:** only the middleware allowlist
entry is confirmed — no corresponding page files exist yet under
`src/app/` for these paths (see Pending). Do not assume the pages are
built from this entry alone.

### ADMIN-06 (Destination CRUD) — COMPLETE — Frozen
Features: Destination CRUD (create/read/update/delete), Repository
extension (getAllDestinations, getDestinationById, createDestination,
updateDestination, deleteDestination), Server Actions (Zod-validated,
requireRole(['admin','super_admin'])), Destination Form, Destination
list/new/edit admin pages.

### ADMIN-07 (Destination Image Management) — COMPLETE — Frozen
Features: `DestinationRepository` image methods (listDestinationImages,
getDestinationImageById, insertDestinationImageRow,
setPrimaryDestinationImage, updateDestinationImageSortOrder,
deleteDestinationImageRow), matching admin actions in
`destination.actions.ts` (getDestinationImagesAdmin,
uploadDestinationImageAdmin, setPrimaryDestinationImageAdmin,
reorderDestinationImageAdmin, deleteDestinationImageAdmin),
`DestinationImageManager` component, `/admin/destinations/[id]/images`
page. Mirrors the ADMIN-03/ADMIN-05 image-management pattern.

---

## In Progress

### ADMIN-08 (Offers) — IN PROGRESS
Backend and most of the frontend are built; one route is missing.
- Done: `OfferRepository` (getActiveOffers, getAllOffers, getOfferById,
  createOffer, updateOffer, deleteOffer), `offer.actions.ts`
  (Zod-validated, requireRole(['admin','super_admin'])), `OfferForm`
  component (supports `create` and `edit` modes),
  `/admin/offers` list page, `/admin/offers/new` page, public
  `getActiveOffers()` wired into the homepage `Offers` section.
- Missing: `/admin/offers/[id]/edit/page.tsx`. The list page already
  links to `/admin/offers/{offer.id}/edit` and `OfferForm` already
  accepts an `edit` mode + `offer` prop — the edit route itself has not
  been created yet, so that link currently 404s.
- Next step: add the edit page (should mirror
  `/admin/destinations/[id]/edit/page.tsx`), reusing
  `getOfferByIdAdmin` + `OfferForm mode="edit"`.

---

## Pending

- ADMIN-09 — Vendor Management — Pending. Only a role-guard shell
  exists (`src/app/vendor/layout.tsx`); no vendor CRUD pages, actions,
  or repository methods beyond the DB-01 `vendors` /
  `vendor_branches` tables.
- Public marketing pages for `/hotels`, `/destinations`, `/about`,
  `/contact` — Pending. Referenced in `middleware.ts`'s public-route
  allowlist (AUTH-06) but no page files exist yet.
- Booking tables / booking flow — Pending (see DATABASE_BIBLE.md).
- Payment tables / payment flow — Pending (see DATABASE_BIBLE.md).
- Architecture cleanup — Pending, dedicated milestone required (not
  bundled into feature work per RULE 10/11): remove dead
  `src/lib/repository/` (singular, unused duplicate of the active
  `src/lib/repositories/`) and the stray
  `src/lib/repositories/hotel.repository.ts ts` file (note the space).
  See DEVELOPMENT_BIBLE.md "Known architecture debt".

---

## Next Development Phase

1. ADMIN-08 completion — add the missing `/admin/offers/[id]/edit` page.
2. ADMIN-09 — Vendor Management (CRUD for `vendors` / `vendor_branches`).
3. Public marketing pages (`/hotels`, `/destinations`, `/about`, `/contact`).
4. Booking flow (tables + actions) — schema not yet designed, must not
   be invented per DATABASE_BIBLE.md RULE 13.
5. Dedicated architecture-cleanup milestone for the duplicate
   repository files flagged above.

---

## Version History
- v1 (this sync) — Reconciled PROJECT_STATUS.md with actual repo state.
  Added AUTH-05, AUTH-06, ADMIN-07 as Completed (previously undocumented
  even though built). Added ADMIN-08 as In Progress with the specific
  missing route identified. Restructured file into Completed / In
  Progress / Pending / Next Development Phase sections per
  DEVELOPMENT_BIBLE.md RULE 18. No prior version history was tracked
  before this entry.
