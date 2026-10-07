# DEVELOPMENT_BIBLE.md (v2)

Supersedes v1. v1's core rules are preserved below unchanged in spirit —
v2 adds the categories v1 never covered (testing, security, secrets,
migration safety, performance, monitoring, and a real Definition of
Done). This file governs `safarbuddy-v2`. `DATABASE_BIBLE.md` governs
schema-level rules and cross-references several rules here.

Changelog of this file itself:
- v2 (2026-08-27) — added RULE 21–38 after an audit found an entire
  undocumented milestone (CONTACT-01) shipped with a build-breaking
  missing dependency and an undocumented required env var, none of
  which v1 had any rule to catch.
- v2.1 (2026-10-07) — appended Section L, the GO-LIVE roadmap
  (GOLIVE-00 to GOLIVE-21 plus go/no-go gate), derived from the full
  technical due-diligence audit. No existing rule changed.

---

## A. Core Engineering Rules (v1, unchanged)

RULE 1 — Never create duplicate code.
RULE 2 — Always inspect existing implementation before writing new code.
RULE 3 — Repository = Data Layer only. No business logic, no auth checks.
RULE 4 — Server Action = Validation + Auth + Business Logic.
RULE 5 — Always use Zod for input validation.
RULE 6 — Always use requireRole() for protected actions.
RULE 7 — Never invent schema. If a column's existence or shape is
  unknown, confirm against the live database first.
RULE 8 — Never invent enums.
RULE 9 — Reuse existing architecture/patterns rather than introducing
  a new one for the same kind of problem.
RULE 10 — Never modify a completed (Frozen) milestone unless it's a
  confirmed bug or regression.
RULE 11 — One milestone at a time. Do not blend scope across
  milestones without explicit sign-off.
RULE 12 — No assumptions. If intent or requirement is ambiguous, stop
  and ask rather than guessing.
RULE 13 — If schema is unknown → STOP. Do not proceed on a guess.
RULE 14 — Inspect first, always, even for "small" changes.
RULE 15 — Before coding, always provide: Existing Architecture, Root
  Cause, Files, Why, Minimal Plan.
RULE 16 — See Section F (Definition of Done) — this replaces v1's
  original checklist, which only required Files/Build/TypeScript
  status and did not catch CONTACT-01's failure mode.
RULE 17 — Always update CHANGELOG.md.
RULE 18 — Always update PROJECT_STATUS.md.
RULE 19 — Never skip self-review before declaring a milestone done.
RULE 20 — Completed milestones become Frozen (see RULE 10).

---

## B. Testing & Verification

RULE 21 — "Verified" means more than `tsc`/`eslint` passing. Every
  milestone that touches a user-facing flow (booking, payment, auth,
  notifications) requires a documented manual functional walkthrough
  — the actual steps taken and actual result — recorded in
  SESSION_HANDOFF.md, not just a green build.

RULE 22 — Payment and booking mutation paths (anything that writes to
  `bookings`, `payments`, or triggers a notification) require an
  end-to-end walkthrough — real request through the real UI or a
  script hitting the real Server Action — before the milestone is
  marked Frozen. A clean `tsc --noEmit` does not catch a missing
  runtime dependency (this is exactly how CONTACT-01 shipped broken).

RULE 23 — When a milestone cannot be fully walked through in the
  current environment (e.g. sandboxed network, missing prod
  credentials), that gap must be named explicitly in SESSION_HANDOFF
  as "Not verified: X" — never silently omitted, and never implied to
  be covered by a passing typecheck.

---

## C. Security

RULE 24 — Every new table gets Row Level Security enabled, and its
  policy is documented in `DATABASE_BIBLE.md` in the same session that
  creates the table — before any client or Server Action code reads
  or writes it.

RULE 25 — Any user-supplied string that ends up in an email, WhatsApp
  message, or other rendered/sent output (e.g. guest name, special
  requests) must be treated as untrusted: escape/sanitize before
  interpolating into HTML or templates.

RULE 26 — Any inbound webhook (payment provider, future integrations)
  must verify its signature before the payload is trusted or acted
  on. No processing happens on an unverified webhook body.

RULE 27 — Role/permission checks are server-side only. A client-side
  role check is a UX convenience, never a security boundary — every
  Server Action re-verifies via `requireRole()` regardless of what the
  UI already checked (this is already the pattern; this rule makes it
  explicit and non-negotiable).

RULE 28 — Ownership checks (e.g. `verifyRoomOwnership`) are required
  on every mutation where a row belongs to a specific vendor/hotel —
  a `hotel_owner` role must never be able to mutate another hotel's
  data by role alone; the specific row's ownership is always checked.

---

## D. Secrets & Environment Variables

RULE 29 — Any new environment variable is added to `.env.example`
  *and* to `serverEnvSchema`/`clientEnvSchema` in `src/lib/config/env.ts`
  in the same session that introduces code depending on it. Code that
  reads `process.env.X` directly without `X` existing in both places
  is treated as incomplete, not done — regardless of typecheck status.

RULE 30 — For every third-party integration (payment, email, WhatsApp,
  future ones), document in code comments and in PROJECT_STATUS: (a)
  what happens if its credentials are missing — fails loud, fails
  silent-but-logged, or feature is gated off — and (b) its current
  status: active / interim-provider / deferred-no-provider-chosen.

RULE 31 — Real secrets never get committed. `.gitignore` coverage for
  `.env*` is verified at the start of any session that touches env
  config, not assumed.

---

## E. Migration Safety

RULE 32 — A migration file claimed as "created" in SESSION_HANDOFF or
  CHANGELOG must actually exist in `src/db/sql/` in the delivered
  state of the repo. A session never ends with a migration referenced
  in prose but absent from disk (this exact failure happened with
  `008_room05_booking_room_linkage.sql`).

RULE 33 — Migrations are idempotent where practical (`IF NOT EXISTS` /
  `IF EXISTS` guards) so a migration can be safely re-run if its
  "was this actually applied in production?" status is uncertain.

RULE 34 — Before running a destructive change against production
  (`DROP COLUMN`, `DROP TABLE`, data-mutating `UPDATE`/`DELETE`
  migrations), CHANGELOG.md gets an explicit pre-run note: what's
  being dropped/changed, and confirmation that the person running it
  has read it. No destructive migration is run silently.

RULE 35 — After any manually-run migration, SESSION_HANDOFF.md is
  updated to say whether it has been confirmed run against production
  — "not yet confirmed run" is an acceptable state, but it must be
  stated, not left ambiguous.

---

## F. Performance & Scale

RULE 36 — List/table-reading queries expected to grow (bookings,
  rooms, prices, images) are paginated or otherwise bounded. No
  unbounded `select *` on a table with unbounded growth.

RULE 37 — No N+1 query patterns — a loop that issues one Supabase
  call per iteration over a list is flagged and batched/joined instead
  before a milestone is marked done.

---

## G. Monitoring & Observability

RULE 38 — A `catch` block that swallows an error and continues (e.g.
  "must never throw into the caller") must still `console.error` (or
  equivalent) with enough context — which entity, which operation — to
  diagnose from logs later. A silent catch with no logging is not
  acceptable, even when the design intentionally prevents the error
  from propagating.

RULE 39 — Failures on critical paths (payment webhook, booking
  insert, notification dispatch) get a `// TODO: alerting` marker
  where a real alerting integration (Sentry or similar) would
  eventually hook in. Building the alerting system itself is out of
  scope until explicitly milestoned, but the hook points are marked as
  they're written, not retrofitted later.

---

## H. Documentation Debt Register

RULE 40 — If, during any session, code is discovered in the repo that
  implements a real feature but has no corresponding entry in
  PROJECT_STATUS.md/CHANGELOG.md/SESSION_HANDOFF.md, it is not adopted
  silently as "already done." It is logged immediately in
  `DOC_DEBT.md` (create if absent) with: what the code does, what
  files, and an explicit status of "undocumented — needs a backfill
  session or a removal decision." This is what should have caught
  CONTACT-01 the moment it was written.

---

## F2. Definition of Done (replaces v1 RULE 16)

A milestone is only marked Frozen when ALL of the following are true
and recorded in SESSION_HANDOFF.md:

1. Files Modified / Files Created — explicit list.
2. TypeScript (`tsc --noEmit`): PASS/FAIL.
3. ESLint: PASS/FAIL.
4. Functional walkthrough: what was manually tested end-to-end, and
   the actual result — not just "should work."
5. New environment variables, if any: confirmed present in both
   `.env.example` and the Zod env schema (RULE 29).
6. New tables, if any: RLS enabled and policy documented (RULE 24).
7. New/claimed migration files: confirmed to exist on disk (RULE 32)
   and their production-run status stated (RULE 35).
8. Pending Issues — anything knowingly deferred or unverified.
9. PROJECT_STATUS.md and CHANGELOG.md updated in the same session
   (RULE 17/18) — not deferred to "later."

If any of 1–9 cannot be completed (e.g. sandbox can't reach a live
service), that item is explicitly marked "not verified — reason X,"
never silently skipped.

---

## J. INVOICE-01 — Invoices/Vouchers (RULE 15 audit, 2026-09-17)

**Product scope decision (from user, this session):** Invoice and
voucher are ONE document, not two — no separate payment-proof vs
check-in-slip split. Delivery: both a downloadable PDF and a web page
(the web page is the source of truth the PDF renders from). Trigger:
generated on payment success, i.e. inside the same Cashfree webhook
handler CONTACT-02 already uses (`src/app/api/public/cashfree/webhook/route.ts`,
after `bookingRepo.confirmBooking()`), not at booking-creation and not
admin-manual.

**Existing Architecture:** `bookings` already has `price_snapshot`
(the actual charged amount — see COUPON-01 finding, discount is baked
in there already), guest/customer contact fields (BOOKING-03),
`room_id`/hotel/vendor linkage. `payments` (PAY-01) has the Cashfree
transaction record. CONTACT-02 already fires a notification from the
webhook post-confirmation — the invoice generation point is the same
call site. No PDF-generation library exists in package.json yet.

**Root cause / Gap:** No invoice/voucher record exists anywhere;
nothing to view or download after a booking is paid for.

**Files (planned, for Step 2/3 — not created yet):**
- `src/db/sql/0XX_invoice01_invoices.sql` — new `public.invoices` table
  (booking_id FK, invoice_number, snapshot of amounts/guest/hotel
  fields at generation time — don't join-compute on every view, since
  hotel/room data can change later), RLS enabled + policy.
- PDF library decision needed at Step 2: `@react-pdf/renderer` (pure
  JS, works in Vercel serverless, no headless Chromium) is the
  front-runner — to be confirmed, not assumed, when Step 2 starts.
- Repository + Server Action to create the invoice row + render both
  the web page and the PDF from one shared template.
- Webhook route (`cashfree/webhook/route.ts`) modified to call invoice
  creation right after `confirmBooking()`.
- Customer-facing route (e.g. `/booking-confirmation/[id]/invoice` or
  a link from My Bookings) for the web view + PDF download.
- Admin view: list + link from `/admin/bookings` detail (no separate
  admin generation UI needed, since it's always auto-generated).

**Minimal Plan:** Step 2 (next session) starts with confirming the PDF
library choice and writing the migration only — no other code — per
this project's usual one-step-at-a-time pattern.

---

## I. Planned Milestones — Owner Self-Service Expansion (added 2026-09-17)

Three-part plan, recorded here per RULE 15 (pre-coding audit) BEFORE any
of this is built, so no future session starts coding blind or
duplicates what's already decided. All three share one dependency
order: OWNER-DASH-01 first (it's the shell the other two live inside),
then OFFERS and CALENDAR can be built in either order.

None of this is started. Status on every item below is PLANNED — NOT
STARTED until a session's own SESSION_HANDOFF entry says otherwise.

### I.1 OWNER-DASH-01 — Unified Owner Portal (prerequisite for I.2/I.3)

**Existing Architecture:** Owner-facing pages exist today at three
unrelated routes with no shared navigation: `/hotel-owner` (property
details form, via `owner-hotel.actions.ts`), `/vendor/bookings`
(read-only bookings, `vendor-booking.actions.ts`), `/vendor/payments`
(settlement history). `requireOwnerVendor()` (owner-context.ts) is
already the single source of truth for "which vendor does this
signed-in hotel_owner own" and is reused by every owner action file.
Room type/image management (`owner-room-type.actions.ts`,
`owner-room-image.actions.ts`) has server actions but **no page at
all** — not reachable from any owner-facing route today.

**Gap:** No single place an owner lands, no shared nav between
property/rooms/offers/bookings/payouts, no completeness signal. A
brand-new self-service owner (VENDOR-03) has no way to reach room
management even though the backend already supports it.

**Files (planned):**
- `src/app/hotel-owner/layout.tsx` (modify) — add shared nav: Property,
  Rooms & Pricing, Offers, Bookings, Payouts.
- `src/app/hotel-owner/rooms/page.tsx` (new) — room list, links into
  per-room type/images/pricing/availability (reuses existing
  `owner-room-type.actions.ts` / `owner-room-image.actions.ts` — see
  I.3 for the two still-missing action files this section depends on).
- `src/app/hotel-owner/bookings/page.tsx` (new, moved from
  `/vendor/bookings`) and `src/app/hotel-owner/payouts/page.tsx` (new,
  moved from `/vendor/payments`) — same components/actions, new route
  only. `/vendor/*` becomes a redirect to the new routes, not a second
  copy (RULE 1).
- `src/app/hotel-owner/page.tsx` (modify) — becomes a summary/overview
  with a completeness indicator (property details filled? ≥1 room
  added? ≥1 photo uploaded? payout details set?), each item linking
  into its section.

**Why:** RULE 1/9 (move, don't duplicate, `/vendor/*` logic) and RULE
28 (every section still gates through the existing
`requireOwnerVendor()`/`assertHotelOwnedByVendor()` pair — no new
authorization pattern needed here, only navigation/layout).

**Minimal Plan:** 1) add shared layout nav, 2) build `rooms` list page
wired to existing owner room actions, 3) move bookings/payments pages
under `/hotel-owner`, redirect old routes, 4) add the overview/
completeness page. tsc/eslint clean, then a real hotel_owner login
walkthrough (RULE 21) before Frozen.

### I.2 OFFERS-01 — Owner Self-Service Discounts

**Existing Architecture:** `public.coupons` (migration 014) already
has `scope` (`'global'|'vendor'`) + `vendor_id`, `discount_type`
(`percentage|flat`), `max_discount_amount`, `min_booking_amount`,
`valid_from`/`valid_until`, `is_active`. `CouponRepository` and the
discount-resolution logic (`src/lib/coupons/coupon-discount.ts`) are
already correct and live-verified. `coupon.actions.ts` today only
exposes **admin-gated** CRUD (`requireRole(['admin','super_admin'])` +
`createServiceRoleClient()` — RLS-enabled-no-policy on `coupons`, same
as `vendor_settlements`). Note: `public.offers` (ADMIN-08) is a
*separate, unrelated* sitewide-banner table (title/image/free-text
discount, no `vendor_id`) — do not confuse the two or attempt to reuse
`offers` for this milestone.

**Gap:** No self-service path for a `hotel_owner` to create/manage
their own coupon. The data layer is already right; only an
owner-scoped authorization wrapper is missing — building a parallel
discount system would violate RULE 1/9.

**Files (planned):**
- `src/app/actions/owner-coupon.actions.ts` (new) — `createOwnerCoupon`,
  `updateOwnerCoupon`, `setOwnerCouponActive`, `listOwnerCoupons`. Every
  call resolves `vendor_id` via `requireOwnerVendor()` server-side —
  never accepted from the client. `scope` is hardcoded to `'vendor'`;
  an owner can never create a `scope='global'` coupon (admin-only,
  RULE 6/27). Every read/update additionally checks the fetched
  coupon's `vendor_id` matches the caller's resolved vendor (ownership
  check, same shape as `assertHotelOwnedByVendor`, RULE 28).
- `src/components/owner/OwnerCouponManager.tsx` (new) — list + create/
  edit form, following the existing admin `/admin/coupons` UI pattern.
- `src/app/hotel-owner/offers/page.tsx` (new) — hosted inside
  OWNER-DASH-01's nav as the "Offers" section, not a standalone route.
- No schema/migration change.

**Why:** RULE 1/9 (reuse `coupons` table + `CouponRepository` exactly,
add only an authorization layer) and RULE 28 (server-side ownership
check on every mutation).

**Minimal Plan:** 1) `owner-coupon.actions.ts`, mirroring
`owner-room-type.actions.ts`'s ownership-check shape, 2)
`OwnerCouponManager.tsx`, 3) wire into the Offers tab, 4) tsc/eslint
clean, then a live walkthrough — a real hotel_owner creates a coupon
and a real checkout applies it (RULE 21/22, this touches the
booking-discount path) — before Frozen.

### I.3 CALENDAR-01 — Owner Room Availability Calendar + Pricing

**Existing Architecture:** `public.room_inventory` (ROOM-04, confirmed
live) stores per-room-per-date `total_rooms`/`available_rooms`/
`blocked_rooms`/`booked_rooms`. `RoomInventoryRepository` already has
`getInventoryForRange()`, `setInventoryForDate()` (refuses to drop
`total_rooms` below already-booked rooms for that date — never
invalidates an existing booking), `deleteInventoryForDate()`, and an
ownership check (`verifyRoomOwnership()` — the `owner_user_id` bug in
this method was already fixed, see DOC_DEBT.md item 9).
`room-inventory.actions.ts` exposes single-date AND
`bulkSetInventoryAction()` (date-range bulk update), all admin-gated
today. Admin already has a full working UI —
`src/components/admin/rooms/RoomInventoryManager.tsx`, at
`/admin/hotels/[id]/rooms/[roomId]/availability` — but it is a
**list/table view with a date-range picker**, not a calendar grid.
`room-price.repository.ts` / `room-price.actions.ts` (ROOM-03, per-date
price overrides) is the same shape, also admin-only today. Neither has
an owner-scoped counterpart — `owner-room-inventory.actions.ts` and
`owner-room-price.actions.ts` do not exist yet (only
`owner-room-type.actions.ts` and `owner-room-image.actions.ts` do).

**Gap:** Same shape as OFFERS-01 — correct, tested business rules
already exist on the admin side; only an owner-scoped authorization
wrapper and a genuinely calendar-shaped UI are missing (no calendar
grid component exists anywhere in the codebase yet — building a real
one, not another table, is the point of this milestone per the
project owner's explicit "advanced/professional" request).

**Files (planned):**
- `src/app/actions/owner-room-inventory.actions.ts` (new) — owner-scoped
  mirror of `room-inventory.actions.ts`, reusing
  `RoomInventoryRepository`, gated by `assertHotelOwnedByVendor()` per
  room (same pattern as `owner-room-type.actions.ts`).
- `src/app/actions/owner-room-price.actions.ts` (new) — same pattern
  for `RoomPriceRepository`.
- `src/components/owner/RoomAvailabilityCalendar.tsx` (new) — a real
  month-grid: each day cell shows available/total/booked for the
  selected room, click-to-edit a single date, "apply to range" for
  bulk edits (owner-scoped counterpart of `bulkSetInventoryAction`),
  and the per-date price override editable in the same cell — inventory
  + pricing managed together per date, not two separate screens (this
  is the upgrade over admin's current table view).
- `src/app/hotel-owner/rooms/[roomId]/calendar/page.tsx` (new) — one
  calendar per room, linked from OWNER-DASH-01's "Rooms & Pricing"
  section.
- No schema/migration change — reuses `room_inventory`/`room_prices`
  exactly as they are.

**Why:** RULE 1/9 (reuse both repositories exactly, no new inventory
system), RULE 28 (per-room ownership check, not just per-role), RULE 36
(one bounded `getInventoryForRange()` call per month view, never
per-day).

**Minimal Plan:** 1) `owner-room-inventory.actions.ts` and
`owner-room-price.actions.ts`, mirroring `owner-room-type.actions.ts`'s
ownership-check shape, 2) `RoomAvailabilityCalendar.tsx` as a real
calendar grid, 3) wire into "Rooms & Pricing", one calendar per room,
4) tsc/eslint clean, then a live walkthrough — a real hotel_owner
blocks/unblocks dates and changes a price, and a test booking respects
both (RULE 21/22, this touches booking-affecting inventory) — before
Frozen.

---

## K. CONTACT-03 — Booking Contact Capture + Admin Payment Notification (RULE 15 audit, 2026-09-18)

**Root cause:** Two gaps found on inspection, both in the confirmed-payment
path. (1) `BookingForm.tsx` only collected `guest_name`/`guest_email`/
`guest_phone` when `!isAuthenticated`; a signed-in booking sent all three
as `null` and the notification/invoice paths fell back to the (possibly
stale, possibly a different person's) `public.users` profile instead of a
booking-time-confirmed contact. (2) `notifyBookingCreated()` (CONTACT-02)
only ever notified the hotel/vendor; there was no admin email channel at
all — only a silent `'dashboard'` row, and `notifications.recipient_type`'s
CHECK constraint didn't even allow `'admin'` as a value. A latent bug
compounded this: the function `return`ed early when no hotel/vendor
contact resolved, which — before this fix — would also have skipped any
future admin-alert code placed after it.

**Existing Architecture:** `bookings.guest_name/guest_email/guest_phone`
(BOOKING-03, migration 012) already exist and are nullable regardless of
`customer_id` — the `bookings_customer_or_guest_check` constraint only
requires them when `customer_id` is null, it never forbids populating
them otherwise. `ADMIN_NOTIFICATION_EMAIL` already exists in
`.env.example` and is already used by
`property-listing.actions.ts` for its own admin alert — same pattern
reused here (RULE 9), no new env var.

**Files changed:**
- `src/app/actions/booking.actions.ts` — `guest_name`/`guest_phone` now
  required and stored for every booking, not gated on `authUser`. Email
  stays guest-only (a signed-in user already has one on `public.users`).
- `src/components/booking/BookingForm.tsx` — Full name + Phone fields
  now always rendered/required; Email field stays guest-only.
- `src/lib/notifications/dispatch.ts` — `buildEmailHtml()` now includes
  the guest's phone/email when present; new `buildAdminEmailHtml()` +
  an admin alert block (`ADMIN_NOTIFICATION_EMAIL`, dashboard row +
  email) that runs unconditionally, fixing the early-`return`-skips-admin
  bug described above.
- `src/lib/repositories/notification.repository.ts` —
  `NotificationRecipientType` widened to `'hotel' | 'vendor' | 'admin'`.
- `src/app/api/public/cashfree/webhook/route.ts` —
  `notifyBookingCreated()` call now also passes `guestEmail`/`guestPhone`.
- `src/db/sql/016_contact03_admin_notify.sql` (new) —
  `notifications.recipient_type` CHECK widened to include `'admin'`;
  comment-only update on `bookings.guest_name/guest_email/guest_phone`
  to reflect they're now captured for every booking.

**Why:** Same call site and same "fire once, never throw" contract
CONTACT-02 already established — no new trigger point, no change to
`dispatch.ts`'s never-throw guarantee. No new env var (RULE 9). No
invoice-recipient-resolution change (`generate-invoice.ts`'s
`resolveRecipient()` untouched) — that still prioritizes `customer_id` →
`public.users`, which is a separate, not-yet-asked-for product decision
about what an invoice should show, left alone per RULE 11 (one milestone
at a time).

**Not verified:** This session's sandbox has network disabled — `npm
install`/`tsc --noEmit`/`eslint` could not be run for real (unlike prior
sessions, where SESSION_HANDOFF.md records them running clean). Every
changed file was manually re-read end to end instead, including
cross-checking `NotificationRecipientType`'s literal union against the
new `'admin'` value written by `dispatch.ts` (this is exactly the kind
of mismatch `tsc` would normally catch — caught by inspection here, but
still flagged as NOT INDEPENDENTLY VERIFIED by the toolchain). Run
`tsc --noEmit` and `eslint` for real before calling this Frozen, then a
live walkthrough — a real booking (signed-in) followed by a real
Cashfree payment — confirming both the hotel and the admin actually
receive the email (RULE 21/22, this touches the payment-confirmation
notification path). Migration 016 has not been run in production
either — same "user reports run, confirm via information_schema" caution
as every other migration in this project (RULE 35).

**Addendum (same day, live failure + correction):** Running migration
016 v1 against production failed with
`ERROR 42703: column "recipient_type" does not exist`. Inspecting the
live table via `information_schema.columns` (user ran it) showed
`public.notifications` already exists for a completely unrelated,
pre-existing feature — a generic per-user notification feed
(`user_id, channel, notif_type, title, message, metadata jsonb,
is_read, ...`), not referenced anywhere else in this codebase
(confirmed by grep). Migration 009 was therefore never actually
applicable in production — this is the same class of naming collision
DOC_DEBT.md item 15 already documented for
`014_coupon01_coupons.sql`'s legacy `coupons` table. Corrected: 016 v2
creates a dedicated `public.booking_notifications` table instead of
touching `public.notifications`, and `notification.repository.ts`'s
`tableName` (plus its one raw `.from('notifications')` call in
`countUnreadDashboardNotifications()`) now points at
`booking_notifications`. `009_contact01_notifications.sql` and
`DATABASE_BIBLE.md`'s Migration Registry were both annotated to flag
009 as superseded/do-not-run. Not yet run/confirmed in production
after this correction.

---

## L. GO-LIVE Roadmap — Path to 100% Launch Ready (added 2026-10-07)

Source: full technical due-diligence audit of the codebase on 2026-10-07
(report: SafarBuddy_Technical_Due_Diligence_Report.md). This section is
the single ordered checklist for taking SafarBuddy from "feature complete,
not verified" to "safe to take real money". Recorded here per RULE 15
BEFORE any of it is built.

Status of every item below is **PLANNED — NOT STARTED** until a
SESSION_HANDOFF.md entry says otherwise. RULE 11 applies: one milestone at
a time, in the order given. RULE 10 applies: touching a Frozen milestone
is allowed only where the item below says it fixes a confirmed defect.
Every milestone must meet Section F2 (Definition of Done). Milestones that
touch payments/bookings (GOLIVE-01 to 07) must also meet RULE 22.

Audit verdict at time of writing: ~55% launch ready. Code structure is
sound (strict TS, 0 `any`, clean repository/action layering). The blockers
are money-path edge cases, inventory, refunds, RLS proof, and store/legal
compliance. Everything is fixable; nothing needs a rewrite.

### L.0 Owner decisions needed BEFORE the milestone that depends on them (RULE 12)

| # | Decision | Needed by | Recommendation |
|---|---|---|---|
| D1 | Guest checkout: keep or remove? Today a guest can create a booking but cannot pay (payment requires login). | GOLIVE-06 | Launch with **login required to book**. Re-add guest pay later with a signed pay-link. |
| D2 | Rate limiting beyond CAPTCHA was deliberately NOT built (LAUNCH-02). This roadmap proposes limits on 3 endpoints only (AI chat, booking create, contact) to stop cost abuse and inventory spam. | GOLIVE-10 | Approve. Small scope, DB or Upstash based. |
| D3 | Gmail SMTP stays until ~200 bookings/month (owner, LAUNCH-02). Gmail caps ~500/day and sends from a personal-looking address. | GOLIVE-15 | Keep for soft launch; move to a domain email before any paid marketing. |
| D4 | Refund mode: refund is admin-initiated (policy: 7 days after approved cancellation). | GOLIVE-07 | Keep admin-initiated. No auto-refund at launch. |
| D5 | Grievance Officer name/phone/email (block still empty). | GOLIVE-13 | Owner supplies. |
| D6 | WhatsApp provider (AiSensy/other, paid) or SMS (DLT registered). | GOLIVE-16 | Choose one. If none, launch email-only and state it in the Terms. |
| D7 | Native app (Play Store) at launch, or PWA-only? | GOLIVE-12/13 | PWA-only at launch removes store deletion deadlines but keep deletion anyway (DPDP). |
| D8 | Which Vercel plan? Vercel Cron on Hobby runs once a day at most; a `*/5` schedule fails the deploy. | GOLIVE-03 | Pro: copy `vercel.json.example` to `vercel.json`. Hobby: skip it and call the endpoint every 5 min from a free scheduler (cron-job.org) with header `Authorization: Bearer <CRON_SECRET>`. |

### L.1 PHASE 0 — Baseline and truth (do first, 1-2 days)

#### GOLIVE-00 — Sync repo with documented state

**Why:** The audited ZIP contradicts our own docs. CHANGELOG LAUNCH-01 says
these were deleted, but they are still in the ZIP: root `.env` (it is a stale
copy of `env.ts`, not secrets), `home.ts`, `next.config (2).ts`, `gitignore`,
root `components/`, root `lib/`, `src/lib/data/home.ts`, and
`src/lib/repositories/hotel.repository.ts ts`. CHANGELOG LAUNCH-02 says a
Grievance Officer block was added to `LegalPage.tsx`; no such code exists
(`grep -i grievance src` returns nothing).

**Steps:**
1. In GitHub, confirm which state `main` really has. If GitHub is correct and only the ZIP is stale, record that and skip deletions.
2. Delete the stray files listed above. Add `028_referral01_referrals.sql` to `src/db/sql/` (it sits in the repo root).
3. Run `npm ci`, `npm run typecheck`, `npm run lint`, `npm run build`. Fix whatever fails. Record real results (RULE 21).
4. Re-apply the LAUNCH-02 Grievance block if it is genuinely missing.
5. Resolve the open `middleware.ts` location question (SESSION_HANDOFF, LAUNCH-01 risk A): the project uses `src/app`, and Next.js looks for middleware next to `app`, so the file at the repo root may be IGNORED, which would disable the login redirect and session refresh in it. Test on the deployed site: open `/dashboard` logged out and confirm it redirects to `/login`. If it does not, move the file to `src/middleware.ts` (or `src/proxy.ts` on Next 16).

**Done when:** `tsc`, `eslint`, `next build` all PASS on a clean clone, and the repo root contains only intended files.

#### GOLIVE-00b — Reproducible database baseline

**Why:** Only 12 tables are created by `src/db/sql/*`; the app uses 22+
(`hotels`, `hotel_rooms`, `room_inventory`, `room_prices`, `users`, `vendors`,
`packages`, `destinations`, `offers`, `referrals`, `booking_messages`, ...).
Migrations 005 and 017-023 are missing from the repo. The schema cannot be
rebuilt from code (breaks RULE 32 and disaster recovery).

**Steps:**
1. `pg_dump --schema-only --no-owner` the production DB. Save as `src/db/sql/000_baseline.sql`.
2. Recover or re-create 005 and 017-023 from SESSION_HANDOFF / the live DB. Mark any lost one in DATABASE_BIBLE.md Migration Registry.
3. Confirm 028, 029 production-run status (RULE 35). MIGRATION NUMBER CLASH: SESSION_HANDOFF records `030_destination_images.sql` (DEST-IMG-01), but two files added on 2026-10-07 also use numbers 030 (`030_promo03_video_banner.sql`) and 031 (`031_partner_terms_acceptances.sql`). Check `src/db/sql/` in the real repo and renumber the newer two to the next free numbers before running them. Their SQL is independent of each other and idempotent.
4. Test: create an empty Supabase project, run baseline + migrations, run the app against it.

**Done when:** an empty project can be brought to production schema using only the repo.

### L.2 PHASE 1 — Money safety (the real launch blockers)

Do these strictly in order. Each is a RULE 22 milestone: sandbox walkthrough required.

#### GOLIVE-01 — Payment creation order and expiry (fixes Bug P3) — CODE COMPLETE, NOT VERIFIED (2026-10-07)

**Built as:** steps 1-5 as written. Step 6 was deliberately changed (see below). Files: `payment.actions.ts`, `cashfree.client.ts`, `constants.ts` (`PAYMENT.ORDER_EXPIRY_MINUTES = 30`). Pending: real Cashfree sandbox walkthrough (RULE 22) and confirming Cashfree accepts the `order_expiry_time` format.

**Defect:** `createNewPayment` (`src/lib/actions/payment.actions.ts`) calls
`createCashfreeOrder` BEFORE inserting the `payments` row. If the insert
fails, a live Cashfree order exists with no local record; the webhook then
logs "No payment found" and returns 200. Money taken, nothing recorded.

**Steps:**
1. Insert the `payments` row first (`status='pending'`, `gateway_order_id` generated locally).
2. Then create the Cashfree order. On failure, mark the row `failed` with the reason.
3. Send `order_expiry_time` (about 30 min) in the order payload.
4. Add a fetch timeout (AbortController, 10-15 s) to every call in `cashfree.client.ts`.
5. Remove the `TEMP DEBUG` error-body log in `createCashfreeOrder` (it logs account details).
6. Guard double-pay. CHANGED while building: refusing every retry while an earlier order is `pending` would block a customer who simply closed the payment page and tried again. Built instead: before opening a new order, ask Cashfree about each earlier `pending` order of the booking; refuse ONLY if one is already `PAID` (webhook not landed yet). A failed lookup does not block a retry. Terminating the older ACTIVE order at Cashfree is NOT built (needs sandbox confirmation) and remains an open improvement.

**Done when:** a forced DB failure after order creation leaves no orphan; a forced Cashfree failure leaves a `failed` row.

#### GOLIVE-02 — Webhook state machine (fixes Bugs P1 and P2) — CODE COMPLETE, NOT VERIFIED (2026-10-07)

**Built as:** steps 1-3, 5, 6. Step 4 deliberately NOT built (see below). Files: `webhook/route.ts` (rewritten), NEW `src/lib/payments/post-payment.ts` (the old side-effects block moved verbatim), `payment.repository.ts` (+`transitionPaymentStatus`), `booking.repository.ts` (+`confirmBookingIfPending`). The idempotent confirm lives in the route as `confirmBookingForSuccessfulPayment`. No migration, no new env var. Pending: real Cashfree sandbox walkthrough (RULE 22), `next build`, and a check that `after()` runs the emails on Vercel.

**Files:** `src/app/api/public/cashfree/webhook/route.ts`, `src/lib/cashfree/cashfree.client.ts`.

**Defects:**
- P1: Cashfree sends one webhook per payment ATTEMPT. A `FAILED`/`USER_DROPPED` attempt followed by a `SUCCESS` on the same order is ignored, because `failed`/`cancelled` are treated as terminal (route.ts about L236-244). Customer charged, booking stays `pending`.
- P2: payment is written `success` first, then `confirmBooking` runs. If it throws, the webhook returns 500, Cashfree retries, and the retry returns early because the payment is already `success`. Paid, never confirmed.
- Also: read-then-write race, no replay window, notifications and PDF rendering run inside the webhook request.

**Steps:**
1. Only `success`, `refunded`, `partially_refunded` are final. `failed`/`cancelled` can still be overwritten by a later `SUCCESS`.
2. Atomic claim: `update payments set status='success' ... where id=$1 and status <> 'success' returning *`. Only the webhook that gets a row back runs side effects.
3. Extract an idempotent `finalizeBookingIfPending(supabase, payment)` (confirm booking, referral reward, invoice, notifications). Call it for a fresh success AND when a webhook arrives for an already-`success` payment whose booking is still `pending` (self-heal).
4. NOT BUILT, on purpose (RULE 12): rejecting webhooks by `x-webhook-timestamp` age. Whether Cashfree re-signs retries with a fresh timestamp is unconfirmed, and a wrong window would reject legitimate retries after an outage. Replay is already harmless (signature + amount check + idempotent transitions). Revisit after reading Cashfree's retry documentation.
5. Move emails/PDF out of the request (`after()` or a queue); set `export const maxDuration = 30`.
6. Return 500 only for retry-worthy failures; make every step safe to repeat.

**Done when (sandbox):** (a) fail then success on one order confirms the booking; (b) a duplicate success webhook sends exactly one email and one invoice; (c) an amount mismatch is rejected; (d) a forced `confirmBooking` failure self-heals on retry.

#### GOLIVE-03 — Reconciliation job and real health endpoint — CODE COMPLETE, NOT VERIFIED (2026-10-07)

**Built as:** steps 2-5. Step 1 (`vercel.json`) is delivered as `vercel.json.example` on purpose: Vercel Hobby only allows daily crons, and a 5-minute schedule makes a Hobby deploy FAIL (owner decision D8 below). Alerting (step 5) is `console.error` plus `// TODO: alerting` markers until GOLIVE-18 adds Sentry. New files: `src/lib/payments/finalize-payment.ts` (the webhook's claim/confirm logic moved out so webhook and cron share it), `src/lib/payments/reconcile.ts`, `src/app/api/public/cron/reconcile-payments/route.ts`; `src/app/api/health/route.ts` replaced; `getCashfreeOrderDetails` (amount + currency) added to the Cashfree client; read-only queries added to both repositories; `/api/health` added to middleware PUBLIC_ROUTES (it was NOT public, so a monitor got a redirect to /login). New env var `CRON_SECRET` (RULE 29/30: in `.env.example` and `env.ts`; endpoint is OFF with 503 when unset). Pending: owner decision D8, deploy with `CRON_SECRET` set, real sandbox test of a lost webhook.

**Why:** Webhooks can be lost. Nothing re-checks Cashfree today. There is no `vercel.json` and no cron.

**Steps:**
1. Add `vercel.json` with a cron every 5 minutes calling a protected route (`CRON_SECRET`).
2. Job A: payments `pending` older than 10 min -> `getCashfreeOrderStatus` -> apply the same transition as the webhook.
3. Job B: payments `success` whose booking is still `pending` -> `finalizeBookingIfPending`.
4. Delete `src/app/api/health/route.ts` (it is a stale 412-line copy of an old webhook, POST only). Add a real `GET /api/health` returning `{ok:true}` plus a cheap DB ping.
5. Alert (Sentry/email) whenever Job B finds anything: it means a webhook failed.

**Done when:** killing a webhook delivery in sandbox still ends with a confirmed booking within 10 minutes.

#### GOLIVE-04 — Inventory reservation (fixes overbooking)

**Defect:** `createBooking` never checks or consumes `room_inventory`.
`booked_rooms` is documented as "owned by the booking system" but nothing
writes it. Two customers can book the last room for the same night.

**Steps (RULE 7: inspect the live `room_inventory` columns first):**
1. Add an atomic DB function (service-role only) that locks and decrements every night in the range and rolls back everything if one night is sold out:
```sql
create or replace function public.reserve_room(p_room uuid, p_in date, p_out date, p_qty int default 1)
returns void language plpgsql security definer set search_path = public as $$
declare d date;
begin
  for d in select generate_series(p_in, p_out - 1, interval '1 day')::date loop
    update room_inventory
       set booked_rooms = booked_rooms + p_qty,
           available_rooms = available_rooms - p_qty
     where room_id = p_room and inventory_date = d and available_rooms >= p_qty;
    if not found then raise exception 'SOLD_OUT'; end if;
  end loop;
end $$;
revoke execute on function public.reserve_room from public, anon, authenticated;
grant  execute on function public.reserve_room to service_role;
```
2. Add the mirror `release_room(...)` (same shape, reverse sign).
3. Call `reserve_room` inside `createBooking` for hotel bookings with a room; map `SOLD_OUT` to a friendly error. Decide behaviour when no inventory rows exist for a date (block, or treat as unlimited) and document it.
4. Call `release_room` on cancel, on payment `failed` terminal, and on pending expiry (GOLIVE-05).
5. Add a CHECK `available_rooms >= 0` if absent.

**Done when:** two simultaneous bookings for the last room: exactly one succeeds. Cancel returns the room.

#### GOLIVE-05 — Pending-booking expiry

**Steps:** extend the GOLIVE-03 cron: bookings `pending` for more than 30-45 min with no `pending` payment still within its expiry -> status cancelled (reason "payment not completed"), `release_room`. Make the window a constant in `lib/config/constants.ts`.

**Done when:** an abandoned booking frees its room automatically.

#### GOLIVE-06 — Guest checkout (needs owner decision D1)

**Defect:** a guest can create a booking (service-role insert) but `initiatePayment` requires login and `booking.user_id`; guest rows have `user_id = null`. Guest bookings sit unpaid forever, holding inventory once GOLIVE-04 lands.

**Option A (recommended for launch):** require login for booking. Redirect guests to `/login?redirectTo=...` from `BookingForm`; remove the service-role guest insert path in `createBooking`.
**Option B:** keep guests; issue a signed, expiring pay-token tied to the booking and email, add a guest pay route that uses it. More work (about 16-32 h).

**Done when:** no code path creates a booking that cannot be paid.

#### GOLIVE-07 — Refunds (RULE 22)

**Defect:** no refund API call, no refund webhook, no admin refund screen. `004_payment_schema.sql` states refunds were out of scope. `cancelMyBooking` only flips status; the customer's money is not returned.

**Steps (decision D4: admin-initiated, 7 days after approved cancellation):**
1. `createCashfreeRefund(orderId, refundId, amount, note)` in `cashfree.client.ts` (POST `/orders/{id}/refunds`) with timeout and idempotent `refund_id`.
2. New `payment_refunds` table (RLS on, service-role only; RULE 24): payment_id, refund_id, amount, status, reason, requested_by, timestamps.
3. Webhook branch for refund events (`REFUND_STATUS_WEBHOOK`) updating the refund row and payment status (`refunded` / `partially_refunded`).
4. Admin UI on `/admin/payments/[id]`: full or partial refund with reason; show status.
5. Cancellation policy helper (uses `FULL_REFUND_WINDOW` and each hotel's `cancellation_policy`) to suggest the refund amount. Admin confirms; never auto-refund.
6. Cancelling a confirmed booking calls `release_room`, notifies the customer, and flags it "refund due" for admin.
7. Commission and vendor payout snapshots must be adjusted on refund (settlement stays correct).

**Done when (sandbox):** cancel -> admin refund -> webhook -> statuses, customer email and settlement amounts all consistent.

### L.3 PHASE 2 — Security hardening

#### GOLIVE-08 — RLS audit (RULE 24 / DATABASE_BIBLE)

**Why:** only 8 of 22 SQL files enable RLS and there are 7 policies in total. DATABASE_BIBLE already marks several tables "RLS UNVERIFIED". The Supabase anon key is public by design; a table without RLS is readable via REST.

**Steps:**
1. In SQL: `select tablename, rowsecurity from pg_tables where schemaname='public';` List every table with `rowsecurity=false`.
2. Enable RLS on all of them. Add explicit policies only where the browser client legitimately reads (public listings: published hotels, rooms, packages, destinations, offers). Everything else: no policy = service-role only.
3. Run the Supabase Security Advisor and fix every ERROR/WARN.
4. Test with the anon key from curl: `bookings`, `payments`, `users`, `invoices`, `vendor_payout_details`, `vendor_kyc_documents`, `booking_messages` must return nothing or 401.
5. Review the `024` SECURITY DEFINER counters: anyone can call them (inflates impressions/clicks that advertisers may be billed on). Add per-IP/day throttling or move to a server action with dedup.
6. Document results in DATABASE_BIBLE.md (replace every "UNVERIFIED" with the measured state).

**Done when:** an anon-key curl matrix shows no private data readable.

#### GOLIVE-09 — Guest booking and invoice data exposure

**Defect:** `getGuestBookingConfirmation` (`booking.actions.ts` about L734), `getGuestInvoiceByBookingId` (`invoice.actions.ts` about L72) and `/api/public/invoices/[bookingId]/pdf` use the service role and need only a booking UUID. They are exported from `"use server"` files, so they are directly callable, and they return the full record (name, email, phone, amount).

**Steps:**
1. If D1 = Option A: delete the guest paths, require login and ownership (`booking.customer_id`).
2. If any public access remains: require a signed, expiring token (HMAC of bookingId + email) in the link; return only a minimal DTO (booking number, dates, status), never the raw row.
3. Move non-action helpers out of `"use server"` files so they are not callable remotely.
4. `getPaymentOutcomeForResult` should check ownership or a signed token, not just an order id.

**Done when:** a random UUID returns 404 and a valid token returns only the minimal DTO.

#### GOLIVE-10 — Abuse protection (needs owner decision D2)

**Steps:**
1. Add a small rate limiter (Upstash Redis or a DB table) keyed by IP and user.
2. Apply to: AI assistant (`ai-assistant.actions.ts`, protects Gemini quota/cost), `createBooking`, contact form, login and password reset.
3. Add Turnstile to contact and AI chat (it is currently only on register and list-your-property).
4. Cap AI input size and history server-side (partly done already) and add a daily global ceiling.
5. Fix the Gemini model fallback list (`gemini-3.8-flash` etc. are not real model names); use one configured model plus one known fallback.

**Done when:** 20 rapid AI calls from one IP are throttled; booking spam is blocked.

#### GOLIVE-11 — Infrastructure and config hardening

**Steps:**
1. `lib/db/index.ts` and `db/index.ts`: remove the duplicate; replace `ssl: { rejectUnauthorized: false }` with proper CA verification; set pool `max: 1` on serverless; use the Supabase pooler URL.
2. `next.config.ts`: add security headers (HSTS, X-Content-Type-Options, Referrer-Policy, frame-ancestors, a report-only CSP first). Remove `dangerouslyAllowSVG` unless needed.
3. Make `lib/config/env.ts` match reality (RULE 29/30): add `GEMINI_API_KEY`, `GMAIL_*`, `TURNSTILE_*`, `CRON_SECRET`, `NEXT_PUBLIC_SITE_URL`; remove `OPENAI_API_KEY`; fail the production build when payment/Supabase secrets are missing; replace direct `process.env` reads with `env`.
4. Production flags: `NEXT_PUBLIC_CASHFREE_ENV=production`, `NEXT_PUBLIC_SITE_URL` set. (The webhook `notify_url` and the Cashfree base URL both depend on these.)
5. Remove `drizzle.config.json`'s hardcoded `postgres:postgres` URL (read from env).
6. Set `maxDuration` on the webhook, invoice PDF and cron routes.

**Done when:** build fails without production secrets; DB connection verifies TLS.

### L.4 PHASE 3 — Legal and store compliance

#### GOLIVE-12 — Account deletion (store + DPDP mandatory)

**Defect:** no deletion endpoint or UI. Only an unused `softDeleteUser` exists in `lib/repository/UserRepository.ts`.

**Steps:**
1. Server action `deleteMyAccount()` with re-authentication (password or email OTP).
2. Anonymise PII on `users` (name, email, phone), remove saved addresses/KYC files in Storage, revoke sessions, delete the Supabase Auth user.
3. Keep legally required records (bookings, invoices, payments) with PII replaced by "Deleted user"; state the retention reason and period in the Privacy Policy.
4. Block deletion while there is an active/upcoming booking or an open settlement; show why.
5. UI under `/profile` ("Delete my account") plus a public web page explaining how to request deletion without logging in (Play Store requires it).
6. Vendors/hotel owners: separate flow (listings go offline, payouts settle first).

**Done when:** a test account is deleted end to end, cannot log in, and booking history survives anonymised.

#### GOLIVE-13 — Privacy, DPDP and consumer-law package

**Steps:**
1. Privacy Policy: name the Data Fiduciary (legal entity, address), purposes, retention periods, user rights (access, correction, erasure, grievance, nominee), breach process.
2. Name every processor: Supabase (hosting/DB/storage), Cashfree (payments), Google (Gemini AI, Google sign-in), Gmail/email provider, Cloudflare (Turnstile), Vercel. Say that AI chat text is sent to Google.
3. Consent at signup (checkbox plus timestamp stored) and on the property-listing form; link Terms/Privacy.
4. Grievance Officer block (decision D5): name, email, phone, 48 h acknowledge / 1 month resolve (E-Commerce Rules 2020). Footer link on every page.
5. Terms: marketplace role (platform vs vendor responsibility), cancellation/refund link, jurisdiction, AI-assistant disclaimer.
6. Lawyer review of all three pages (they are marked DRAFT today) plus the new `/partner-terms` page (PARTNER-TERMS-01, built 2026-10-07; migration 031 must be run).
6b. Existing hotel owners (listed before PARTNER-TERMS-01) have no row in `partner_terms_acceptances`. Add a one-time "Accept Partner Terms" card to `/hotel-owner` and `/vendor` that writes a new row, and block new bookings for that vendor until accepted (needs owner decision). Also re-prompt whenever `PARTNER_TERMS_VERSION` changes.
7. Verify nothing untrue is shown publicly: delete the unmounted fake content (Testimonials, homeStats, TrendingFlights, Newsletter, AppDownload components/data and the 28 `href: "#"` footer entries) so it can never be remounted by mistake.

**Done when:** pages reviewed by counsel, officer details live, consent stored.

#### GOLIVE-14 — Tax and accounting sign-off (external, CA)

**Steps:** get a CA to confirm (a) invoice format: GSTIN, HSN/SAC, GST slab by room tariff; (b) whether platform commission and the vendor's room charge need separate invoices; (c) TCS under GST and TDS u/s 194-O on vendor payouts, and how manual settlement (`vendor-settlement.actions.ts`) records them; (d) the fixed 20% `PLATFORM_COMMISSION_RATE`. Implement whatever changes result.

**Done when:** CA signs off a sample invoice and a sample settlement statement.

### L.5 PHASE 4 — Customer communication

#### GOLIVE-15 — Reliable transactional email (decision D3)

**Steps:** register a sending domain; set SPF, DKIM, DMARC; move from Gmail SMTP to Resend/SES/Postmark (the file comment says swapping the client is a rewrite of `email.client.ts` only); keep `dispatch.ts` unchanged. Test inbox placement (Gmail, Outlook, Yahoo). Until then keep Gmail but monitor the 500/day cap.

**Done when:** booking confirmation with PDF lands in the inbox, not spam, from your own domain.

#### GOLIVE-16 — WhatsApp or SMS confirmation (decision D6)

**Steps:** implement `whatsapp.client.ts` for the chosen provider (signature must not change, per its header); add the env var to `.env.example` and `env.ts`; approved template: booking number, dates, hotel, amount, invoice link; fall back to email if sending fails. SMS needs DLT registration.

**Done when:** a real booking triggers WhatsApp/SMS to the customer and WhatsApp/SMS to the hotel.

### L.6 PHASE 5 — Verification, quality, operations

#### GOLIVE-17 — Payment end-to-end matrix (sandbox, then live)

Run and record each in SESSION_HANDOFF.md (RULE 21/22):
success; fail then success on one order; user dropped; duplicate webhook; out-of-order webhook; amount mismatch; webhook lost (cron heals); two tabs paying one booking; sold-out race; abandoned booking expiry; cancel then refund; vendor settlement after refund; invoice PDF opens with the logo (the `sharp` conversion path is still marked never run); customer email with PDF attached.

**Done when:** every row passes and is written down.

#### GOLIVE-18 — CI, tests, observability

**Steps:**
1. GitHub Actions: `npm ci`, `typecheck`, `lint`, `build` on every PR; block merge on failure.
2. Vitest unit tests for pure logic: `computeCommissionSplit`, coupon discount, price resolution, cancellation-refund helper, `verifyWebhookSignature`, `isVideoUrl`.
3. One Playwright test: search -> book -> pay (sandbox) -> confirmation.
4. Sentry (server and client) and a structured logger replacing the 178 `console.*` calls (RULE 38/39: payment and webhook failures must alert, not just log).
5. Uptime monitor on `/api/health`.

**Done when:** CI is green, and a forced webhook error produces an alert.

#### GOLIVE-19 — UX states and mobile pass

**Steps:** add `loading.tsx` / `error.tsx` per route group (only 2 of each exist for 81 pages); empty states for dashboard bookings, vendor lists, search results; test `/`, `/hotels`, `/hotels/[slug]`, `/book`, `/dashboard/bookings`, `/payment/success` on a mid-range Android and iPhone Safari; Lighthouse (performance and accessibility) at or above 85 on mobile; check promo image/video banners on slow 3G; failed-payment page offers a clear Retry. Fill the empty `Testimonials` slot only with verified reviews from completed bookings (future).

**Done when:** no blank screens, every error has a recovery action, Lighthouse targets met.

#### GOLIVE-20 — SEO and discoverability

**Steps:** metadata on all public pages (14 of 81 today); JSON-LD (`Hotel`, `Offer`, `BreadcrumbList`, `Organization`); public `/packages/[id]` detail pages added to the sitemap; `revalidate` (for example 300 s) plus `revalidateTag` on admin edits; landing pages for pilgrimage cities (Varanasi, Ayodhya, Haridwar, Tirupati, etc.); Hindi strings completed in `lib/i18n/messages.ts`; Search Console and sitemap submitted.

**Done when:** rich-result test passes and indexed pages appear in Search Console.

### L.7 PHASE 6 — Launch cutover

#### GOLIVE-21 — Production switch and go/no-go

**Steps:**
1. Cashfree: production keys in Vercel; webhook URL `https://<domain>/api/public/cashfree/webhook` set and tested from the dashboard; confirm `NEXT_PUBLIC_CASHFREE_ENV=production`.
2. All migrations (baseline plus 028-030 and the new GOLIVE ones) confirmed in production via `information_schema` (RULE 35).
3. Real money test: book a low-priced room, pay a real small amount, confirm booking, email, invoice, WhatsApp/SMS, admin alert, vendor view; then cancel and refund it and see the money return.
4. Backups: Supabase PITR or daily backups enabled; restore tested once.
5. Rollback plan written (previous Vercel deployment, feature flag to disable booking).
6. Support: contact email/phone live, Grievance Officer reachable, 9 AM-9 PM hours consistent everywhere.
7. Soft launch: invite-only for the first 20-50 bookings; watch Sentry, cron alerts and Cashfree dashboard daily.

**Go/No-Go gate (all must be YES):**

| Gate | Yes/No |
|---|---|
| `tsc`, `eslint`, `next build`, CI green (GOLIVE-00, 18) | |
| Webhook matrix passed incl. fail-then-success and self-heal (GOLIVE-02, 17) | |
| Reconciliation cron running and alerting (GOLIVE-03) | |
| Overbooking impossible; cancel/expiry release rooms (GOLIVE-04, 05) | |
| No unpayable bookings (GOLIVE-06) | |
| Refund tested with real money (GOLIVE-07, 21) | |
| RLS verified with anon-key curl matrix (GOLIVE-08) | |
| No public booking/invoice data without a token (GOLIVE-09) | |
| Rate limits live on AI, booking, contact (GOLIVE-10) | |
| TLS to DB verified, production env validated (GOLIVE-11) | |
| Account deletion works (GOLIVE-12) | |
| Privacy/Terms/Refund reviewed, Grievance Officer live (GOLIVE-13) | |
| CA sign-off on invoices and settlements (GOLIVE-14) | |
| Email deliverability proven; WhatsApp/SMS live or disclosed as absent (GOLIVE-15, 16) | |
| Backups enabled and restore tested (GOLIVE-21) | |

### L.8 POST-LAUNCH (weeks 2-4, MEDIUM)

- Split oversized files: `booking.repository.ts` (1,213 lines), `booking.actions.ts` (1,111), `base.repository.ts` (1,060), `PropertyListingForm.tsx` (989), `property-listing.actions.ts` (854), `hotel.actions.ts` (834).
- Merge the two repository layers (`lib/repository/` vs `lib/repositories/`) and the two DB access paths (Drizzle plus `pg` vs supabase-js) where practical.
- Make commission configurable per vendor (today fixed 20%).
- Build real vendor and travel-agent dashboards (today 11-line and 27-line placeholders); decide the role of `/super-admin`.
- Verified-review system tied to completed bookings.
- Move notifications to a queue with retries (Inngest/QStash).
- Add `GET` public REST endpoints needed for a native app (Server Actions are not a public API).
- Play Store wrapper (TWA/Capacitor) and Data Safety form, if D7 chose native.

### L.9 FUTURE (LOW)

Seasonal/dynamic pricing; channel manager and iCal sync; automated vendor payouts (`cashfree-payouts.client.ts` is stubbed); multi-vendor packages with split payments; loyalty program; search ranking (pgvector/Algolia); media transcoding/CDN; admin analytics; multi-currency.

### L.10 Rules reminder for every GOLIVE milestone

RULE 7/13: inspect live schema before any SQL. RULE 22: payment/booking changes need a sandbox walkthrough. RULE 24: new table means RLS plus documented policy. RULE 29/30: new env var goes in `.env.example` and `env.ts`, and the integration is gated off if unset. RULE 32/35: migrations exist on disk and their production-run status is recorded. Section F2: DoD, including PROJECT_STATUS.md and CHANGELOG.md updated in the same session.
