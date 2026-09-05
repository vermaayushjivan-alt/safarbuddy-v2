<!-- ROOT PATH: CHANGELOG.md -->

CHANGELOG.md

All significant SafarBuddy V2 changes are recorded here.

2026-09-05 — VENDOR-03 M1 migration confirmed live

Status: VERIFICATION ONLY — no application code changed.

User ran src/db/sql/011_vendor03_hotel_facilities.sql in the Supabase SQL editor and confirmed via information_schema.columns: public.hotel_facilities (id uuid, code/label/category text, display_order integer, is_active boolean, created_at/updated_at timestamptz) and public.hotel_facility_links (id/hotel_id/facility_id uuid, created_at timestamptz) both exist, all columns matching the migration exactly. VENDOR-03 M1 is now DEPLOYMENT READY per RULE 13/35.

This unblocks M2 (the "List Your Property" public form) for real functional testing for the first time — the form's facility checklist and the property-listing action's facility-link writes had no live table to hit until now. Functional walkthrough (signup → submit with facilities selected → confirm hotel_facility_links rows exist) not yet performed — still needs a real browser session, which this sandbox cannot provide.

Also corrected two stale claims found in PROJECT_STATUS.md while updating it for this: its Next Development Phase summary line still said VENDOR-02's migration was "not yet run" (actually confirmed live 2026-09-03, per that date's entry below) and still listed VENDOR-03 M2 as "not started" despite its own M2 bullet already saying CODE COMPLETE. Both fixed to match what was already stated elsewhere in the same file — see PROJECT_STATUS.md v16.

2026-09-05 — P0.3 Steps 2-5 — Hotel-owner onboarding dashboard

Status: CODE COMPLETE, NOT VERIFIED — same sandbox limitation as every
prior session touching this milestone: no node_modules and no network,
so tsc/eslint could not be run at all this session (RULE 21-23).

Scope decision, since the milestone's own docs never pinned down what
"onboarding wizard page" means beyond the name (Bible Rule 12 — stating
the assumption rather than guessing silently): /hotel-owner now renders
a single status-gated page rather than a literal multi-step wizard —
hotels.status === 'pending' shows a read-only "submitted for review"
screen (Step 5); any other status ('active' | 'inactive' | 'suspended')
shows a property-management form backed by the already-complete
updateMyHotel() from Step 1 (Step 2). One hotel per vendor (matches
getMyHotel()'s existing assumption), so a single page covers both —
no separate onboarding-vs-dashboard routes.

Created:
- src/app/hotel-owner/page.tsx — the first real page this route has
  ever had (layout.tsx was role-gating an empty route since Step 1).
- src/components/owner/OwnerHotelForm.tsx — owner-scoped edit form,
  mirrors admin's HotelForm.tsx but restricted to the fields
  ownerHotelUpdateSchema actually accepts (no vendor_id/status/
  is_featured).

Modified (Step 3 — post-submit session-based redirect):
- src/components/public/PropertyListingForm.tsx — when
  submitPropertyListing() reuses an existing signed-in session
  (ALREADY-AUTH-01, accountCreated: false), the success screen now
  auto-redirects to /hotel-owner instead of just saying "check back
  later" with no way to get there. The accountCreated: true path
  (brand-new account) is NOT auto-redirected — Supabase Auth may still
  require email confirmation before a real session exists (project
  setting, unverified in this sandbox — RULE 13) — but its "Go to
  login" button now carries redirectTo=/hotel-owner so confirmation +
  login lands the owner straight on their new dashboard.

Modified (Step 4 — first-login smart redirect):
- src/actions/auth.ts — loginAction's default landing (no explicit
  ?redirectTo=) now sends a plain hotel_owner (holding no admin/
  super_admin role) to /hotel-owner instead of "/". Explicit
  redirectTo values (e.g. middleware bouncing an unauthenticated
  visit) are unchanged and still take priority.

  Scope note (Bible Rule 7/12): there is no has_logged_in_before
  column or equivalent to distinguish a literal first login from a
  later one, and one was not invented for this. In practice this
  fires on every default-landing login for a hotel_owner, not only
  the first — which is the behavior that actually matters, since a
  plain owner has no reason to land on the public homepage instead of
  their own dashboard on any visit.

DOC_DEBT.md item 6 reopened yet again in this session's delivered zip
("PROJECT_STATUS (1) (1).md") — renamed to canonical filenames a
third time; see DOC_DEBT.md for the recurrence note and a suggestion
to fix this at the export/upload step rather than every session.

Not verified (RULE 21-23): no functional walkthrough — no live
Supabase reachable from this sandbox. Before this milestone is marked
Frozen, someone needs to walk through, for real: (1) submit
list-your-property while already logged in → confirm auto-redirect to
/hotel-owner → confirm the "submitted for review" screen renders with
the right hotel name; (2) have an admin flip that hotel's status to
active → confirm /hotel-owner now shows the editable form and
updateMyHotel() actually saves; (3) log out, log back in as that
hotel_owner with no ?redirectTo → confirm landing on /hotel-owner, not
"/"; (4) confirm an admin/super_admin logging in still lands on "/" as
before (smart redirect must not affect them).

Not in scope, unchanged: admin's approval-queue action itself (flips
pending → active — does not yet exist as a dedicated action beyond the
generic admin hotel-edit form), multi-property support, and room
management UI (owner-room-type/-image actions exist from a prior
session but have no page yet — a separate milestone).

2026-09-03 — Audit session + VENDOR-02 migration confirmed live

Status: DOCUMENTATION + VERIFICATION ONLY — no application code changed.

Audited SESSION_HANDOFF.md/DOC_DEBT.md's claims (items 8, 9) against actual on-disk code — both confirmed accurate. Found and backfilled DOC_DEBT.md item 10: the "P0.3 audit continuation" session was recorded in CHANGELOG.md but never reached SESSION_HANDOFF.md/PROJECT_STATUS.md, which still named VENDOR-03/M2 as current. Also found DOC_DEBT.md item 6 (mangled CHANGELOG/PROJECT_STATUS filenames) had reopened a second time — renamed to canonical filenames again (item 11).

User then ran src/db/sql/010_vendor02_payout_kyc.sql in the Supabase SQL editor and confirmed via information_schema.columns: public.vendor_payout_details is live, all 12 columns match the migration exactly. VENDOR-02 is now DEPLOYMENT READY (per RULE 13/35) — the /admin/vendors/[id]/payout page is safe to rely on.

Still pending: src/db/sql/011_vendor03_hotel_facilities.sql (VENDOR-03/M1) not yet run in production — required before VENDOR-03/M2 (List Your Property) can be functionally tested.

Not verified this session: tsc/eslint (no node_modules, no network in this sandbox) — build-health claims carried forward from prior sessions, not re-run.

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

Found — NOT fixed (logged as BOOKING-02, top priority): src/db/sql/008_room05_booking_room_linkage.sql is referenced elsewhere as created, but does not exist anywhere in the delivered repo. booking.repos
