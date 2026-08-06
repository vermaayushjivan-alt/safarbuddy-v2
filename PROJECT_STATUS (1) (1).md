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
as public (no session check), plus the `/hotels/*` and `/destinations/*`
dynamic detail routes (added during the 2026-08-06 audit — the original
allowlist only matched the exact `/hotels` and `/destinations` paths).
All four listed pages now exist under `src/app/` — `/about` and
`/contact` were created during the same audit.

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

### ADMIN-08 (Offers) — COMPLETE — Frozen
Features: `OfferRepository` (getActiveOffers, getAllOffers, getOfferById,
createOffer, updateOffer, deleteOffer), `offer.actions.ts`
(Zod-validated, requireRole(['admin','super_admin'])), `OfferForm`
component (supports `create` and `edit` modes), `/admin/offers` list
page, `/admin/offers/new` page, `/admin/offers/[id]/edit` page, public
`getActiveOffers()` wired into the homepage `Offers` section. The
previously-missing edit route now exists and is wired to
`getOfferByIdAdmin` + `OfferForm mode="edit"` with a `notFound()` guard,
mirroring `/admin/destinations/[id]/edit/page.tsx` as planned.

### ADMIN-09 (Vendor Management) — COMPLETE — Frozen
Features: `VendorRepository` (extends `BaseRepository` for vendor CRUD:
getAllVendors, getVendorById, createVendor, updateVendor, deleteVendor
with soft-delete via `deleted_at`; direct Supabase calls for the
`vendor_branches` sub-resource: listVendorBranches,
getVendorBranchById, createVendorBranch, updateVendorBranch,
deleteVendorBranch — mirrors the DestinationRepository/
destination_images pattern from ADMIN-06/07), `vendor.actions.ts`
(Zod-validated, requireRole(['admin','super_admin']) on all 9 actions),
`VendorForm` component (create/edit modes), `VendorBranchManager`
component, `/admin/vendors` list page (with delete), `/admin/vendors/new`
page, `/admin/vendors/[id]/edit` page, `/admin/vendors/[id]/branches`
page. Verified during the 2026-08-06 routing audit — no TODOs/stubs,
all pages wired to real repository-backed actions.

---

## Pending

- Public marketing pages for `/hotels`, `/destinations`, `/about`,
  `/contact` — RESOLVED during the 2026-08-06 routing audit. `/hotels`
  and `/destinations` already existed; `/about` and `/contact` were
  created (server components, Navbar + Footer, no auth required, per
  the AUTH-06 allowlist). Footer/Navbar links that pointed at these
  pages were also fixed from `href="#"` to real routes.
- Booking tables / booking flow — Pending (see DATABASE_BIBLE.md).
- Payment tables / payment flow — Pending (see DATABASE_BIBLE.md).
- Architecture cleanup — Pending, dedicated milestone required (not
  bundled into feature work per RULE 10/11): remove dead
  `src/lib/repository/` (singular, unused duplicate of the active
  `src/lib/repositories/`) and the stray
  `src/lib/repositories/hotel.repository.ts ts` file (note the space).
  See DEVELOPMENT_BIBLE.md "Known architecture debt".
- Role-protected layouts (`admin`, `hotel-owner`, `super-admin`,
  `travel-agent`, `vendor`) previously caught every `requireRole()`
  failure — including a wrong role or an unexpected DB error — and
  redirected to `/` with no explanation. Fixed during the 2026-08-06
  routing audit: unauthenticated now goes to `/login`, wrong role goes
  to `/unauthorized`, and truly unexpected errors now surface via the
  `error.tsx` boundary instead of being silently swallowed.

---

## Next Development Phase

1. Booking flow (tables + actions) — schema not yet designed, must not
   be invented per DATABASE_BIBLE.md RULE 13.
2. Dedicated architecture-cleanup milestone for the duplicate
   repository files flagged above.
3. Public-facing pages still remaining `href="#"` in the footer
   (Flights, Bus, Train, Holiday, Visa, Forex, Careers, Blog, Privacy
   Policy, etc.) have no corresponding routes yet — build the pages
   before wiring the links.

---

## Version History
- v1 — Reconciled PROJECT_STATUS.md with actual repo state. Added
  AUTH-05, AUTH-06, ADMIN-07 as Completed (previously undocumented
  even though built). Added ADMIN-08 as In Progress with the specific
  missing route identified. Restructured file into Completed / In
  Progress / Pending / Next Development Phase sections per
  DEVELOPMENT_BIBLE.md RULE 18. No prior version history was tracked
  before this entry.
- v2 (2026-08-06 routing audit) — Verified and moved ADMIN-09 (Vendor
  Management) from Pending to Completed: the shell-only note was
  stale, full CRUD (repository, actions, pages, form, branch manager)
  already exists and was checked line-by-line. Also found and closed
  out ADMIN-08's previously-missing edit route, so ADMIN-08 moves from
  In Progress to Completed and the "In Progress" section is now empty.
  Created the missing `/about` and `/contact` pages referenced by
  AUTH-06. Fixed the `redirect("/")`-on-any-error bug in all five
  role-protected layouts. See routing audit report (chat) for full
  file-level detail.
