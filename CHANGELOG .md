<!-- ROOT PATH: CHANGELOG.md -->

CHANGELOG.md

All significant SafarBuddy V2 changes are recorded here.

2026-09-17 — Admin panel + coupons production incident (chat session, hotfix)

Status: CLOSED functionally, documentation follow-ups pending (see
DOC_DEBT.md item 15).

Reported: "Admin nahi khul rha" — /admin returning a live 404 in
production. Root cause: src/app/admin/page.tsx (the dashboard
homepage) had been overwritten with an entire coupon-edit page's
content, which called notFound() on every load since /admin has no
`[id]` param for it to resolve. Same class of bug as the same day's
DOC_DEBT.md item 14 (a pasted block landing in the wrong file) but a
separate, independent occurrence.

Fixed:
- src/app/admin/page.tsx — real AdminDashboardPage content restored
  (recovered from an older uploaded repo snapshot), plus Coupons and
  Settlements cards added (both pages already existed but were never
  linked from the dashboard).
- src/app/admin/coupons/[id]/page.tsx (new) — the coupon-edit content
  that had been sitting in the wrong file, given its correct home.
  This route did not exist before; coupon editing was unreachable
  regardless of the /admin bug.

Then found, while verifying /admin/coupons: production's public.coupons
table already existed with a completely different, unrelated legacy
schema (usage_limit/per_user_limit/used_count/start_date/end_date/
status — no scope/vendor_id/valid_from/valid_until/is_active), so
014_coupon01_coupons.sql's `create table if not exists` had silently
no-opped in production and every coupon admin page threw an uncaught
DB error. Reconciled live via a manual ALTER-based migration
(add new columns, backfill from the old ones, drop old columns,
add constraints/indexes/RLS) — not 014's own DDL, which would have
been a no-op against the pre-existing table. One real row (WELCOME10)
existed at the time; it was briefly lost to a DROP TABLE CASCADE run
in place of the safer ALTER script (no backup captured — see
DOC_DEBT.md item 15 for the full sequence) and recovered by hand from
data already captured earlier in the session.

Then found, after the schema fix: public.coupons has RLS enabled with
no policy (as 014's own header comment documents), but
coupon.actions.ts's admin functions used the session client
(`createClient()`) instead of `createServiceRoleClient()` — producing
0 rows on the admin list and a hard RLS-violation error on create.
Fixed: createCouponAdmin, updateCouponAdmin, setCouponActiveAdmin,
getCouponByIdAdmin, and getAllCouponsAdmin all switched to
createServiceRoleClient(); requireRole() remains the authorization
gate and was not changed.

Verified live by the user this session: /admin loads with all cards
including Coupons and Settlements; /admin/coupons lists WELCOME10;
creating a new coupon succeeds.

Not done / pending (see DOC_DEBT.md item 15 for full detail):
- 014_coupon01_coupons.sql itself was not rewritten to match the
  ALTER-based migration actually run in production (RULE 32/33) —
  the file on disk still describes a `create table` that would no-op
  if re-run today.
- Whether vendor_payout_details / vendor_settlements (same
  "RLS enabled, no policy" pattern, same session-client usage in
  vendor-payout.actions.ts / vendor-settlement.actions.ts) have the
  identical bug coupons had is UNVERIFIED — /admin/settlements loads
  without error, which is not proof it's returning real rows to an
  admin.
- RULE 34 (pre-run destructive-change note) was not followed for the
  DROP TABLE CASCADE that was actually run, since its destructive
  effect on this specific table wasn't identified as the one that
  would execute until after the fact.

2026-09-17 — COUPON-01 (Discount Coupons) — new milestone

Status: CODE COMPLETE, NOT VERIFIED IN PRODUCTION (migration 014 not
yet run).

Scope confirmed in chat before coding: both percentage and flat
coupons (admin picks per coupon), admin decides per coupon whether it
is global or scoped to one vendor, applies to both hotel and package
bookings, no usage-count limit (simple active/inactive on-off switch
only).

RULE 15 audit performed in chat session before coding — critical
finding: bookings.subtotal/discount/coupon_discount/grand_total already
exist live, but (a) grand_total is a generated column with no recorded
formula in any migration (RULE 13 — unverified schema, left untouched),
and (b) more importantly, the amount actually charged via Cashfree is
read from bookings.price_snapshot (see payment.actions.ts), which is
completely disconnected from those columns. Writing a coupon amount
into coupon_discount would have displayed a "discount" that never
actually reduced what the customer pays — a real, pre-existing gap in
the schema, surfaced while scoping this milestone rather than
introduced by it. Fix: the coupon discount is subtracted directly from
price_snapshot before a booking is created; three new columns on
bookings (coupon_id, coupon_code, coupon_discount_amount) exist purely
as a record of what was used, not part of the charge calculation.

Files changed:
- src/db/sql/014_coupon01_coupons.sql (new) — public.coupons (code,
  discount_type percentage|flat, discount_value, optional
  max_discount_amount / min_booking_amount, scope global|vendor,
  vendor_id, valid_from/valid_until, is_active) plus coupon_id /
  coupon_code / coupon_discount_amount on bookings. Scope keys off
  vendor_id rather than hotel_id specifically because vendor_id is the
  one column populated on both hotel and package bookings alike (see
  createBooking()), so one scope column covers both booking types
  without separate hotel-only/package-only paths. Case-insensitive
  unique index on upper(code). RLS enabled, no policy — same pattern as
  vendor_payout_details/vendor_settlements.
- src/lib/coupons/coupon-discount.ts (new) — computeCouponDiscount(),
  pure function: percentage or flat, capped by max_discount_amount,
  and always leaves at least ₹1 payable.
- src/lib/repositories/coupon.repository.ts (new) — CouponRepository:
  createCoupon, updateCoupon, getCouponById, getCouponByCode
  (case-insensitive), getAllCouponsAdmin (paginated, vendor name
  embedded), getUsageCount (counts bookings referencing a coupon —
  informational only, since no limit is enforced).
- src/app/actions/coupon.actions.ts (new) — admin CRUD
  (createCouponAdmin, updateCouponAdmin, setCouponActiveAdmin,
  getCouponByIdAdmin, getAllCouponsAdmin) using createClient() (session
  client, matching the existing vendor-payout.actions.ts /
  vendor-settlement.actions.ts convention for RLS-enabled/no-policy
  tables — see "Open question" below); and the checkout-facing path:
  resolveCouponForBooking() (plain function, not itself a Server
  Action — imported directly by booking.actions.ts) and
  validateCouponPublic() (the Server Action BookingForm calls for its
  live preview). Both always use createServiceRoleClient(), since this
  must work identically for a guest checkout with zero session.
- src/lib/repositories/booking.repository.ts — BookingRecord /
  DatabaseBookingRow / mapBooking() / createBooking() all gained
  coupon_id, coupon_code, coupon_discount_amount (informational only,
  documented inline as NOT part of the charge).
- src/app/actions/booking.actions.ts — createBookingBaseSchema gained
  an optional coupon_code; createBooking() calls
  resolveCouponForBooking() once priceSnapshot is finalized for either
  the hotel or package branch (including the ROOM-05 room-specific
  price override), re-deriving the discount from scratch against its
  own server-resolved subtotal — never trusting any discount amount a
  client-side preview may have shown — then subtracts it from
  priceSnapshot before the booking is inserted.
- src/app/admin/coupons/page.tsx (new) — list (code, discount, scope,
  usage count, active/inactive) + a create form.
- src/app/admin/coupons/[id]/page.tsx (new) — edit form +
  activate/deactivate toggle.
- src/app/admin/page.tsx — added a "Coupons" card to the admin
  dashboard grid.
- src/components/booking/BookingForm.tsx — added an "Apply Coupon"
  input with a live preview (calls validateCouponPublic with the
  price already shown on the page as the subtotal) showing the
  resulting payable amount, and sends the applied code (never a
  discount amount) as part of the booking submission.
- src/app/hotels/[slug]/book/page.tsx,
  src/app/packages/[id]/book/page.tsx — both now pass their
  hotel's/package's vendor_id into BookingForm so a vendor-scoped
  coupon's live preview resolves correctly (this has no bearing on
  what's actually charged either way — see above).

Open question (shared with PAY-04, not decided in this milestone):
admin actions for coupons, vendor_settlements, and vendor_payout_details
all use the session client (createClient()) against tables that have
RLS enabled with no policy defined. Whether this actually works for an
authenticated admin, or has been silently failing since VENDOR-02, is
unverified — flagged here rather than silently changed, since deciding
the real access pattern (a policy keyed on JWT admin role vs. routing
all three through service-role) is a cross-cutting decision, not a
per-milestone one.

Not done (explicitly out of scope): usage limits (per product decision
— on/off only), coupon stacking (only one code per booking), any UI on
the /packages listing/detail pages to show "coupon available" — this is
manual code-entry only for now.

Verified clean: tsc --noEmit PASS, eslint PASS (0 errors) across all
new/changed files, including BookingForm.tsx and the two booking pages.
NOT verified: migration 014 not yet run in production, no live
functional walkthrough (applying a real coupon at checkout, admin
create/edit/deactivate, and the final charged amount all still need an
end-to-end test once the migration is live).

2026-09-17 — PAY-04 (Manual Settlement Tracking) — new milestone

Status: CODE COMPLETE, NOT VERIFIED IN PRODUCTION (migration 013 not
yet run).

Context: the project owner will pay hotel owners manually (bank/UPI,
outside the app) until enough hotels (~50) are onboarded to justify
wiring the real Cashfree Payouts beneficiary flow (vendor_payout_details,
migration 010 — also still not run in production, and untouched by this
milestone). This closes the gap by (1) recording, per successful
payment, a fixed 20% platform-commission / 80% vendor-payout split, and
(2) letting an admin log a manual payout as a "settlement" once money
has actually been sent, generating a receipt the vendor can see.

RULE 15 audit performed in chat session before coding (Existing
Architecture / Root Cause / Files / Why / Minimal Plan) — summary:
payments table had no commission concept at all; commission rate is
fixed (20%, no per-vendor override, explicit product decision) so it
lives only in code (src/lib/payments/commission.ts), not a settings
table or a per-vendor column.

Files changed:
- src/db/sql/013_pay04_manual_settlement.sql (new) — adds
  platform_commission_amount / vendor_payout_amount snapshot columns to
  payments; creates public.vendor_settlements (one row per manual
  payout logged by an admin, receipt_number auto-generated via a
  bigserial + generated column, e.g. SB-RCPT-00001). RLS enabled, no
  public/authenticated policy — same access pattern as
  vendor_payout_details (migration 010).
- src/lib/payments/commission.ts (new) — PLATFORM_COMMISSION_RATE
  (0.20) and computeCommissionSplit(amount), the single place the rate
  is encoded.
- src/lib/repositories/payment.repository.ts — PaymentRecord and
  UpdatePaymentStatusData gained platform_commission_amount /
  vendor_payout_amount; new getSuccessfulVendorPayoutTotal(vendorId)
  (joins through bookings.vendor_id since payments has no vendor_id of
  its own; fetches and sums in application code rather than a SQL
  aggregate — acceptable at current/expected vendor-count scale, flagged
  in the method's own comment to revisit if that assumption stops
  holding).
- src/app/api/public/cashfree/webhook/route.ts — on a "success"
  transition, computes the commission split from the already-verified
  payment amount and persists it alongside the existing status update.
  No change to failure/pending/cancelled handling.
- src/lib/repositories/vendor-settlement.repository.ts (new) —
  VendorSettlementRepository: createSettlement, getSettlementsByVendorId,
  getTotalSettledForVendor, getAllSettlementsAdmin (admin list with
  embedded vendor name).
- src/app/actions/vendor-settlement.actions.ts (new) — admin actions
  (getAllVendorDueSummariesAdmin, getVendorDueSummaryAdmin,
  getSettlementsByVendorAdmin, markSettlementPaidAdmin — rejects an
  amount greater than what's actually due) and a vendor-facing action
  (getMyReceivedPayments, via requireVendorContext(), same read-only
  scoping pattern as VENDOR-BOOKING-01).
- src/app/admin/settlements/page.tsx (new) — all vendors, total earned /
  already paid / due, paginated.
- src/app/admin/settlements/[vendorId]/page.tsx (new) — one vendor's due
  summary, a "Mark as Paid" form (amount defaults to the full due
  amount, capped at it), and their full receipt history.
- src/app/vendor/payments/page.tsx (new) — vendor-facing "Payments
  Received" list (receipt number, amount, date).
- src/app/vendor/bookings/page.tsx — added a small Bookings / Payments
  Received nav row (no shared vendor layout nav exists yet, so this is
  duplicated inline on both pages, matching how minimal the rest of
  /vendor currently is).
- src/app/admin/page.tsx — added a "Settlements" card to the admin
  dashboard grid.

Not done (explicitly out of scope this milestone): any real bank
transfer or Cashfree Payouts wiring — this only calculates the split and
lets the admin record what they already sent manually. Editable/
per-vendor commission rates. Voiding or editing a logged settlement
(none built — if a mistake is made, it needs a manual DB fix for now).

Verified clean: tsc --noEmit PASS, eslint PASS (0 errors) across all
new/changed files. NOT verified: migration 013 not yet run in
production, no live functional walkthrough (webhook success path,
"Mark as Paid" form, and the vendor's own receipt view all still need
a real end-to-end test once the migration is live).

2026-09-11 — BOOKING-03 (Guest Checkout) — restored after regression

Status: CODE COMPLETE, PARTIALLY VERIFIED.

Root cause: the repo zip uploaded at the start of this session did not
contain BOOKING-03 (guest checkout), previously delivered — createBooking()
still unconditionally threw "UNAUTHENTICATED", migration 012 did not
exist, and no /booking-confirmation route existed. Confirmed by the user
to be the actual latest state, not a stale upload — logged as DOC_DEBT.md
item 12. This session's Definition-of-Done items below cover the restore.

Files changed:
- src/db/sql/012_booking03_guest_checkout.sql (new) — customer_id made
  nullable, guest_name/guest_email/guest_phone columns added,
  bookings_customer_or_guest_check constraint.
- src/lib/repositories/booking.repository.ts — guest columns threaded
  through BookingRecord/DatabaseBookingRow/mapBooking/createBooking().
- src/app/actions/booking.actions.ts — createBooking() no longer requires
  a session; unauthenticated callers must supply guest_name/email/phone
  and are routed through createServiceRoleClient() for every DB call in
  the function (same trusted-server-write pattern as
  property-listing.actions.ts's self-service submission — a guest has no
  session for RLS to evaluate). New getGuestBookingConfirmation() action
  for the public confirmation page.
- src/components/booking/BookingForm.tsx — new required `isAuthenticated`
  prop; renders and validates a guest-contact section when false; posts
  a guest to /booking-confirmation/[id] instead of /dashboard/bookings.
- src/app/hotels/[slug]/book/page.tsx, src/app/packages/[id]/book/page.tsx
  — removed the login redirect for unauthenticated visitors; authUser is
  now only used to set BookingForm's isAuthenticated prop.
- src/app/booking-confirmation/[id]/page.tsx (new) — public confirmation
  page, reads via getGuestBookingConfirmation().
- middleware.ts — added `/packages/` and `/booking-confirmation/` to the
  public-route prefix allowlist. `/packages/[id]` and `/packages/[id]/book`
  were previously login-gated at the middleware layer regardless of the
  page's own logic — this was blocking package guest-checkout entirely,
  not just a hotel-side gap.

Verified: `tsc --noEmit` clean and `eslint` clean on every file above —
run for real this session (`npm install` succeeded against
registry.npmjs.org, unlike prior sessions noting "no node_modules and no
network" for this milestone).

Not verified (RULE 21-23): migration 012 has not been run against
production — no reachable Supabase instance in this sandbox. No live
functional walkthrough (real browser, real guest booking end-to-end,
confirmation email actually received) — same limitation. RULE 22 applies:
this is a bookings-mutation path and needs that walkthrough before being
marked Frozen.

Also logged, not fixed this session (out of scope per user's explicit
priority — booking-setup completion before returning to P0.3): PROJECT_
STATUS.md's claim that hotel-owner onboarding wizard (P0.3 Steps 2-5) was
CODE COMPLETE 2026-09-05 does not match this session's repo — see
DOC_DEBT.md item 13.

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
