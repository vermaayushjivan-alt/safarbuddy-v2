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
