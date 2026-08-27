SESSION_HANDOFF.md

Single source of truth for the current session boundary. Read this first if picking up the project without the full ZIP.

Current milestone

BOOKING-02 — Booking Migration Repair. NOT STARTED. This is the top priority before any new feature work. See PROJECT_STATUS.md "Next Development Phase" for the full RULE 15 pre-coding audit (Existing Architecture / Root Cause / Files / Why / Minimal Plan).

Completed this session (2026-08-27 — build-stability audit + launch-readiness planning)

Found and fixed two build-blocking bugs, neither previously logged anywhere:

1. src/lib/notifications/whatsapp.client.ts did not exist on disk, but src/lib/notifications/dispatch.ts imports sendWhatsApp from it — this broke `tsc`/Vercel production builds with "Cannot find module './whatsapp.client'". Fixed: recreated as an inert stub (returns success:false, "provider not configured yet") matching the already-decided no-WhatsApp-provider-yet state from CONTACT-01. Confirmed fixed via tsc --noEmit and a clean Vercel production build.

2. package.json was missing the nodemailer and @types/nodemailer dependencies even though src/lib/notifications/email.client.ts imports nodemailer — this broke Vercel production builds with "Cannot find module 'nodemailer'". Fixed: added both to package.json (nodemailer ^9.0.6, @types/nodemailer ^8.0.1 in devDependencies). Confirmed fixed via a clean Vercel production build.

Separately diagnosed (Cashfree-side, not a code bug): live-mode Cashfree order creation was returning HTTP 401 (confirmed via Vercel function logs: "[Cashfree] Order creation failed: HTTP 401"). Root cause was stale/mismatched production API keys in Vercel and/or a missing redeploy after an env-var change — cashfree.client.ts itself was already correct (reads NEXT_PUBLIC_CASHFREE_ENV / CASHFREE_APP_ID / CASHFREE_SECRET_KEY correctly, correct base URLs, current API version 2023-08-01). Resolved by the user re-entering matched live keys in Vercel and redeploying. Confirmed working with a real live payment.

Found — NOT yet fixed (this is now BOOKING-02, top priority):

Migration 008_room05_booking_room_linkage.sql is referenced as "created for real this time" and required in this file's own prior version, but does not exist anywhere in the delivered repo (only 001, 002, 003, 004, 006, 007, 009 are present in src/db/sql/). booking.repository.ts's createBooking() unconditionally inserts a room_id column. If the live public.bookings table does not have this column, every hotel booking insert fails with a Postgres "column does not exist" error — this would mean bookings have likely been failing in production despite ROOM-05 being marked Frozen. This is a RULE 32 violation (a migration claimed as created must actually exist on disk). Not yet confirmed against the live schema this session — see BOOKING-02 in PROJECT_STATUS.md for the full audit and minimal plan.

Documentation backfill (RULE 40):

CONTACT-01 (hotel contact capture + booking notifications — HotelForm/schema/actions capturing phone/email/website, notifications table, contact-resolution with hotel-then-vendor fallback, admin dashboard alert page, Gmail SMTP email sending) was implemented and functionally verified in an earlier undocumented session, but was never recorded in PROJECT_STATUS.md or CHANGELOG.md until this session. Backfilled into PROJECT_STATUS.md's "Next Development Phase" section.

DOC_DEBT.md created (new file) to formally log all of the above per RULE 40 — see that file for full detail on each item, including two more of the same "claimed but not actually present" pattern (whatsapp.client.ts, package.json).

Four new milestones planned this session, at the user's explicit request, to cover the full hotel-listing-to-automated-payout launch flow. Each has a full RULE 15 pre-coding audit recorded in PROJECT_STATUS.md. None have been started — this is planning/documentation only, no code was written for any of them:

- BOOKING-02 — Booking Migration Repair (fix the migration 008 gap above). No dependencies. Top priority.
- VENDOR-02 — Hotel Owner Payout KYC Capture (bank/UPI + PAN details, Cashfree vendor onboarding). No dependencies.
- PAY-04 — Automated Split Settlement via Cashfree Easy Split (0.1% per split, no monthly/setup fee — confirmed via Cashfree's public pricing). Depends on VENDOR-02.
- CONTACT-02 — Payment-Triggered Notifications (move the CONTACT-01 notification trigger from booking-creation to payment-success). Depends on PAY-04.

Verified this session: TypeScript (tsc --noEmit) clean after all fixes. Two separate clean Vercel production builds (one after each of the two build fixes above). Cashfree live payment confirmed working end-to-end by the user.

Not verified: BOOKING-02's actual live-schema state (whether public.bookings really lacks room_id) — this is the first step of BOOKING-02's minimal plan, not yet performed.

Completed previous session (2026-08-23 — ROOM-05)

Audited against the live schema per RULE 13/15 (user ran information_schema.columns against public.bookings directly). Found two separate, previously undocumented issues:

1. Public read gap: every existing room-related Server Action (room-type.actions.ts, room-price.actions.ts) is requireRole-gated (admin/super_admin/hotel_owner). The public hotel detail page and booking page had no legal way to read hotel_rooms or room_prices, so rooms never rendered and booking always fell back to hotel.starting_price regardless of admin-set room rates.

2. Confirmed production bug: booking.repository.ts's createBooking() has been unconditionally inserting a `room_id` column into public.bookings since an earlier undocumented session, but the live table does not have that column (migration file 008 was referenced in comments but never actually existed in this repo, and was never run). This means every hotel booking attempt — not just room-specific pricing — has been failing with a Postgres "column does not exist" error.

Fixed:
- New public (no-auth) action getBookableRoomsForHotel() in room-type.actions.ts.
- src/app/hotels/[slug]/page.tsx now renders rooms + resolved per-night price.
- src/app/hotels/[slug]/book/page.tsx + BookingForm.tsx: room selection UI, room_id passed through, price computed from the selected room's room_prices/base_price instead of always using hotel.starting_price.
- booking.actions.ts: room_id added to createBookingSchema (optional, hotel-only), price_snapshot now resolved per-room when one is selected.

Claimed but not delivered this session (see DOC_DEBT.md item 2 and BOOKING-02): src/db/sql/008_room05_booking_room_linkage.sql was reported as "created for real this time" but does not actually exist in the repo. This was only discovered in the 2026-08-27 session above.

No ROOM-01–04 admin code touched. No repository method signatures changed except the new getBookableRoomsForHotel addition.

Verified: TypeScript (tsc --noEmit) clean, ESLint clean on all changed files. Production build not run to completion — same sandbox Google Fonts network restriction as every prior session (unrelated to this change).

Hotfix previous session (2026-08-16 — PACKAGE-IMG-01)

Production bug: POST /admin/packages/[id]/images returned a 500 ("An error occurred in the Server Components render") — reported against deployment dpl_HfD7ephHYjsLPT84oj1V7G3cBLWQ.

Root cause found by comparing ADMIN-05 (package images) against the working ADMIN-03 (hotel images) implementation: the five package image Server Actions in package.actions.ts threw raw errors instead of returning the ActionResult<T> safe-result contract used everywhere else in hotel.actions.ts. An uncaught throw across a client-invoked Server Action boundary produces exactly this generic production 500 instead of a catchable client-side error.

Fix: wrapped all five functions (getPackageImagesAdmin, uploadPackageImageAdmin, setPrimaryPackageImageAdmin, reorderPackageImageAdmin, deletePackageImageAdmin) in runAction(), and updated PackageImageManager.tsx to unwrap ActionResult, matching HotelImageManager.tsx exactly. Files changed: src/app/actions/package.actions.ts, src/components/admin/packages/PackageImageManager.tsx. No repository/schema/RLS/Storage config changes.

Not verified: the specific underlying trigger of the original 500 (e.g. package_images table/RLS state in production) — no migration file for package_images exists in this repo to check against, and I have no production DB or Vercel log access.

Room milestone status (as of this session, 2026-08-27)

ROOM-01 room type CRUD — COMPLETE — Frozen.
ROOM-02 room images — COMPLETE — Frozen.
ROOM-03 room rates/pricing — COMPLETE — Frozen.
ROOM-04 room inventory/availability — COMPLETE — Frozen.
ROOM-05 booking-room linkage — COMPLETE — Frozen. Migration gap tracked separately as BOOKING-02 (this does not reopen ROOM-05 itself — the room-linkage code is correct; only the standalone migration file is missing).
No ROOM-06 in scope.

Next action

BOOKING-02 — Booking Migration Repair. See PROJECT_STATUS.md for the full RULE 15 pre-coding audit. First step: verify the live public.bookings schema directly (does it have room_id or not) before writing the migration — per RULE 13, do not proceed on a guess.

After BOOKING-02: VENDOR-02, then PAY-04, then CONTACT-02, in that dependency order (see PROJECT_STATUS.md).

Other pending work

Deferred booking scope.
Architecture cleanup.
Role-based dashboard pages.
Remaining public routes.
Supabase Storage/RLS live verification.
Hotel vendor_id creation gap.
findWithPagination empty-message issue.
Google OAuth unexpected_failure.
tsconfig.json `baseUrl` deprecated (TS5101) — noticed during this session's typecheck, not yet fixed, low priority.

Frozen milestones

HOME-01, HOME-02, HOME-03, ADMIN-01 through ADMIN-10, AUTH-05, AUTH-06, BOOKING-01, PAY-01, PAY-02, PAY-03, ROOM-01, ROOM-02, ROOM-03, ROOM-04, and ROOM-05 are frozen unless a real bug/regression requires reopening. CONTACT-01 is functionally complete (documentation backfilled this session) and treated as frozen in the same sense.

Verification (this session, 2026-08-27)

TypeScript (`npx tsc --noEmit`): PASS, 0 errors (only the pre-existing, unrelated tsconfig.json baseUrl deprecation warning).

Two separate Vercel production builds: PASS, after each of the two build fixes.

Cashfree live payment: confirmed working end-to-end by the user (real live-mode transaction succeeded).

Deployment: READY, but hotel bookings should be assumed broken until BOOKING-02 is confirmed fixed against the live schema.
