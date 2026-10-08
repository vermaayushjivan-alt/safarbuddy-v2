<!-- ROOT PATH: SESSION_HANDOFF.md -->

SESSION_HANDOFF.md

Single source of truth for the current session boundary. Read this first if picking up the project without the full ZIP.

GOLIVE-07a (2026-10-08) — refund backend. CODE COMPLETE, NOT VERIFIED (no tsc/vitest/Postgres/Cashfree in the sandbox; syntax check only).
New: src/db/sql/033_golive07_refunds.sql (NOT run), src/lib/payments/refund.ts, refund-status.ts, src/lib/repositories/payment-refund.repository.ts,
src/app/actions/payment-refund.actions.ts, verify/golive07.test.ts. Modified: cashfree.client.ts, webhook route.ts, cron route.ts, booking.repository.ts,
booking.actions.ts, finalize-payment.ts, payment.repository.ts, vendor-settlement.actions.ts. No new env var.
Order to deploy: (1) check live payments columns + payments_status_check, (2) run 033, (3) deploy code, (4) enable the Refund webhook in the Cashfree dashboard
(same URL as the payment webhook) — without it refunds still resolve through the sync job, only slower. Walkthrough: pay in sandbox -> cancel -> admin requestRefundAdmin
-> refund shows pending -> webhook/sync -> success; payment becomes refunded, booking refund_due clears, vendor due drops by the vendor share.
Also changed: vendor "earned" query now uses an !inner join (see CHANGELOG 2026-10-08) — verify with two vendors.
NEXT: GOLIVE-07b — admin UI on /admin/payments/[id] (full/partial refund, status, refund-due list), cancellation-policy helper (FULL_REFUND_WINDOW + hotel
cancellation_policy; suggestion only, admin confirms), customer refund email. Then GOLIVE-08 (RLS audit).

SEC-REDIRECT-01 (2026-10-07, after GOLIVE-06) — the open-redirect finding below is FIXED. src/lib/auth/safe-redirect.ts (new), src/actions/auth.ts,
src/app/auth/callback/route.ts, verify/safe-redirect.test.ts (new). tsc PASS, ESLint clean, vitest 85/85. Walkthrough: open /login?redirectTo=https://example.com ,
log in -> must land on your normal dashboard, NOT example.com; open /login?redirectTo=/profile -> lands on /profile; Google login too.
NEXT: GOLIVE-07 (refunds, D4 decided) — large; plan to split into 07a backend (Cashfree refund client, payment_refunds table, webhook, room release on cancel) and 07b admin UI + policy helper + settlement adjustment.

GOLIVE-06 (2026-10-07, after GOLIVE-05) — OWNER DECIDED D1 = Option A: login required to book. CODE COMPLETE, tests only.
(Owner's standing instruction: prefer the professional, low-maintenance, automated option — small team, nothing should need manual running.)
Also did GOLIVE-09 step 1 (guest read paths deleted) because it is the same deletion. No migration, no new env var.
MODIFIED (paste over): src/app/actions/booking.actions.ts (also carries the GOLIVE-04 hold/release), src/app/actions/invoice.actions.ts, middleware.ts,
src/components/booking/BookingForm.tsx, src/app/hotels/[slug]/book/page.tsx, src/app/packages/[id]/book/page.tsx, verify/golive06.test.ts (new).
DELETE FROM REPO (3 files; if one is forgotten the build fails loudly on the missing getGuestInvoiceByBookingId, or a stale guest page stays): 
src/app/booking-confirmation/[id]/page.tsx, src/app/booking-confirmation/[id]/invoice/page.tsx, src/app/api/public/invoices/[bookingId]/pdf/route.ts.
Verified: tsc PASS, ESLint PASS on changed files, vitest 54/54. NOT verified: real browser flow.
Walkthrough: signed out -> open a hotel book URL with room/dates -> sent to login -> after login lands on the SAME page with room/dates kept -> create booking -> goes to /dashboard/bookings?created=... -> pay. Same for a package. A signed-out call to the old /booking-confirmation/<uuid> must 404.
FIXED LATER IN THIS SAME DAY (see SEC-REDIRECT-01 above). Original finding: src/actions/auth.ts redirects to whatever redirectTo string it receives, so /login?redirectTo=https://evil.example is an open redirect (phishing risk). Fix later by accepting only paths that start with a single "/" (not "//"). Small, should be done before launch.
Stale comments only (harmless): InvoiceView.tsx and payment.actions.ts still mention /booking-confirmation/.
NEXT: GOLIVE-07 (refunds) — D4 already decided: keep admin-initiated, no auto-refund at launch. Then GOLIVE-08 (RLS audit).

GOLIVE-05 (2026-10-07, after GOLIVE-04) — pending-booking expiry. CODE COMPLETE, SIMULATED TESTS ONLY.
New: src/lib/bookings/expire-pending.ts, verify/golive05.test.ts (deliver as _verify/golive05.test.ts). Modified: src/lib/config/constants.ts,
src/lib/repositories/booking.repository.ts, src/lib/repositories/payment.repository.ts, src/app/api/public/cron/reconcile-payments/route.ts.
Migrations: none. New env vars: none. tsc PASS (whole project), ESLint PASS on changed files, vitest 45/45 (11 new + 34 old).
Rule: pending > 45 min AND no pending/success/refunded payment -> cancelled "Payment not completed in time" + release_booking_room. Runs inside the
existing cron AFTER reconciliation. REQUIRES migration 032 to be run first (otherwise release logs an error and the room stays held).
NOT verified: real cron run; abandoned booking really freeing its room. Walkthrough: start a booking, do not pay, wait 45+ min (or temporarily lower
PENDING_EXPIRY_MINUTES in sandbox), call the cron endpoint with the Bearer token -> booking cancelled, room_inventory booked_rooms back down,
response JSON has `expiry.expired: 1`. Also confirm a booking with a payment in progress is NOT cancelled.
OWNER STILL HAS TO DO (unchanged): run 032 (GOLIVE-04), set CRON_SECRET, decide D8 (Vercel plan) — without the cron nothing expires — and decide D9.
NEXT: GOLIVE-06 (guest checkout) needs owner decision D1 first (recommended: require login to book). Ask D1 before coding.

GOLIVE-04 (2026-10-07, later session) — inventory reservation (overbooking fix). CODE COMPLETE, NOT VERIFIED ON SUPABASE.
Plan/rules: DEVELOPMENT_BIBLE.md Section L, GOLIVE-04. New: src/db/sql/032_golive04_room_reservation.sql, src/lib/inventory/room-reservation.ts.
Modified: src/app/actions/booking.actions.ts only (hold after insert; release in cancelMyBooking + cancelBookingAdmin). Docs: CHANGELOG, DEVELOPMENT_BIBLE,
DATABASE_BIBLE (registry row 032), PROJECT_STATUS, this file. NEW ENV VAR: none.
Verified for real: migration + functions on local PostgreSQL 16 (idempotent re-run, rollback on sold-out, 10 parallel requests -> 1 success,
12 overlapping -> 0 deadlocks, anon/authenticated denied); tsc --noEmit PASS whole project; ESLint PASS on changed files.
NOT verified: run on real Supabase; real booking/cancel in browser; next build; Vercel build.
OWNER MUST DO, IN ORDER: (1) in Supabase run the information_schema query at the top of 032 and confirm room_inventory + bookings columns;
check src/db/sql/ for number clashes, then run 032; (2) replace the 3 files above, redeploy; (3) walkthrough (RULE 22): book the last room with
account A, try the same dates with account B -> friendly "sold out"; cancel A -> B can book; check room_inventory booked_rooms/available_rooms
each step; (4) book a room that has NO inventory rows -> expect "not open for booking" (see decision below).
DECISION NEEDED (new, D9): a night with no room_inventory row is BLOCKED. Rooms made via /list-your-property get 180 days seeded, but rooms
an admin created earlier or dates past the seed have no rows, so guests cannot book them until inventory is set in admin. Confirm blocked
(safe, recommended) or tell me to treat missing rows as unlimited (risk: overbooking again).
Deliberate deviation: no release on payment "failed" (a later SUCCESS/retry would then confirm with no room); release happens on cancel and, next,
on expiry (GOLIVE-05). Old pending bookings from before this deploy hold no room.
Still pending from GOLIVE-03: set CRON_SECRET, decide D8 (Vercel plan), lost-webhook sandbox test.
NEXT: GOLIVE-05 (pending-booking expiry in the GOLIVE-03 cron, calls release_booking_room) — after 032 is run and the walkthrough passes.

BUILD-FIX-01 (2026-10-07): the owner's Vercel build (commit 89d3fdd) failed at "Running TypeScript": verify/vitest.config.ts cannot
find 'vitest'. Cause: tsconfig.json include **/*.ts picks up the test folder. Fix = tsconfig.json exclude ["node_modules","verify","_verify"]
(only file changed). Useful fact: the same log shows "Compiled successfully in 19.9s", so the Turbopack compile of GOLIVE-01/02/03 and the
earlier work passed on Vercel; only the type-check step was blocked by the tests. NOT yet confirmed: a full green Vercel build after the fix.

UPDATE (later the same day, 2026-10-07): owner reports PROMO-03, PARTNER-TERMS-01, GOLIVE-01 and GOLIVE-02 are working in their
environment. Not written down as a sandbox walkthrough, so they are still not Frozen (RULE 22).

GOLIVE-03 (2026-10-07) — payment reconciliation cron + real /api/health. CODE COMPLETE, NOT VERIFIED.
Plan/rules: DEVELOPMENT_BIBLE.md Section L. New: src/lib/payments/finalize-payment.ts, src/lib/payments/reconcile.ts,
src/app/api/public/cron/reconcile-payments/route.ts. Replaced: src/app/api/health/route.ts. Modified: webhook/route.ts (shared logic
moved out, behaviour unchanged), src/lib/cashfree/cashfree.client.ts, payment.repository.ts, booking.repository.ts,
src/lib/config/constants.ts, src/lib/config/env.ts, middleware.ts (repo root), .env.example. Delivered as vercel.json.example.
Migrations: none. NEW ENV VAR: CRON_SECRET (16+ random chars; endpoint returns 503 and does nothing while unset).
tsc PASS and ESLint PASS on changed files (real runs). Simulated tests: 14 new + 20 old = 34/34 PASS (in-memory DB). They cover: lost
webhook recovered (PAID -> success + booking confirmed, side effects once, commission set); idempotent re-run; PAID with wrong amount NOT
confirmed; EXPIRED/TERMINATED closed as failed; ACTIVE and unreachable left alone; age window 10 min..3 days; paid-but-pending booking
healed; DB error counted not thrown; cron route 503 unset / 401 bad token / 200 good token; health 200 and 503 with no details.
Not verified: real sandbox lost-webhook test; `next build`; cron firing on the host; Cashfree order response field names order_amount /
order_currency / order_status against the live sandbox (documented fields, unconfirmed here).
DECISION NEEDED (D8): Vercel plan. Pro -> rename vercel.json.example to vercel.json. Hobby -> do NOT add it (deploy would fail); call
GET /api/public/cron/reconcile-payments every 5 min from cron-job.org with header `Authorization: Bearer <CRON_SECRET>`.
Still open from the audit: no alerting yet (TODO markers only, Sentry is GOLIVE-18); stale root files; migration number clash 030/031.
NEXT: set CRON_SECRET, run the lost-webhook test (pay in sandbox, block/ignore the webhook, wait for the cron, confirm the booking
confirms and exactly one email goes out), then GOLIVE-04 (inventory reservation).

=====================================================================
SESSION SUMMARY — 2026-10-07 (READ THIS FIRST). Detail per milestone below it.
=====================================================================
This session did five things, in this order. Nothing is Frozen; nothing was run against real Supabase / Cashfree.

1) PROMO-03 — images AND looping video (mp4 / webm) in the homepage promotion banners. CODE COMPLETE, NOT VERIFIED.
   Files modified: src/components/home/PromoBanner.tsx, src/components/admin/promotions/PromotionForm.tsx,
   src/app/actions/promotion.actions.ts, src/components/public/OfferMedia.tsx.
   Created: src/db/sql/030_promo03_video_banner.sql (widens allowed mime types of the promotion-logos bucket).
   Banner-3 fix: videos were only play()-ed once at page load while still off-screen, so the lowest banner never played.
   OfferMedia now plays when >=25% visible and pauses when not (IntersectionObserver), retries on canplay, preload="auto".
   Reuses OfferMedia (RULE 1/9). Limit stays 5MB. tsc PASS (whole project, later run). ESLint NOT run on these four files.
   Not verified: uploading an mp4 in /admin/promotions; playback on a real phone for slot 3; migration run.

2) TECH DUE-DILIGENCE AUDIT + Bible Section L (documentation only, no code). Report (published page):
   https://claude.ai/artifact/SmompUqo7n9gtvTqDu4FjM  — verdict ~55% launch ready; 17 critical items.
   DEVELOPMENT_BIBLE.md now has Section L = GO-LIVE roadmap GOLIVE-00 .. GOLIVE-21, owner decisions D1-D7, a go/no-go table.
   (Section K already existed = CONTACT-03, so the new one is L.)

3) PARTNER-TERMS-01 — hotel Partner Terms + 20% commission agreement. CODE COMPLETE, NOT VERIFIED.
   Created: src/app/partner-terms/page.tsx, src/lib/repositories/partner-terms.repository.ts,
   src/db/sql/031_partner_terms_acceptances.sql (table partner_terms_acceptances, RLS on, no policy).
   Modified: src/lib/payments/commission.ts (+PLATFORM_COMMISSION_PERCENT, +PARTNER_TERMS_VERSION; the 20% rate and the webhook
   split are unchanged), src/app/actions/property-listing.actions.ts (agreedToPartnerTerms must be true, checked on the server;
   acceptance row written BEFORE the vendor is created, then linked), src/components/public/PropertyListingForm.tsx (required
   tick-box), middleware.ts (/partner-terms public), src/app/sitemap.ts, src/data/home.ts (footer link).
   tsc PASS; ESLint PASS on changed files except ONE PRE-EXISTING error (PropertyListingForm.tsx ~line 369, unescaped
   apostrophe in "you're") which was left alone. Not verified: next build; browser test (untick -> blocked, tick -> row saved);
   migration 031 NOT run. The page text is a DRAFT and needs lawyer review. Existing hotel owners have NO acceptance row
   (see GOLIVE-13 step 6b).

4) GOLIVE-01 — payment creation order + expiry.   CODE COMPLETE, NOT VERIFIED (entry below).
5) GOLIVE-02 — Cashfree webhook state machine.    CODE COMPLETE, NOT VERIFIED (entry below).

OPEN QUESTIONS / WARNINGS FOR THE NEXT SESSION
 a) MIGRATION NUMBER CLASH. This file already records 030_destination_images.sql (DEST-IMG-01). This session also created
    030_promo03_video_banner.sql and 031_partner_terms_acceptances.sql. Look at src/db/sql/ in the REAL repo, renumber the two
    newer files to the next free numbers, then run them (both are idempotent, independent of each other). RULE 32/35.
 b) middleware.ts sits at the repo root while the app uses src/app. Next.js looks for middleware next to app, so it may be
    IGNORED (SESSION_HANDOFF already lists this as "LAUNCH-01 risk A"). Test on the live site: open /dashboard logged out; it
    must redirect to /login. If not, move the file to src/middleware.ts (or src/proxy.ts on Next 16). Bible GOLIVE-00 step 5.
 c) CHANGELOG says LAUNCH-02 added a Grievance Officer block to LegalPage.tsx; it was NOT in the audited ZIP
    (grep -i grievance src returned nothing) and GRIEVANCE_OFFICER_NAME is unset. Check GitHub; re-apply if missing.
 d) Stale root files still in the ZIP (home.ts, root lib/ and components/, "next.config (2).ts", gitignore, root .env which is
    only a copy of env.ts, src/lib/data/home.ts, "hotel.repository.ts ts"): git rm them (already an open item above).
 e) Money-path facts the audit proved and the Bible plans to fix (Section L): no inventory reservation (overbooking possible),
    no refund flow, guest checkout cannot pay, RLS not provable from the repo (only 8 of 22 SQL files enable it), no account
    deletion, no rate limiting, no reconciliation cron, stale src/app/api/health/route.ts (an old copy of the webhook).
 f) OWNER DECISIONS STILL NEEDED (Bible L.0): D1 guest checkout keep/remove; D2 rate limiting on AI chat + booking + contact;
    D3 email provider timing; D4 refund mode (admin-initiated); D5 Grievance Officer name/phone; D6 WhatsApp/SMS provider;
    D7 PWA-only or Play Store at launch. Also ask the CA about GST/TCS/TDS on commission and payouts (GOLIVE-14), and a lawyer to
    review /partner-terms, /privacy, /terms, /refund-policy.
 g) Commission clause assumptions to confirm: commission is on the amount the guest actually PAID (after coupon); bookings must
    not be taken outside the platform; payout dates are not promised anywhere.

FILES TO REPLACE / ADD IN THE REPO (everything delivered this session)
  Docs (repo root):  DEVELOPMENT_BIBLE.md, PROJECT_STATUS.md, CHANGELOG.md, SESSION_HANDOFF.md
  PROMO-03:          src/components/home/PromoBanner.tsx, src/components/admin/promotions/PromotionForm.tsx,
                     src/app/actions/promotion.actions.ts, src/components/public/OfferMedia.tsx,
                     src/db/sql/030_promo03_video_banner.sql (renumber, see (a))
  PARTNER-TERMS-01:  src/app/partner-terms/page.tsx (delivered as PartnerTermsPage.tsx), src/lib/repositories/partner-terms.repository.ts,
                     src/db/sql/031_partner_terms_acceptances.sql (renumber, see (a)), src/lib/payments/commission.ts,
                     src/app/actions/property-listing.actions.ts, src/components/public/PropertyListingForm.tsx,
                     middleware.ts (repo root), src/app/sitemap.ts, src/data/home.ts (delivered as data_home.ts)
  GOLIVE-01/02:      src/app/api/public/cashfree/webhook/route.ts (delivered as webhook-route.ts), src/lib/payments/post-payment.ts (new),
                     src/lib/repositories/payment.repository.ts, src/lib/repositories/booking.repository.ts,
                     src/lib/actions/payment.actions.ts, src/lib/cashfree/cashfree.client.ts, src/lib/config/constants.ts
  Optional tests:    _verify/ (4 files, not part of the app, not wired into package.json)
  NOTE: no file was edited by two different milestones this session, so the files above can be replaced independently.

NEXT ACTIONS, IN ORDER
  1. Renumber + run the two migrations (a). Replace the files above. Run `npm run typecheck`, `npm run lint`, `next build` for real.
  2. Cashfree SANDBOX walkthrough (RULE 22): normal pay; fail then success on ONE order; duplicate webhook; amount mismatch;
     confirm exactly one email + one invoice and that the booking is confirmed. Then Frozen-mark GOLIVE-01/02.
  3. Browser check: /partner-terms; /list-your-property untick (blocked) and tick (a row appears in partner_terms_acceptances).
  4. Admin -> Promotions: upload an mp4 and an image; check all three slots, especially the bottom one, on a real phone.
  5. Test middleware (b). Resolve (c) and (d).
  6. Then Bible Section L in order: GOLIVE-03 (reconciliation cron + real /api/health) -> 04 inventory -> 05 expiry -> 06 guest
     checkout (needs D1) -> 07 refunds -> 08 RLS audit -> ... -> 21. One milestone at a time (RULE 11).
=====================================================================

GOLIVE-01 + GOLIVE-02 (2026-10-07) — payment-creation order and webhook state machine. CODE COMPLETE, NOT VERIFIED.
Plan/rules: DEVELOPMENT_BIBLE.md Section L. Touches Frozen PAY-02 to fix confirmed defects (RULE 10).
Files modified: src/lib/actions/payment.actions.ts, src/lib/cashfree/cashfree.client.ts, src/lib/config/constants.ts,
src/app/api/public/cashfree/webhook/route.ts (rewritten), src/lib/repositories/payment.repository.ts (+transitionPaymentStatus),
src/lib/repositories/booking.repository.ts (+confirmBookingIfPending). Files created: src/lib/payments/post-payment.ts.
Migrations: none. New env vars: none. New tables: none.
tsc --noEmit: PASS (real run). ESLint on the changed files: PASS (real run).
Functional walkthrough = SIMULATED ONLY (vitest, in-memory DB with conditional-update semantics, mocked Cashfree/Supabase; files in
_verify/, not part of the app). 20/20 pass: order is payments-row THEN Cashfree order; Cashfree failure closes the row as failed; DB
failure creates no order; retry refused only when earlier order is PAID; FAILED then SUCCESS confirms (P1); USER_DROPPED then SUCCESS
confirms; confirm fails once -> 500 -> retry heals, side effects once (P2); duplicate and simultaneous SUCCESS -> side effects once; late
FAILED cannot overwrite SUCCESS; amount mismatch rejected; FLAGGED stays pending; paid-but-booking-cancelled logs REFUND OR MANUAL REVIEW;
double payment logged; numeric cf_payment_id stored; unknown order 200; bad signature 400; Cashfree call times out at 15 s; error log
carries only code/type/message.
Not verified: (1) a real sandbox payment end to end (RULE 22) incl. fail-then-success on one order; (2) that Cashfree accepts the
order_expiry_time value (ISO string, 30 min); (3) `next build` (this sandbox blocks fonts.googleapis.com); (4) that after() runs the
confirmation email / invoice PDF on Vercel; (5) the new conditional UPDATEs against the real Supabase (PostgREST .in()/.maybeSingle()).
Pending issues: no refund flow (GOLIVE-07); no reconciliation cron, so a webhook that never arrives still needs GOLIVE-03; stale
src/app/api/health/route.ts still present (GOLIVE-03); an older ACTIVE Cashfree order is not terminated when a customer retries.
Migration numbers: this thread also added 030_promo03_video_banner.sql and 031_partner_terms_acceptances.sql, but this file already
records 030_destination_images.sql — check src/db/sql/ in the real repo and renumber before running (RULE 32/35).
NEXT: run the sandbox walkthrough above, then GOLIVE-03.

DEST-IMG-01 (2026-10-06): destination_images table did not exist in the live DB -> admin images page error;
destinations also has no thumbnail/banner columns. Run src/db/sql/030_destination_images.sql, then upload a photo in
/admin/destinations/<id>/images and confirm it shows on the homepage destination circle/card and /destinations/<slug>.
Files: src/db/sql/030_destination_images.sql, src/lib/repositories/destination.repository.ts,
src/app/actions/destination.actions.ts, src/components/admin/destinations/DestinationImageManager.tsx.
028 + 029 were run and verified (2026-10-06).

HOME-REDESIGN-02 Phase 2 Step 01 + ADMIN-MOBILE-02 + CHAT-03 follow-up (2026-10-06) — see CHANGELOG.
Files: src/components/home/Destinations.tsx (story circles + portrait cards); src/app/admin/layout.tsx
+ src/app/globals.css (admin phone CSS); src/app/actions/ai-assistant.actions.ts (Gemini model fallback).
NOT VERIFIED: build/tsc/eslint never run; check "/" and /admin/hotels on a real phone; chatbot reply after
GEMINI_API_KEY (+ optional GEMINI_MODEL) in Vercel and a redeploy.
NEXT: Phase 2 Step 02 = quick date chips in HotelSearchBar (inspect its props first), then 03 recently
viewed hotels, 04 Offers/Trending phone polish. Owner to-do: move 028_referral01_referrals.sql from the repo
root into src/db/sql/ and run it, plus 029_offers_video_banner.sql, in Supabase. Biggest business risk still
open: NO refund flow in code (refunds are manual, 7-day promise).

LAUNCH-06 (2026-10-06) — restored src/app/admin/offers/[id]/edit/page.tsx (it
had been overwritten by the public offer-detail page; see CHANGELOG).
IMPORTANT: make sure BOTH files exist in the repo: the admin edit page above
AND src/app/offers/[id]/page.tsx (public). Lesson: always check the
"ROOT PATH:" header before pasting a file. Functional check NOT DONE:
admin -> Offers -> Edit opens the form with the saved banner and hotels.


LAUNCH-05 (2026-10-06) — video banners for offers (see CHANGELOG). Owner must
run migration 029 in Supabase before uploading a video. Functional check
NOT DONE: upload a ~5MB mp4 in /admin/offers, confirm it autoplays muted on
a real phone (home strip, /offers, /offers/[id]). Also: owner reported
/offers/[id] still 404 — cause is that no deploy containing that page had
succeeded yet (the Vercel build was red: LAUNCH-04). Re-test after a green build.


LAUNCH-04 (2026-10-06) — Vercel build was red because two HOME-REDESIGN-01
components (DemoAdCarousel, SceneArt) were never committed. Removed the
demo-only homepage pieces instead of recreating them (see CHANGELOG).
Files modified: src/components/home/PromoBanner.tsx, src/app/page.tsx,
src/data/home-demo.ts, src/app/globals.css (+ docs). Files to DELETE with
git rm: src/components/home/CouponStrip.tsx, src/components/home/PartnersStrip.tsx.
Next build NOT RUN here — the real result is the next Vercel build.
OWNER DECISION NEEDED: the redesigned homepage planned a coupon strip and
partners strip. If wanted, they must be rebuilt on REAL data (public
coupons, real partners) rather than demo content.


LAUNCH-03 (2026-10-05) — link audit fixes. Files created: src/app/offers/[id]/page.tsx.
Files modified: src/app/destinations/[slug]/page.tsx, src/app/offers/page.tsx,
src/components/home/Navbar.tsx, middleware.ts, CHANGELOG.md, SESSION_HANDOFF.md.
tsc/eslint/build: NOT RUN. Functional check NOT DONE — on a real deploy:
(1) tap "Book now" on an offer -> detail page opens logged-out, shows its
hotels; (2) /offers/not-a-uuid -> 404; (3) a destination page shows the
button and its hotels (hotels match on hotels.city ilike destination name —
if a destination's name differs from the hotels' city text the list is
empty and the empty state shows); (4) Navbar has only live links; check all
on a real phone width.
OPEN FROM THE AUDIT (not done): no /packages/[id] detail page (cards go
straight to /book); Hero tabs "coming soon"; v37 zip still contains stale
root files (lib/, components/, home.ts, gitignore, "next.config (2).ts",
src/lib/data/home.ts) -> git rm them; 028_referral01_referrals.sql sits at
the repo root, move to src/db/sql/ and confirm it was run in Supabase;
.env.example lacks NEXT_PUBLIC_SITE_URL / AISENSY_API_KEY entries; the
middleware.ts-at-root location question (LAUNCH-01 risk A) is still open.


HOME-REDESIGN-01 (2026-10-05) — Phase 1 CODED, NOT VERIFIED. Full plan/rules: HOMEPAGE_BIBLE.md.
Owner decision: put DEMO content now; owner replaces it later from the admin panel one by one.
Built: src/data/home-demo.ts (SHOW_HOME_DEMO switch + sample ads/coupons/partners), ServicesGrid,
CouponStrip, PartnersStrip, HostBanner, PromoBanner demo fallback ("Sample ad" when a slot has no
real promotion), Hero mobile tweaks (tab row hidden <sm, tighter spacing), page.tsx order.
Also earlier this session: room detail page restyled like the hotel page (+ HotelGallery fallbackHref).
BEFORE DEPLOY: npm run build / tsc / eslint (never run); look at / on a real phone and /hotels/<slug>/rooms/<id>.
BEFORE REAL LAUNCH OF ADS: set SHOW_HOME_DEMO=false (demo coupon codes are not valid at checkout).
NEXT: Phase 2 (destination story circles, date chips in HotelSearchBar, recently viewed) then
Phase 3 (needs SQL for new promotion slots/format + sponsored hotel cards + partners table).
Known data issues seen on live: a room priced INR 1 (test price) and a room with
capacity_children 2 but max_occupancy 2 — fix in admin.

REFERRAL-01 (2026-10-05) — Refer & Earn CODED, NOT VERIFIED. Owner decisions:
referrer gets % coupon; reward on friend's first PAID booking; friend also gets
a % coupon. Full file list + design in CHANGELOG.md 2026-10-05 REFERRAL-01.
BEFORE DEPLOY: (1) run src/db/sql/028_referral01_referrals.sql in Supabase, then
confirm with information_schema.columns that coupons.owner_user_id /
is_single_use and tables referral_codes / referrals exist (RULE 13/35);
(2) npm run build / tsc / eslint (never run); (3) walkthrough: user A opens
/referral -> copy link -> private window register via /register?ref=CODE ->
check referrals row (status signed_up) + friend coupon in coupons -> confirm
email, login, book + pay -> webhook -> referrals row rewarded + referrer coupon
visible on A's /referral -> apply coupon at checkout as A (works) and as B
(rejected: not valid for your account) -> reuse after a paid booking (rejected).
Assumption to verify live: public.users row (with auth_user_id) already exists
when signUp() returns — if not, the referral is skipped and logged
("[registerAction] referral ... failed"/"not recorded").
Defaults to confirm with owner: 10%/10%, cap INR 1000, 90-day validity
(src/lib/referrals/referral-config.ts).

LAUNCH-02 (2026-10-05) — OWNER DECISIONS RECORDED: refunds within 7 days of
approved cancellation; legal pages accepted by owner; Cashfree is live and
real bookings are happening (so refunds are a live obligation — there is
still NO refund flow in code, refunds are manual); Gmail SMTP stays until
~200 bookings/month; wants CAPTCHA on signup/listing; wants a referral
program (NOT built yet — awaiting reward decision, see below).
Built: Turnstile CAPTCHA (see CHANGELOG). tsc/eslint/build NOT RUN.
To activate: create a free Turnstile widget at dash.cloudflare.com, add the
domain, then set NEXT_PUBLIC_TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY in
Vercel and redeploy. Until both are set CAPTCHA is OFF (logged warning).
Functional walkthrough NOT DONE: register + list-your-property with the keys
set, and with them unset.
Still needed from owner: Grievance Officer's name (set GRIEVANCE_OFFICER_NAME
in src/components/legal/LegalPage.tsx).
REFERRAL: see REFERRAL-01 entry directly below (now coded).


PROMO-02 (2026-10-05) — PromoBanner restyled so the uploaded creative is the
whole ad (reference: houserenter.in homepage banners). Files modified:
src/components/home/PromoBanner.tsx (+ CHANGELOG.md, SESSION_HANDOFF.md).
tsc/eslint/build: NOT RUN (no node_modules in sandbox). Functional check
NOT DONE: upload 1-2 real creatives in /admin/promotions for each slot and
view the homepage on a phone. Operational guidance for creatives: put the
CTA inside the image; use the same aspect ratio within one slot (images
are not cropped, so mixed ratios make the slot height jump while sliding);
suggested ~1200x600 (2:1) or ~1200x440 (wide strip), JPG/WebP, under ~300 KB.
Slot "between_packages_testimonials" still exists but Testimonials was
unmounted in LAUNCH-01 — it now sits between Packages and the footer area.
Pending: DB slot name left unchanged on purpose (RULE 8 / no migration).


Continuation (2026-10-05, new chat session) — owner email migration, full
pre-launch audit, then LAUNCH-01 cleanup on explicit sign-off.

ADMIN-EMAIL-01 — DONE. Only 3 hardcoded occurrences of the old email existed
(footer supportEmail x2 duplicate files, ORG_CONTACT in seo/site.ts). No
email-based admin check exists; admin = user_roles (admin/super_admin).
Owner ran SQL in Supabase to grant admin+super_admin to
safarbuddytravel@gmail.com. Login still showed /unauthorized until the
public.users.auth_user_id link for that account was repaired (resolvePublicUserId
in src/lib/auth/session.ts matches on auth_user_id, NOT users.id). Owner then
confirmed /admin opens. Old account's roles NOT yet revoked (owner's call).
Cashfree: untouched. Still to do on owner side: set
ADMIN_NOTIFICATION_EMAIL=safarbuddytravel@gmail.com in Vercel env and redeploy.

LAUNCH-01 — see CHANGELOG.md 2026-10-05 for the full file list.
Files modified: src/app/page.tsx, src/components/home/Footer.tsx,
src/data/home.ts, src/lib/config/constants.ts, src/app/layout.tsx,
src/app/sitemap.ts, middleware.ts, package.json, .env.example.
Files created: src/components/legal/LegalPage.tsx, src/app/privacy/page.tsx,
src/app/terms/page.tsx, src/app/refund-policy/page.tsx.
Files deleted: see CHANGELOG (root home.ts, root lib/, root components/,
"next.config (2).ts", "gitignore", root ".env", src/lib/data/home.ts).
TypeScript (tsc --noEmit): NOT RUN — no node_modules and no network in this
sandbox. Only a syntax-level parse of the changed files was run: clean.
ESLint: NOT RUN (same reason). next build: NOT RUN.
Functional walkthrough: NOT DONE. Must check on a real deploy: homepage
renders without the removed sections; footer shows only live links;
/privacy, /terms, /refund-policy open logged-out (middleware allowlist) and
are in /sitemap.xml; no stale imports of deleted files.
New env vars: none. New tables/migrations: none (RLS n/a).
Pending / not verified (RULE 23): everything above marked NOT RUN.

OWNER DECISIONS NEEDED (nothing was invented):
1. Real cancellation/refund terms (windows, %, refund timeline, gateway-fee
   handling). refund-policy page is deliberately generic.
2. Named Grievance Officer (required for Indian e-commerce) — currently only
   the support email/phone are listed.
3. Governing-law/jurisdiction (draft says Lucknow courts) and 18+ age rule.
4. Lawyer review of /privacy, /terms, /refund-policy before launch.
5. Testimonials/stats/newsletter/app-download: re-add only with real data
   (real reviews, real newsletter provider, a real app). Social links: add
   real URLs to footerSocialLinks (they are hidden while href is "#").

TOP RISKS FOUND BY THE AUDIT, NOT FIXED THIS SESSION (do next, in order):
A. middleware.ts sits at the repo ROOT while the app uses src/. Next ignores a
   root middleware when src/ exists (and Next 16 renames it proxy.ts). It may
   not be running at all. Verify on the live site (logged-out visit to
   /dashboard should redirect to /login) BEFORE moving it — moving it changes
   behaviour for the whole site (RULE 12: not changed blindly).
B. Cashfree still defaults to sandbox; no refund flow; no real paid booking
   walkthrough (RULE 22). Production keys + one real end-to-end payment needed.
C. Migrations 011/012 etc. still flagged "not run in production" in older
   entries — confirm against information_schema (RULE 35).
D. Email is Gmail SMTP (personal app password, ~500/day). Move to Resend/SES
   on a domain with SPF/DKIM.
E. No rate limit/CAPTCHA on /list-your-property and signup (creates accounts
   via service role). Guest invoice/confirmation rely on the booking UUID only.
F. Password minimum is 6; no CSP/HSTS headers; no Sentry/analytics; zero
   automated tests; dangerouslyAllowSVG + picsum.photos in next.config.ts.
G. Run npm install, tsc --noEmit, eslint, next build for real before deploy.


Continuation (2026-09-20, new chat session — picks up item 4a
(PROMO-01) from the "WHAT TO DO FIRST NEXT SESSION" list right below
this entry; does not answer items 2/3/4-sequencing, only started
PROMO-01 on explicit instruction, popups explicitly still out of
scope per the prior entry's own decision)

MIGRATION NUMBER — RESOLVED, RENUMBERED 024: originally shipped this
session as 023 (guessing 017-022 were taken by the separate
VENDOR-03-overhaul thread not present in this repo zip). Project
owner confirmed live in chat that 017-023 are ALL already run in
Supabase — 023 specifically was taken by something else, not this
table. The file was renamed to 024_promo01_promotions.sql and its own
header comment corrected to record what was actually run (RULE 32 —
the on-disk file must match live reality, not the session's original
guess). The `promotions` table + the two SECURITY DEFINER functions
are confirmed already live in Supabase under this SQL. GitHub/Vercel
do NOT have any of this session's code yet — that push is still
outstanding, separate from the DB being ready.

Built this session — PROMO-01 (banner ads), 3 homepage slots (after
Hero/before Offers, between Destinations and Trending, between
Packages and Testimonials), per the plan already recorded below.
Inline auto-sliding cards (still explicitly not popups), "Sponsored"
badge, click-through in a new tab, impression + click tracking.

New: src/db/sql/024_promo01_promotions.sql (promotions table — hotel_id
nullable FK to hotels for when a SafarBuddy hotel is the advertiser,
company_name/logo_image/click_url, slot_position CHECK-constrained to
the 3 agreed slots, start_date/end_date, is_active, click_count/
impression_count; RLS public-read scoped to active+in-range rows only,
same pattern as 011's hotel_facilities; two SECURITY DEFINER SQL
functions — increment_promotion_impression/click — so an anon visitor
can bump a counter atomically without a general UPDATE grant on the
table). src/lib/repositories/promotion.repository.ts (BaseRepository
subclass, mirrors OfferRepository/ADMIN-08 exactly for the admin CRUD
half; getActivePromotionsForSlot() is a raw query, not
BaseRepository.findMany(), because "start_date/end_date IS NULL OR
<=/>= today" is an OR-of-ANDs the generic filter chain can't express —
date validity is re-checked in JS after fetch, which is
defense-in-depth on top of the RLS policy already enforcing the same
rule server-side, not the only guard). src/app/actions/promotion.actions.ts
(getActivePromotionsForSlot/trackPromotionImpression/trackPromotionClick
— all three deliberately have NO requireRole(), since an anonymous
homepage visitor must be able to see and be counted; safety comes from
the RLS read policy + the counters only ever going through the two
SQL functions, never a direct column UPDATE; the two tracking
functions are best-effort/never throw, same resilience contract as
CONTACT-02's notifyBookingCreated. Admin half — getAllPromotionsAdmin/
getPromotionByIdAdmin/create/update/deletePromotionAdmin — is
requireRole(['admin','super_admin']) + createServiceRoleClient(),
mirrors offer.actions.ts; admin list uses the service-role client
specifically so inactive/expired rows still show up for review, which
the public RLS policy would otherwise hide). src/components/home/PromoBanner.tsx
(client component, one per slot, renders nothing when a slot has no
active promotions — no empty card/layout shift; auto-slides every 6s
only when >1 card; fires one impression per card via a ref-backed
"already sent" set, not on every re-render). src/components/admin/promotions/PromotionForm.tsx
+ src/app/admin/promotions/{page.tsx,new/page.tsx,[id]/edit/page.tsx}
(CRUD UI, mirrors OfferForm/admin/offers exactly). Modified:
src/app/page.tsx (three <PromoBanner slot="..."/> placements at the
agreed positions), src/app/admin/page.tsx (new "Promotions" dashboard
card).

Deliberately not done: RANK-01 (paid featured ranking) — separate
milestone, not started, sequencing with PROMO-01 was never
reconfirmed by the project owner (see the still-open note in the
2026-09-19 continuation below); this session only had explicit
instruction for the homepage/PROMO-01 piece. No hotel-picker dropdown
for the optional hotel_id field on the admin form — plain text UUID
input instead, consistent with this project's existing minimal-scope
pattern (e.g. LOCATION-01's plain-text Google Maps URL) rather than
building a new hotel-search-select component for this milestone.

Verified for real this session — npm install succeeded (registry
reachable), `npx tsc --noEmit` clean (whole project), `npx eslint .`
clean except the two pre-existing, untouched errors/warning already
on record (ProfileMenu.tsx effect-setState lint rule, PropertyListingForm.tsx
unescaped apostrophe — neither touched here). `npm run build`
(Turbopack) reached the same pre-existing sandbox-only Google Fonts
403 documented in every prior session's build attempt (see the
2026-09-11/CHAT-02 entries) — not a real bug, unrelated to this
change.

NOT verified: migration 024 is reported run live (see above) but not
independently confirmed via information_schema.columns from this
sandbox (no reachable Supabase here). No live walkthrough yet of an
actual banner rendering, auto-sliding, or a real click/impression
count incrementing — and none of this session's code is on
GitHub/Vercel yet, only in Supabase.

Next action: (1) confirm 024 via information_schema.columns if not
already done; (2) push this session's files to GitHub and redeploy;
(3) create one real promotion row via /admin/promotions/new and
confirm it renders in its slot on the live homepage, auto-slides if a
second one is added, and that clicking it increments click_count while a
plain page view increments impression_count; (4) once confirmed,
return to the still-open items from the entry below (RANK-01
sequencing, ANTHROPIC_API_KEY, the invoice display bug, AI-mediator
scoping) — none of those were touched this session.

Continuation (2026-09-20, NEW thread — picks up after the 2026-09-19
invoice/CHAT-01 thread immediately below; does not replace it)

Started from a request to turn the existing post-booking human chat
(CHAT-01) into an AI mediator. Ended up covering four separate things,
in this order — READ THE "NOT DONE YET" NOTE AT THE BOTTOM BEFORE
STARTING NEW WORK, it changes what "next" means here.

1. INVOICE DISPLAY BUG — DIAGNOSED ONLY, NOT FIXED. Project owner
   reported the invoice doesn't show right after booking. Code review
   (not a live test) found two contributing issues: (a) invoices are
   generated asynchronously by the Cashfree webhook, so there's a race
   — the customer can land on /booking-confirmation/[id] before the
   invoice row exists yet; (b) that confirmation page has no link to
   the invoice at all regardless of timing. NEITHER issue was
   fixed — no code touched for this item. Likely candidate for a small
   INVOICE-02 milestone: add a link from booking-confirmation to
   /dashboard/bookings/[id]/invoice, and either poll/retry there or
   show a "generating your invoice..." state instead of the current
   flat "no invoice yet" message. NOT cross-checked against the
   2026-09-19 entry below, which was ALSO chasing an invoice
   not-showing bug from a live test — these may be the same underlying
   bug seen two different ways, or two different bugs. Next session:
   check both entries before assuming which.

2. CHAT-02 Step 1 — homepage AI assistant widget. SHIPPED, VERIFIED
   CLEAN (tsc --noEmit, eslint, and a real `npm run build` — Turbopack,
   same as Vercel — all pass; only remaining build output is the
   pre-existing sandbox-only Google-Fonts 403, not a real bug, see
   2026-09-11 entries for precedent on that same warning). Deliberately
   narrow scope, decided explicitly: general FAQ only (how booking
   works, hotels/packages, redirects "ask about your specific booking"
   to logged-in My Bookings → CHAT-01's existing per-booking chat). NO
   booking data access, no tool-calling. The actual AI-mediator
   behavior discussed at length (AI reading a real booking, fetching
   the invoice PDF inside the chat, relaying messages to the hotel) is
   SEPARATE, LATER, SCOPED TO booking-chat.actions.ts /
   BookingChatThread.tsx, and has NOT been started — CHAT-02 Step 1
   only touches the public homepage.
   Files: src/app/actions/ai-assistant.actions.ts (new),
   src/components/home/HomeAiChatWidget.tsx (new, wired into
   src/app/page.tsx only — not RootLayout, homepage-only was an
   explicit requirement), ANTHROPIC_API_KEY added as optional to
   src/lib/config/env.ts + src/types/env.d.ts + .env.example (RULE 30
   pattern: missing key doesn't throw, widget shows a graceful
   "not configured yet" reply). Widget/button visual language matches
   Navbar's orange CTA + BookingChatThread's bubble shapes — not a new
   design system.
   NOT DONE: ANTHROPIC_API_KEY has NOT been created or added to Vercel
   yet (project owner deferred this — see item 4). Until it is, the
   widget renders and functions but always returns the "not configured
   yet" placeholder line, never a real AI answer.

3. BUILD-BLOCKING BUG FOUND AND FIXED (unrelated to the AI ask, found
   from a real Vercel build log the project owner pasted in). Turbopack
   rejected the build with "the name `Alert` is defined multiple
   times" in src/app/hotel-owner/page.tsx and
   src/app/hotel-owner/images/page.tsx — both files import the shared
   `Alert` from @/components/auth/Alert AND separately declare a local
   `function Alert(...)` lower in the same file (leftover duplicate,
   not something this thread's changes caused). Fixed by deleting the
   local duplicate in both files; the shared component's default
   ("info" variant) renders the exact same classes the local one used,
   so no visual change. Confirmed via tsc --noEmit, eslint, AND a full
   `npm run build` — this is the fix that got Vercel's specific pasted
   error to go away, not a guess.

4. NEW SCOPE — deeply planned, NOTHING BUILT YET, NOT EVEN A MIGRATION:
   Two separate monetization features, discussed back-to-back:

   a. PROMO-01 (banner ads): 3 homepage slots — after Hero/before
      Offers, between Destinations and Trending, between Packages and
      Testimonials. Inline auto-sliding carousel cards (NOT popups —
      explicitly decided against popups for UX reasons), ticket-notch/
      hover-lift styling to match the rest of the homepage, a visible
      "Sponsored"/"Promoted" badge for disclosure, click-through to an
      external advertiser URL in a new tab, impression + click
      tracking. Planned (not created) new `promotions` table:
      hotel_id (optional — a SafarBuddy hotel can also be the
      advertiser), external company name/logo image/click_url,
      slot_position, start_date/end_date, is_active, click_count,
      impression_count. Plus a new admin management page (not built).

   b. RANK-01 (paid featured ranking) — separate from PROMO-01, added
      when the project owner asked specifically about hotels paying to
      rank higher. Planned (not created): hotels.is_featured (bool),
      featured_until (date, auto-expiry), featured_priority (number,
      for ordering when several hotels are featured at once). Featured
      hotels sort first wherever hotels are listed (search results,
      Trending, Destinations) — plan is one shared
      sortHotelsWithFeatured() helper used everywhere rather than
      duplicating the sort rule per page. A "Featured"/"Sponsored"
      badge on the listing itself was explicitly agreed for the same
      disclosure reason as PROMO-01. Admin control: a toggle +
      date-range picker on the existing hotel edit form.

   SEQUENCING NOT RECONFIRMED: this session's last exchange proposed
   building PROMO-01 first, but the project owner's very next message
   only asked for this handoff — they have not explicitly re-confirmed
   PROMO-01-before-RANK-01 after RANK-01 was added to scope. Ask before
   assuming.

WHAT TO DO FIRST NEXT SESSION, IN ORDER:
1. Confirm which of PROMO-01 / RANK-01 to build first (see sequencing
   note above) — don't assume PROMO-01 just because it was proposed
   first.
2. Ask whether ANTHROPIC_API_KEY has been created/added to Vercel yet
   (item 2's "not done" note) — if yes, do a live smoke-test of the
   homepage widget before building anything else AI-related on top of
   it.
3. Item 1 (invoice display bug) is still open and undiagnosed-in-code
   — was only ever discussed, never touched. Cross-check against the
   2026-09-19 entry below before starting, per that item's note.
4. The real AI-mediator work inside CHAT-01 (booking-chat.actions.ts /
   BookingChatThread.tsx) has not been scoped into a written
   audit/plan yet the way this project's other milestones get one —
   do that (RULE 15 style) before writing any code for it, same as was
   done for CONTACT-01/PROFILE-01 earlier in this project.

Continuation (2026-09-19, same thread as the milestone immediately
below — extends it, does not replace it)

Picked back up after a live test surfaced two real, separate problems
that the milestone below had not yet covered, plus one explicit new
ask:

1. Debugged "No invoice has been generated for this booking yet"
   showing for a real paid booking. Confirmed via the live app, in
   order: (a) the `booking_notifications` table existed (user had
   already run the CONTACT-03 thread's corrected migration — a
   DIFFERENT table from anything in this thread); (b) hotel/admin
   emails WERE arriving for the booking in question, which narrowed
   the problem specifically to the invoice code path rather than the
   webhook as a whole; (c) never got to a confirmed root cause on one
   exact line in this thread — kept asking for real Vercel Runtime
   Logs, which were never actually pasted back. NEXT SESSION: get
   those logs before touching invoice code again — don't re-guess.

2. CUSTOMER-NOTIFY-01: project owner pointed out the paying customer
   themselves gets no email/invoice at all (correct — confirmed by
   reading the code, only hotel/vendor + admin ever did). Built
   notifyCustomerBookingConfirmed() in dispatch.ts, wired into the
   Cashfree webhook right after invoice generation, with the PDF
   attached when generateInvoiceForBooking() succeeded (best-effort —
   still sends the email without an attachment if it didn't, since
   that's the very bug being chased in item 1). Real, deliberate gap
   left in place: NOT logged to booking_notifications, because that
   table's recipient_type CHECK constraint is ('hotel','vendor','admin')
   only — 'customer' would violate it. A one-line migration would add
   it; not done here, only flagged.

3. A real screenshot (INR 1 test booking) confirmed the invoice PDF
   itself DOES render correctly end-to-end via the existing pipeline
   once an invoice row exists — subtotal/taxes/discount/amount all
   correct, SB-INV-000008. This is the first real visual confirmation
   in this thread that invoice generation works AT ALL when it works —
   useful context for next session: the bug in item 1 is intermittent
   or condition-specific, not "invoice generation is broken outright".

4. Project owner then asked for three visible improvements to that
   same PDF, all shipped: (a) LOGO-01 — a real embedded image logo,
   not text. Web view uses the actual site SVG directly (trivial,
   browsers render SVG natively). The PDF needed more: @react-pdf/
   renderer's <Image> only accepts PNG/JPG, so a new `sharp` dependency
   (added to package.json — NOT YET INSTALLED, npm install never ran,
   see verification note below) converts the SVG to a PNG buffer at
   render time (new file, src/lib/invoices/logo.ts), cached per server
   instance, falling back to the previous text wordmark if conversion
   ever throws. (b) Check-in/check-out TIME on the invoice, not just
   date — new check_in_time/check_out_time columns on invoices
   (migration 022), copied from the hotel at generation time (the
   hotel's own check_in_time/check_out_time columns are themselves
   from this same thread's earlier PROPERTY-META-01 work). (c)
   Cancellation policy in small print at the bottom — new
   cancellation_policy column on invoices (same migration 022), copied
   from hotels.cancellation_policy (POLICY-01, also earlier this
   thread). Both (b) and (c) simply don't render their section when
   null — an older invoice, or a hotel that never filled these in,
   shows no gap or placeholder.

VERIFICATION STATUS FOR ITEM 4 — WORSE THAN THE REST OF THIS THREAD,
SAY SO EXPLICITLY NEXT SESSION: this sandbox had no network at all
(confirmed: `npm install` impossible) AND no working local SVG
rasterizer either (checked and confirmed absent one by one:
rsvg-convert binary, cairosvg Python package, gi.Rsvg PyGObject
typelib — ImageMagick's own SVG delegate failed for exactly this
reason). The sharp-based logo.ts conversion path has literally never
been executed, not even once, by anything. Treat the PDF logo as
"probably fine, sharp+SVG-input is a very standard combination" but
NOT confirmed until someone opens one real generated invoice PDF and
visually sees the actual logo image rather than the word "SafarBuddy"
in text. If it fails, the fallback (text wordmark) still fires — it
will not break invoice generation, but it may silently keep showing
the old fallback and nobody would necessarily notice.

Files changed this continuation (on top of the milestone below, which
already listed its own files separately): email.client.ts
(attachments support), generate-invoice.ts (exports resolveRecipient,
accepts checkInTime/checkOutTime/cancellationPolicy), dispatch.ts
(new notifyCustomerBookingConfirmed export), cashfree webhook
route.ts (wires both the customer email and the three new
generateInvoiceForBooking fields), invoice.repository.ts
(check_in_time/check_out_time/cancellation_policy on both
InvoiceRecord and CreateInvoiceInput), invoice-view-model.ts
(cancellationPolicy pass-through, stayOrTravelValue now includes
times), InvoiceDocument.tsx (Image support + policy footer),
InvoiceView.tsx (real SVG logo + policy footer), render-invoice-pdf.ts
(fetches the logo, passes it down), new file logo.ts, package.json
(added `sharp`). New migration: 022_invoice01_snapshot_extras.sql.

Next action, in order: (1) run migrations 017-022 if any aren't
already live — ask, don't assume, several were already confirmed run
earlier in this thread but 022 is brand new; (2) `npm install` for
real so `sharp` actually resolves; (3) one real paid booking,
capturing actual Vercel Runtime Logs this time if invoice generation
still doesn't fire — that log is the one thing this entire
continuation still doesn't have; (4) open the resulting invoice PDF
and visually confirm the image logo renders.

---

Current milestone

VENDOR-03 (M2) — "List Your Property" self-service form made fully
professional: rooms, room photos, booking calendar, property
metadata, location link (2026-09-18, chat session, project-owner
driven — "ek taraf se shuru karo" then several explicit follow-up
requests in the same thread). This is a different surface from
INVOICE-01/CONTACT-03 below (separate milestone, separate thread) —
both are current, neither supersedes the other.

Built this session, in order:

1. Facility catalog expansion (017_vendor03_facility_expansion.sql) —
   15 -> 85+ facilities across new categories (room_amenities, dining,
   wellness, business, family, connectivity, safety, accessibility,
   luxury), covering budget to 7-star. Pure seed data, no schema/code
   change (hotel_facilities was already data-driven per migration
   011). Had to be re-issued once — the first version double-quoted
   two labels containing an apostrophe ("Kids' Play Area", "Kids'
   Club"), which Postgres parses as an identifier, not a string
   literal (42703 column-does-not-exist). Fixed with doubled single
   quotes ('Kids'' Play Area').

2. KYC-01 — vendor_kyc_documents table (018), a private Storage bucket
   `vendor-kyc-documents` created via SQL (019, public=false,
   5MB/jpg/png/webp/pdf) rather than the dashboard UI, and
   vendor-kyc.repository.ts. submitPropertyListing() now accepts an
   optional second parameter (aadharFile/panFile/passbookFile),
   uploads each best-effort (one failed document never fails the
   whole submission — reported back via
   PropertyListingResult.kycUploaded so the form can tell the owner
   exactly what to retry), and never exposes a public URL — reading a
   document back is only ever via
   VendorKycRepository.createSignedUrlForDocument() (5 min signed
   URL), which nothing calls yet (see "Not built" below).
   DISINTERMEDIATION-01 (separate small fix, same session, requested
   independently): the hotel/vendor booking-notification email
   (dispatch.ts) no longer includes the guest's phone/email, only
   their name — an admin-only email still gets full guest contact
   details. Reason stated explicitly by project owner: a hotel with
   the guest's direct number could take future bookings off-platform.

3. BOOKING-NUM-01 (small, same session) — the booking/vendor
   notification emails were showing bookings.id (a raw UUID) where
   they meant to show the existing human-friendly booking_number
   (e.g. SB-20260918-A1B2C3, already generated by
   BookingRepository.generateBookingNumber() but never surfaced in
   these emails). Fixed in dispatch.ts + the one real call site
   (cashfree webhook route.ts) by threading a new bookingNumber field
   through NotifyBookingCreatedInput, separate from the existing
   bookingId (still used for the booking_id FK column, never shown to
   a human).

4. ROOMS-01 + CALENDAR-01 — the big one. submitPropertyListing() now
   takes a third parameter, roomImageFiles (index-aligned to
   input.roomTypes). propertyListingSchema.roomTypes is a new
   required array (min 1) of {roomName, roomType, basePrice,
   capacityAdults, capacityChildren, maxOccupancy, bedType,
   roomSizeSqft, totalRooms}. For each room: creates the hotel_rooms
   row (RoomTypeRepository.createRoomType, status 'active'), uploads
   up to 6 photos to the existing `room-images` bucket (mirrors
   uploadRoomImageAdmin()'s logic incl. orphan cleanup on DB-insert
   failure, but best-effort per file like KYC), then bulk-inserts 180
   days of room_inventory (today -> +179 days, total_rooms from the
   form, blocked/booked 0) in ONE insert call — not via
   RoomInventoryRepository.setInventoryForDate() in a loop, since a
   brand-new room has no existing rows/booked_rooms to protect, so
   that method's per-date safety checks don't apply and 180 sequential
   awaits would be needlessly slow. PropertyListingForm.tsx gained a
   repeatable "Rooms" section (add/remove, per-room multi-image
   upload) between Property details and Facilities.
   KNOWN GAP, stated explicitly, not silently worked around: there is
   still NO owner-facing calendar page — only
   /admin/hotels/[id]/rooms/[roomId]/availability (admin-only) can
   extend availability past the 180-day seed. An owner cannot
   self-manage their calendar yet.

5. PROPERTY-META-01 — hotels.property_type / check_in_time /
   check_out_time are confirmed-live columns that NO caller (not this
   form before today, not the admin HotelForm either) has ever set —
   every hotel has been relying on DB defaults. Added to the
   self-service form only (propertyType dropdown — 7 values, product
   choice, NOT a confirmed DB CHECK constraint, unlike
   ROOM_TYPE_VALUES which does mirror a real one; check-in/check-out
   as HH:MM time inputs). Admin HotelForm NOT touched this session —
   same gap still exists there, flagged not fixed.

6. POLICY-01 — new hotels.cancellation_policy / house_rules text
   columns (020_vendor03_hotel_policies.sql), both plain optional text
   (no catalog, no separate table — same reasoning as the existing
   `description` column). Added to the form as two textareas.

7. LOCATION-01 — new hotels.google_maps_url text column
   (021_vendor03_location_link.sql). Deliberately NOT parsed into the
   existing (confirmed-live) latitude/longitude columns — a pasted
   Google Maps link is stored and linked out to verbatim. Reasoning
   recorded in the migration header: shortened maps.app.goo.gl links
   have no coordinates until the redirect is followed, and the
   several longer-form URL patterns aren't worth a fragile regex
   parser for M2. Real lat/long (e.g. via a geocoding API) is a
   separate later task if map-pin/distance search is ever needed.

Migration run order (all still pending in production as of this
handoff): 017 -> 018 -> 019 -> 020 -> 021. 019 creates the
`vendor-kyc-documents` Storage bucket via SQL (insert into
storage.buckets) — confirm it actually appears under Storage in the
dashboard after running it, this project's only prior bucket
(`room-images`) was created through the dashboard UI, not SQL, so this
is the first time bucket-creation-via-migration has been tried here.

NOT verified this session: sandbox network still disabled (same
standing limitation noted in every session in this handoff) — no
npm install / tsc --noEmit / eslint, no live Supabase run of any of
the 017-021 migrations, no real form submission end to end. Every file
above was hand-reviewed against the live schema this session already
had confirmed (HotelRecord, RoomTypeRecord, room-type.actions.ts's
upload pattern, vendor_payout_details' RLS-free pattern) rather than
executed. Treat all of it as unverified until a real Vercel build +
live submission happens.

Next action: run the 5 migrations in order above, replace the 6
changed/new files
(hotel.repository.ts, property-listing.actions.ts,
PropertyListingForm.tsx, vendor-kyc.repository.ts, dispatch.ts,
route.ts — cashfree webhook), redeploy, then do one real end-to-end
"List Your Property" submission with at least one room, one room
photo, and at least one KYC document, and confirm: the hotel +ny room
rows land with the right values, room_inventory has 180 rows for that
room, the KYC storage upload actually lands in the private bucket (not
rejected for missing bucket), and the admin alert email lists the new
"Rooms listed" / "KYC documents uploaded" lines correctly.

After that verification, the explicitly agreed next feature (not
started) is #11 from the session's own checklist: a hotel-level photo
gallery (lobby/exterior/pool — separate from the per-room photos built
this session) — will need its own new table (mirroring
hotel_room_images) since HotelRecord.gallery is a legacy-compat
computed field, not a real column. Also still explicitly deferred, not
forgotten: an owner-facing calendar/availability page (today only
admin has one), and offers/coupons for a self-service listing
(intentionally left for post-approval dashboard work, not the initial
submission form — project owner's own reasoning, recorded above under
item 4's context).

---



INVOICE-01 Step 5a+5b — customer invoice view + PDF download
(2026-09-18, same day, continuation of Step 4 below, same chat
session). User said "Ok karo" to the proposed 5a/5b split.

Built this session: src/app/dashboard/bookings/[id]/invoice/page.tsx
(Step 5a) — same shape as Step 4's admin invoice page, but auth/
ownership follows dashboard/bookings/[id]/pay/page.tsx's existing
customer pattern instead of requireRole(): getAuthUser() -> redirect
/login if unauthenticated, then getMyBookingById() (same
ownership-scoped fetch the Pay Now page already uses) for a generic
"booking not found" message that doesn't distinguish "doesn't exist"
from "not yours". getMyInvoiceByBookingId() (Step 3a) still re-checks
ownership itself too — kept as defense in depth, not removed.
src/app/dashboard/bookings/page.tsx (My Bookings) — added an "Invoice"
link (confirmed/completed only) to BOTH the desktop table AND the
mobile card list — this page has two parallel markup blocks since the
MOBILE-PAYMENT-BUG-01 hotfix, and that fix's own comment says they must
stay in sync, so both were edited, not just one.

src/app/api/invoices/[bookingId]/pdf/route.ts (Step 5b) — new route,
the first thing to actually call renderInvoicePdfBuffer() (Step 3b
built it, nothing used it until now).
Same getMyInvoiceByBookingId() auth as the page; UNAUTHENTICATED ->
401, null invoice (not found / not yours / not paid yet — all three
collapse to one response, same non-leaking reasoning as Step 5a) ->
404, success -> PDF bytes with Content-Disposition: attachment.
Admin download deliberately NOT added (would need its own route or an
auth branch on this one) — out of scope, not asked for.

NOT verified this session: sandbox network still disabled — npm
install/tsc --noEmit/eslint could not be run for real (same as every
INVOICE-01/CONTACT-03 session in this sandbox). All three
changed/new files manually re-read end to end instead. Live checks
still needed: open a confirmed booking's invoice from My Bookings
(desktop AND mobile), click Download PDF and confirm a real PDF comes
back, confirm a pending booking shows no Invoice link and its
/invoice route's message is correct, and hit the PDF route both
unauthenticated (expect 401) and for a booking that isn't the caller's
(expect 404, not a leak).

Next action: run tsc/eslint + all the live checks above (Steps 1-5
together now — this is the first point INVOICE-01 is code-complete
end to end and worth a single full walkthrough rather than checking
each step in isolation). No further INVOICE-01 steps are planned in
DEVELOPMENT_BIBLE.md Section J beyond this.

Correction (same day, user's real Vercel build): `npx tsc` finally ran
for real (via the Vercel build's "Running TypeScript" step, not this
sandbox) and caught a real error —
`src/app/api/invoices/[bookingId]/pdf/route.ts:72`:
`Buffer<ArrayBufferLike>` is not assignable to `BodyInit` in this
project's Next.js 16 / TS lib set (`new NextResponse(pdfBuffer, ...)`
failed to type-check even though Buffer is a Uint8Array subtype at
runtime). Fixed by wrapping it: `new NextResponse(new Blob([pdfBuffer],
{ type: 'application/pdf' }), ...)` — Blob is unambiguously valid
BodyInit. This is the first real toolchain confirmation of anything in
today's session (CONTACT-03 and Steps 4/5a were all manually reviewed
only, this sandbox's network being disabled throughout) — everything
else in those diffs should be treated with correspondingly less
confidence until the same real build gets further than this line.

Next action (revised): re-run the Vercel build. If it passes
TypeScript this time, continue to the live walkthrough checks listed
above — treat every one of them as still fully unverified, this build
only fixed a compile error, it did not exercise any runtime path.

Correction #2 (same day, re-run): the Blob fix above was WRONG — the
next Vercel build failed at the same line with a different error:
`Buffer<ArrayBufferLike>` is not assignable to `BlobPart` either
(`Types of property 'buffer' are incompatible... SharedArrayBuffer is
missing properties from ArrayBuffer`). Root cause, now actually
understood: Buffer's `.buffer` property is typed `ArrayBufferLike`
(a union that includes `SharedArrayBuffer`), while this TS lib set's
`BodyInit`/`BlobPart` both require an `ArrayBufferView` parameterized
specifically over plain `ArrayBuffer` — Blob didn't sidestep the
problem, it hit the same generic mismatch from a different angle.
Fixed properly this time: `new NextResponse(new Uint8Array(pdfBuffer),
...)` — the `Uint8Array(array: ArrayLike<number>)` constructor
overload (constructing from an array-like, not wrapping an existing
buffer) is typed to return `Uint8Array<ArrayBuffer>` specifically,
never `ArrayBufferLike`, which is why this form satisfies both typings
where wrapping in Blob did not. No Blob wrapper needed at all — a
Uint8Array is valid BodyInit directly.

Next action (revised again): re-run the Vercel build once more. Given
two wrong guesses in a row on this exact line, do not assume this is
the last type error in this file (or others) without the build
actually passing — re-check the full build log, not just this line,
next time it runs.

Previous milestone

INVOICE-01 Step 4 — admin UI (invoice view + list link) (2026-09-18,
same day, continuation of CONTACT-03 below, same chat session).

RULE 15 audit before coding: DEVELOPMENT_BIBLE.md Section J's Step 4
plan said "list + link from /admin/bookings detail" — but
/admin/bookings (src/app/admin/bookings/page.tsx) is a flat list, no
[id] detail route exists at all. Backend was already fully ready
though: getInvoiceByBookingIdAdmin() (invoice.actions.ts, Step 3a,
already role-checked via requireRole(['admin','super_admin'])),
buildInvoiceViewModel() and <InvoiceView> (Step 3b) — none of it wired
into any page yet.

Built this session: src/app/admin/bookings/[id]/invoice/page.tsx — new
route, admin-only via getInvoiceByBookingIdAdmin()'s own role check
(UNAUTHENTICATED/FORBIDDEN caught -> notFound(), same pattern as
/admin/settlements/[vendorId]/page.tsx); renders <InvoiceView> when an
invoice exists, a plain "no invoice yet" message when it doesn't (a
booking not yet confirmed/paid, not a 404). src/app/admin/bookings/page.tsx
— added an "Invoice" link in the Actions column, shown only for
confirmed/completed bookings, pointing at the new route. No new
backend logic at all — pure wiring of already-built Step 3a/3b pieces.

Deliberately not done: no PDF download button on the new page — that
needs its own route/handler wrapping renderInvoicePdfBuffer() (Step
3b's server-only PDF wrapper), left for Step 5 (customer UI) or its
own step, not blended in here (RULE 11). No booking-detail page built
either (would have been separate, unasked-for scope) — the invoice
route stands alone instead.

NOT verified this session: sandbox network still disabled (same as
CONTACT-03 below) — npm install/tsc --noEmit/eslint could not be run
for real. Both changed files manually re-read end to end instead. Live
check still needed: sign in as admin, open a confirmed booking's
`/admin/bookings/<id>/invoice` and confirm it actually renders (and
that a pending booking correctly shows no Invoice link, and its
/invoice route shows the "no invoice yet" message rather than
erroring) — none of this has been exercised against a real Supabase
instance.

Next action: run tsc/eslint + the live check above. Then Step 5
(customer-facing invoice view + PDF download) — separate future
session, do not blend with Step 4's admin scope.

Previous milestone

CONTACT-03 — Booking Contact Capture + Admin Payment Notification
(2026-09-18, same day, new chat session). User asked (in Hindi/Hinglish)
for booking-time name+contact capture regardless of login state, plus
an automatic admin + hotel-owner notification right after payment
confirmation, before resuming INVOICE-01 Step 4.

Root cause found on inspection: (1) BookingForm.tsx only showed/
required guest_name/guest_email/guest_phone for `!isAuthenticated` —
a signed-in booking stored all three as null and relied only on the
(possibly stale) public.users profile; (2) CONTACT-02's
notifyBookingCreated() only ever emailed the hotel/vendor —
notifications.recipient_type's CHECK constraint didn't even allow
'admin', so there was no admin email path at all, only a silent
'dashboard' row nothing currently reads (no admin/hotel-owner page
queries listDashboardNotifications() anywhere in src/app — confirmed
by grep this session, a pre-existing gap, not something this session
introduced or was asked to fix).

Built this session: booking.actions.ts + BookingForm.tsx now capture
name+phone for every booking regardless of login state (email stays
guest-only, since a signed-in user already has one on file).
dispatch.ts gained buildAdminEmailHtml() and a new unconditional
admin-alert block (email to ADMIN_NOTIFICATION_EMAIL — reusing the
exact env var property-listing.actions.ts already uses, RULE 9 — plus
a 'dashboard' row), and buildEmailHtml() (the hotel/vendor email) now
includes the guest's phone/email when present. Fixed a latent bug in
the same function: it `return`ed early when no hotel/vendor contact
resolved, which would have skipped the new admin block too — moved
the admin block outside that early-return path so it always runs.
notification.repository.ts's NotificationRecipientType widened to
'hotel' | 'vendor' | 'admin' (caught by manual review, not by tsc —
see below). cashfree/webhook/route.ts's notifyBookingCreated() call
now also passes guestEmail/guestPhone (previously only guestName).
src/db/sql/016_contact03_admin_notify.sql (new) widens the
notifications.recipient_type CHECK to allow 'admin', plus a
comment-only update on bookings.guest_name/guest_email/guest_phone.
Full RULE 15 audit recorded in DEVELOPMENT_BIBLE.md Section K.

Deliberately not done: no admin UI to actually view the 'dashboard'
notification rows (pre-existing gap, not part of what was asked this
session — flagged, not built). No change to generate-invoice.ts's
resolveRecipient() (still prioritizes customer_id -> public.users over
the booking-time contact for what an invoice shows) — a separate,
not-yet-asked-for product decision, left alone per RULE 11.

NOT verified this session: this sandbox has network disabled (`npm
install` returned E403), so npm install/tsc --noEmit/eslint could NOT
be run for real — unlike every prior session recorded below, which did
run them. Every changed file was instead manually re-read end to end;
this is how the NotificationRecipientType mismatch above was caught,
but it is explicitly a substitute for the toolchain, not equivalent to
it. Before trusting this: run `npm install && npx tsc --noEmit && npx
eslint .` for real, then a live walkthrough (a real signed-in booking,
a real Cashfree payment) confirming both the hotel and
ADMIN_NOTIFICATION_EMAIL actually receive the email. Migration 016 has
not been run in production.

Correction (same day, user ran it): v1 of migration 016 failed live
with `ERROR 42703: column "recipient_type" does not exist`. Root
cause, found via `information_schema.columns`: `public.notifications`
already existed in production for an entirely unrelated, pre-existing
feature (generic per-user notification feed — user_id/notif_type/
title/message/metadata jsonb/is_read/soft-delete columns — not
referenced anywhere else in this codebase). Migration 009 had in fact
never been applicable in production; DATABASE_BIBLE.md's Migration
Registry already flagged it NOT CONFIRMED, now corrected to
SUPERSEDED. Same class of collision DOC_DEBT.md item 15 already
documented for 014_coupon01_coupons.sql's legacy `coupons` table. Fix:
v2 of 016_contact03_admin_notify.sql creates a dedicated
`public.booking_notifications` table instead of touching
`public.notifications`; notification.repository.ts's `tableName`
updated to match (`booking_notifications`, both the config and the one
raw `.from('notifications')` call in countUnreadDashboardNotifications()).
User re-ran v2 and confirmed via `information_schema.columns` that
`public.booking_notifications` now has exactly the expected 11 columns.
Table structure CONFIRMED — a live booking + payment walkthrough is
still the real end-to-end test (RULE 21/22), not yet done.

Next action: run the verification above; once clean, resume INVOICE-01
Step 4 (admin UI — list + link from `/admin/bookings` detail, per
DEVELOPMENT_BIBLE.md Section J's planned files list) — unchanged from
before this session, do not blend the two milestones.

Previous milestone

INVOICE-01 Step 3b — shared template (web view + PDF) (2026-09-18,
same day, new chat session, continuation of Step 3a below). Added
`@react-pdf/renderer` (^4.9.0) to package.json — deferred from Step
3a. Because react-pdf's Document/Page/View/Text are non-DOM primitives
with their own layout engine, one literal JSX tree cannot render both
HTML and a PDF; "one shared template" is implemented as one shared
formatting/data layer both renderers consume instead, so the two
outputs can never show different numbers or wording for the same
invoice.

Built this session: src/lib/invoices/invoice-view-model.ts —
buildInvoiceViewModel(), pure function, InvoiceRecord → formatted
InvoiceViewModel (dates, ₹-prefixed amounts matching the site's
existing toLocaleString('en-IN') convention, a lineItems array that
skips any field with no value). src/components/invoices/InvoiceView.tsx
— web-page view, Tailwind-styled to match
booking-confirmation/[id]/page.tsx's tokens (bg-cream/text-deep/
text-ink). src/components/invoices/InvoiceDocument.tsx — PDF
equivalent, react-pdf StyleSheet restating the same palette (react-pdf
cannot read tailwind.config). src/lib/invoices/render-invoice-pdf.ts —
renderInvoicePdfBuffer(), server-only wrapper around
@react-pdf/renderer's renderToBuffer, for a future download route.

Verified: `tsc --noEmit` and `eslint` both clean, project-wide (same
one pre-existing ProfileMenu `<img>` warning as every prior session).
Also ran a local-only smoke test: bundled the PDF path with esbuild
and executed with plain node (tsx's CJS resolver could not load
@react-pdf/hyphenate's ESM export map directly — a tsx-only quirk, not
a code issue, since Next.js's own bundler resolves it fine), rendering
InvoiceDocument against a fake InvoiceRecord end to end and producing
a valid PDF buffer. Test script deleted after — not part of the repo.

Deliberately not done: no route or page renders either component yet
— no `/admin/bookings` invoice link, no customer download link, no
route calling renderInvoicePdfBuffer(). That is Step 4 (admin UI) /
Step 5 (customer UI), unchanged, still separate future sessions.

Not verified this session: no live Cashfree webhook walkthrough (same
as every INVOICE-01 session so far — no reachable Supabase/Cashfree
from this sandbox); migration 015's production-run status is still
user-reported-only, not independently confirmed (unchanged from Step
3a — see DATABASE_BIBLE.md Migration Registry).

Next action: Step 4 — admin UI (list + link from `/admin/bookings`
detail; per DEVELOPMENT_BIBLE.md Section J, no separate admin
generation UI needed since invoices are always auto-generated). Do
not start Step 5 (customer UI) in the same session as Step 4.

Previous milestone

INVOICE-01 Step 3a — repository + Server Actions + webhook wiring
(2026-09-18, new chat session, continuation of Step 2 below). User
asked "is Step 3 big" before any code was written; Step 3 as originally
scoped in DEVELOPMENT_BIBLE.md Section J bundled the data layer
together with "render both the web page and the PDF from one shared
template" — judged too much for one session, so it was split (with
user confirmation) into Step 3a (this session) and a new Step 3b.

Built this session: InvoiceRepository
(src/lib/repositories/invoice.repository.ts — createInvoice/
getInvoiceById/getInvoiceByBookingId; invoice_seq/invoice_number
excluded from CreateInvoiceInput since Postgres generates them).
UserRepository gained getUserById(). generate-invoice.ts
(src/lib/invoices/ — the RULE-3 business-logic layer: resolves
customer-vs-guest recipient and vendor name, builds the snapshot row,
never throws, handles both the up-front idempotency check and a
caught ConflictError race). invoice.actions.ts
(src/app/actions/ — getInvoiceByBookingIdAdmin,
getMyInvoiceByBookingId; fetch-only, no create action, neither wired
into a page yet). cashfree/webhook/route.ts now calls
generateInvoiceForBooking() right after the CONTACT-02 notification
block, in its own try/catch, re-fetching bookedHotel/bookedPackage
independently rather than reusing that block's locals (different
try{} scope).

Deliberately not done: `@react-pdf/renderer` NOT added to
package.json (nothing in Step 3a renders anything — deferred to Step
3b). No shared template, no web-page view, no PDF, no admin/customer
UI (Steps 4/5, unchanged, still separate future sessions).

Verified: `npm install`, `tsc --noEmit`, `eslint` all run for real in
this sandbox — clean (one pre-existing untouched `<img>` lint warning
in ProfileMenu.tsx, same as every prior session).

Not verified this session: no live Cashfree webhook walkthrough (no
reachable Supabase/Cashfree from this sandbox). User reported running
migration 015 in production this session (also re-running 012 and
013), but none of the three were independently confirmed via
information_schema.columns here — DATABASE_BIBLE.md's Migration
Registry rows for all three now say "user reports run, not
independently confirmed," not CONFIRMED. Do that confirmation before
trusting writes against `invoices` in production.

Next action: Step 3b — build the shared React template
(`@react-pdf/renderer`, added as a dependency in that step, not
before) that drives both the customer-facing web-page view and the
downloadable PDF, per the Step 1 product-scope decision (one document,
two renderings from one template). Still no admin/customer UI in the
same session as this — that stays Steps 4/5.

Previous milestone

INVOICE-01 Step 2 — schema + PDF-library decision (2026-09-17, new
chat session, continuation of the Step 1 audit below). PDF library
confirmed: `@react-pdf/renderer` (the Step 1 front-runner) — pure JS,
runs in a normal Vercel serverless function, renders from React
components so one template can drive both the web page and the PDF
per Step 1's product decision. The npm dependency itself was NOT
added to package.json this session — that belongs to Step 3, which
actually uses it. Created src/db/sql/015_invoice01_invoices.sql: new
public.invoices table, one snapshot row per booking (booking_id
UNIQUE, relying on the webhook's existing PAY-02 idempotency rather
than a second guard), human-facing invoice_number (SB-INV-000001) via
the same generated-column-over-bigserial pattern as
vendor_settlements.receipt_number (migration 013), amount_paid
sourced from bookings.price_snapshot (COUPON-01 finding — the field
that actually matches what Cashfree charged, not subtotal/
grand_total), RLS enabled with no policy (same pattern as migrations
010/013/014 — Server Actions in Step 3 must use
createServiceRoleClient(), scoped explicitly, not an RLS policy). No
other code written this session (no repository, no Server Action, no
webhook change, no UI) — per the 6-step plan below, those are Step 3+
in separate future sessions. DATABASE_BIBLE.md Migration Registry and
"Known tables"/RLS sections updated for the new table; PROJECT_STATUS.md's
INVOICE-01 entry updated to "Step 2 COMPLETE."

Not verified this session: migration 015 has not been run in
production (no reachable Supabase instance in this sandbox) — run
manually and confirm via information_schema.columns (RULE 13/35)
before Step 3 starts.

Next action: Step 3 — repository + Server Actions to create an
invoice row (called from the Cashfree webhook right after
confirmBooking(), same call site CONTACT-02 uses) and fetch one by
booking/id. Add the `@react-pdf/renderer` dependency as part of this
step, not before. Do not start the admin/customer UI steps in the
same session as the backend step.

Previous milestone

INVOICE-01 Step 1 — scope audit (2026-09-17, new chat session,
continuation of the planning session below). User answered the three
scoping questions RULE 15 required before any code: one combined
invoice/voucher document (not two), delivered as both a web page and a
downloadable PDF, generated on payment success inside the existing
Cashfree webhook (same call site CONTACT-02 already uses, right after
confirmBooking()). Full audit recorded in DEVELOPMENT_BIBLE.md Section
J; PROJECT_STATUS.md's INVOICE-01 entry updated to "Step 1 COMPLETE."
No code written this session — per the 6-step plan below, Step 2
(schema + PDF-library decision) is a separate future session.

Previous milestone

Continuation planning (2026-09-17, new chat session) — user asked to
continue the project, broken into small steps (one step per chat
session going forward, so no session runs out of room mid-milestone).
Per this file's own "Next real candidate" note below, invoices/vouchers
is the only remaining Booking deferred-scope item with no existing
code and no doc-debt gap in front of it — but RULE 15 forbids starting
it without a product-scope audit first, and what "invoice" vs
"voucher" means here has never been defined (same caution as VENDOR-03
M3). No code written this session. Proposed step breakdown recorded
here so the next several sessions each pick up exactly one step:

1. INVOICE-01 scope audit (product decision, no code) — define invoice
   vs voucher, trigger point, delivery method, recipient(s), data
   fields, PDF vs HTML.
2. INVOICE-01 schema — migration for whatever Step 1 decides (e.g.
   invoices/vouchers table), following the RULE 15 pattern used for
   every other milestone in this file.
3. INVOICE-01 backend — repository + Server Actions to generate/fetch
   an invoice or voucher, wired to the point in the booking/payment
   flow Step 1 decides.
4. INVOICE-01 admin UI — list/view (and resend, if Step 1 wants it).
5. INVOICE-01 customer-facing UI — view/download from My Bookings or
   the booking-confirmation page.
6. Verification pass — tsc/eslint, then a live walkthrough checklist
   for the user (this sandbox cannot reach production Supabase/Cashfree).

Separately flagged, not part of this breakdown (live-verification-only
items that need the user, not new code): migration 012 (BOOKING-03)
still not run in production; migration 013 (PAY-04) still not run;
014_coupon01_coupons.sql on-disk file still not rewritten to match the
hand-run ALTER migration (RULE 32 — deferred until the exact ALTER SQL
actually run is available to copy, not reconstructed from memory per
RULE 8); CONTACT-02's webhook path and VENDOR-03 M4's approve/reject
flow still have no live walkthrough.

Next action: run Step 1 (INVOICE-01 scope audit) — see the question
asked in the same chat turn that added this entry.

Previous milestone

Audit continuation: VENDOR-BOOKING-01 backfill (2026-09-17, same day,
right after the CONTACT-02 session below) — user asked "what's next,"
told to follow DEVELOPMENT_BIBLE.md's own logic rather than pick
arbitrarily. RULE 40 (undocumented code must be logged immediately,
before new scope starts) took priority over jumping straight into a
new feature: found src/lib/auth/vendor-context.ts,
src/app/actions/vendor-booking.actions.ts, src/app/vendor/page.tsx,
src/app/vendor/bookings/page.tsx already fully built and wired — a
read-only vendor booking-visibility view — with PROJECT_STATUS.md
still listing that exact gap as deferred/pending. Backfilled into
PROJECT_STATUS.md/CHANGELOG.md; no code changed. Full detail:
DOC_DEBT.md item 17.

Verified: tsc --noEmit PASS, eslint PASS (0 errors, whole project) —
node_modules had to be reinstalled first (deleted by the previous
turn's zip export before packaging).

Next real candidate, once this is picked back up: invoices/vouchers —
the one remaining Booking deferred-scope item with no existing code,
no audit, and no doc-debt gap in front of it. Needs its own RULE 15
audit before any code is written (what "invoice" vs "voucher" means
here has never been scoped either — same caution as VENDOR-03 M3,
DOC_DEBT.md item 16c — do not guess the product requirement, ask).

Previous milestone

Audit session + CONTACT-02 (2026-09-17, continuation of the same day's
chat session, sandbox with working `npm install`) — user asked for an
audit followed by the next milestone. Audit found: mangled filenames
recurring a fifth time (fixed), PROJECT_STATUS.md truncated
mid-sentence (fixed), VENDOR-03 M4 fully code-complete but
undocumented (backfilled), VENDOR-03 M3 never actually scoped
anywhere despite a standing "partially covered" claim (logged, not
resolved — needs a product decision). Full detail: DOC_DEBT.md item
16, CHANGELOG.md's 2026-09-17 "Audit session + CONTACT-02" entry.

Then implemented CONTACT-02 (Payment-Triggered Notifications), which
PROJECT_STATUS.md had explicitly blocked pending a RULE 15 audit — that
audit was performed first (see CHANGELOG.md same entry) before any
code was written. Moved notifyBookingCreated() from
createBooking() (booking.actions.ts) to the Cashfree webhook
(src/app/api/public/cashfree/webhook/route.ts), firing only after a
payment is confirmed successful, instead of at every checkout attempt
including abandoned ones.

Verified: `npm install` succeeded in this sandbox (first session able
to do so) — `tsc --noEmit` and `eslint` were run for real against the
whole project, not carried forward from a prior claim. Both clean (one
pre-existing, untouched <img> lint warning in ProfileMenu.tsx).

Not verified / pending from this session: no live Cashfree webhook
walkthrough (RULE 21/22/23) — needs a real test payment confirming
the hotel/vendor notification now fires post-payment, not at
checkout. VENDOR-03 M4's approve/reject flow also still has no live
walkthrough (it was backfilled into the docs this session, not newly
built, but was never verified live in any prior session either).
VENDOR-03 M3 remains unscoped — see DOC_DEBT.md item 16c; do not
start coding it without a product decision on what it actually covers.

Previous milestone

Admin panel + coupons production incident (2026-09-17, chat session, hotfix) — reported as "Admin nahi khul rha" (live 404 on /admin). Three stacked issues found and fixed: (1) src/app/admin/page.tsx had been overwritten with a coupon-edit page's content, which had never had a correct home of its own — restored the real dashboard (from an older uploaded zip) and gave the coupon-edit content its correct route at src/app/admin/coupons/[id]/page.tsx; (2) production's public.coupons table turned out to already exist with a completely different legacy schema, making migration 014's `create table if not exists` a silent no-op — reconciled live via a hand-written ALTER migration (014's on-disk file was NOT rewritten to match — pending); one real coupon row (WELCOME10) was briefly lost to a DROP TABLE CASCADE run by mistake in place of the safer ALTER script, then hand-recovered from data already visible earlier in the chat; (3) coupon.actions.ts's admin functions were blocked by coupons' RLS-enabled-no-policy state (0 rows on list, hard error on create) since they used the session client instead of createServiceRoleClient() — switched all five admin functions over. All three confirmed fixed live by the user. Full detail: CHANGELOG.md's 2026-09-17 "Admin panel + coupons production incident" entry, DOC_DEBT.md item 15.

Not verified / pending from this session: 014_coupon01_coupons.sql rewrite to match the ALTER-based migration actually run (RULE 32); whether vendor_payout_details/vendor_settlements share the same RLS-session-client bug coupons had (UNVERIFIED — /admin/settlements loads without erroring, which isn't proof it shows real rows to an admin); RULE 34's pre-run destructive-change note was not followed for the DROP TABLE CASCADE actually run (identified as destructive only after the fact).

Previous milestone

BOOKING-03 (Guest Checkout) — restored after regression (2026-09-11, this session). The repo zip uploaded at the start of this session did not contain BOOKING-03 — previously delivered per DOC_DEBT.md item 12's own account, but createBooking() still unconditionally threw "UNAUTHENTICATED", migration 012 did not exist on disk, and no /booking-confirmation route existed. The user confirmed this zip is the actual latest state, not a stale/wrong upload, so this was treated as a real regression rather than adopted as-is.

Delivered this session: src/db/sql/012_booking03_guest_checkout.sql (customer_id made nullable, guest_name/guest_email/guest_phone added, bookings_customer_or_guest_check constraint — idempotent per RULE 33); createBooking() in booking.actions.ts now accepts an unauthenticated caller, requiring guest_name/guest_email/guest_phone instead and routing every DB call in the function through createServiceRoleClient() (same trusted-server-write pattern as property-listing.actions.ts's self-service submission — a guest has no session for RLS to evaluate); new getGuestBookingConfirmation() action; BookingForm.tsx gets a required isAuthenticated prop and a guest-contact section shown/validated only when false, redirecting a guest to /booking-confirmation/[id] instead of /dashboard/bookings; src/app/hotels/[slug]/book/page.tsx and src/app/packages/[id]/book/page.tsx no longer redirect an unauthenticated visitor to /login; new public src/app/booking-confirmation/[id]/page.tsx; middleware.ts's public-route allowlist gained `/packages/` and `/booking-confirmation/` prefixes — `/packages/[id]` and `/packages/[id]/book` were previously login-gated at the middleware layer regardless of the page's own logic, which was silently blocking package guest checkout specifically (hotel guest checkout only needed the page-level fix, since `/hotels/` was already public).

Verified for real this session — unlike every prior BOOKING-related session note in this file, `npm install` succeeded (registry.npmjs.org is reachable from this sandbox) and both `tsc --noEmit` and `eslint` were run and are clean on every file touched. Not verified (RULE 21-23): migration 012 has not been run against production (no reachable Supabase instance), and there has been no live functional walkthrough (real browser, an actual guest completing a hotel and a package booking end-to-end, confirmation page rendering correctly). RULE 22 applies — this is a bookings-mutation path and must not be marked Frozen until both are done.

Also logged, not fixed this session (out of scope — user's explicit priority is booking-setup completion, i.e. coupons/invoices/commissions, before returning to this): PROJECT_STATUS.md's claim that the hotel-owner onboarding wizard (P0.3 Steps 2-5) was CODE COMPLETE 2026-09-05 does not match this session's repo zip — only src/app/hotel-owner/page.tsx and layout.tsx exist, no wizard sub-pages. See DOC_DEBT.md item 13.

Previous milestone

P0.3 Steps 2-5 (2026-09-05, this session) — hotel-owner onboarding dashboard, built on Step 1's already-complete owner-scoped layer (see DOC_DEBT.md item 8). CODE COMPLETE, NOT VERIFIED — same sandbox limitation as every session below: no node_modules and no network, so tsc/eslint could not be run at all this session, and no live Supabase was reachable for a functional walkthrough. New: src/app/hotel-owner/page.tsx (the route's first real page — layout.tsx has been role-gating an empty route since Step 1) and src/components/owner/OwnerHotelForm.tsx. Modified: src/components/public/PropertyListingForm.tsx (Step 3 — auto-redirects to /hotel-owner when submitPropertyListing() reused an existing session instead of creating a new one) and src/actions/auth.ts (Step 4 — loginAction's default landing, i.e. no explicit ?redirectTo, now sends a plain hotel_owner to /hotel-owner instead of "/"). Full detail, including the exact walkthrough steps still needed and the two scope assumptions made where the milestone's own docs never specified behavior (RULE 12), is in CHANGELOG.md's 2026-09-05 entry and PROJECT_STATUS.md v15. NOTE (2026-09-11 session): this milestone's claimed files were not present in the next session's repo zip — see DOC_DEBT.md item 13; treat "CODE COMPLETE" claims in this file as unverified against the live repo, not as fact, until re-confirmed.

Also this session: DOC_DEBT.md item 6 (mangled "CHANGELOG (1).md"/"PROJECT_STATUS (1) (1).md" filenames) was reopened yet again in the delivered zip — renamed to canonical a third time. Given the recurrence (closed/reopened at least four times now across 2026-08-28, 2026-09-03, and 2026-09-05), DOC_DEBT.md now suggests this be fixed at whatever export/upload step produces the zip, rather than re-patched every session.

Also this session, later: the user ran src/db/sql/011_vendor03_hotel_facilities.sql manually against production Supabase and confirmed via information_schema.columns — both public.hotel_facilities and public.hotel_facility_links exist with every expected column and correct type. VENDOR-03 M1 is now DEPLOYMENT READY (RULE 13/35). This unblocks functionally testing M2 (the live "List Your Property" form) end-to-end for the first time — still not done, since that requires a real browser walkthrough this sandbox cannot perform.

Earlier milestone

HOME-HOTEL-SEARCH-01 (2026-09-03) — homepage Hero switched to Hotels-primary with a real functional search (new src/components/public/HotelSearchBar.tsx, HotelRepository.searchPublishedHotels(), /hotels now accepts city/checkin/checkout/guests and carries them through room + booking links into BookingForm's initial values). CODE COMPLETE, NOT VERIFIED — this sandbox has no node_modules and no network, so tsc/eslint could not be run at all this session (not even the usual "clean except fonts" build check). Must be typechecked/linted and walked through on a real dev server (search from homepage → results filter by city → book with dates pre-filled) before being trusted. Full detail in CHANGELOG.md's 2026-09-03 HOME-HOTEL-SEARCH-01 entry, including three explicitly-scoped-out gaps: no availability filter on hotel search (dates don't yet narrow which hotels show up), no checked-in/checked-out operational status for bookings, and other verticals (Flights/Bus/etc.) remain "Coming soon" placeholders with no backend.

P0.3 audit continuation (2026-08-28, session after VENDOR-03/M2 below) — this is the actual most recent session; it was recorded in CHANGELOG.md at the time but never backfilled into this file or PROJECT_STATUS.md until now (DOC_DEBT.md item 10). Re-verified SESSION_HANDOFF_2026-08-28_P0_FIXES.md's claim that P0.3 Step 1 (owner-scoped repository/action layer) was "not yet started" — false, Step 1 was already fully present (VendorRepository.getVendorByOwnerUserId(), src/lib/auth/owner-context.ts, owner-hotel.actions.ts, owner-room-type.actions.ts, all confirmed on disk — see DOC_DEBT.md item 8). Steps 2-5 (onboarding wizard page, post-submit redirect, first-login smart redirect, submitted-for-review screen) confirmed genuinely NOT started — src/app/hotel-owner/ contains only layout.tsx.

Also found and fixed (DOC_DEBT.md item 9, P0-adjacent): room-price.repository.ts and room-inventory.repository.ts's verifyRoomOwnership() hotel_owner branch queried a nonexistent vendors.owner_id column (live column is owner_user_id, confirmed elsewhere in the codebase) with the Postgrest error silently swallowed — net effect, a hotel_owner onboarded via VENDOR-03's self-service flow could never successfully price or manage inventory for their own rooms. Both repositories fixed to use owner_user_id.

Created: src/app/actions/owner-room-image.actions.ts — owner-scoped counterpart to the admin room-image actions (upload/list/set-primary/reorder/delete), gated via requireOwnerVendor()/assertHotelOwnedByVendor() + a room-belongs-to-hotel check. Not created: separate owner-room-price/owner-room-inventory action wrappers — unnecessary, since room-price.actions.ts/room-inventory.actions.ts already accept the hotel_owner role directly once the owner_id bug above is fixed.

Verified: tsc --noEmit clean (whole project). eslint clean on all changed/created files. NOT verified: no live Supabase reachable in that sandbox — the owner_id fix and new owner-room-image actions need a real hotel_owner walkthrough (set a rate, set inventory, upload a room photo) before being trusted in production. P0.3 Steps 2-5 remain the actual next coding work on the onboarding flow, once someone picks that back up.

VENDOR-03 (M2) — Public "List Your Property" self-service flow. CODE COMPLETE 2026-08-28. Homepage "List Your Property" button (Navbar) → /list-your-property → single consolidated form (owner account + property + facilities checklist + payout/contact, one submit) → src/app/actions/property-listing.actions.ts creates auth user + vendor(pending) + hotel(pending) + facility links + payout row + hotel_owner role grant + best-effort admin alert email, all via createServiceRoleClient() (trusted-server pattern, not requireRole-gated — see file header for why this is safe). Depends on M1's migration 011 being run first (still not run in production). RULE 29 backfill: GMAIL_USER/GMAIL_APP_PASSWORD/ADMIN_NOTIFICATION_EMAIL added to env schema (were missing despite a false code comment — DOC_DEBT.md item 7). tsc --noEmit: PASS. eslint (whole project): PASS, 0 errors. `next build`: NOT VERIFIED — fails only on Google Fonts being network-blocked in this sandbox, unrelated to code changed here. NOT verified: no functional walkthrough (no live Supabase reachable from this sandbox) — must be walked through for real (signup → check inbox → confirm → login → see pending listing) before this milestone is marked Frozen. Property photo/ID-proof upload intentionally not in scope for M2 — no Storage bucket designed yet.

VENDOR-03 (M1) — Self-Service "List Your Property" schema foundation. CODE COMPLETE 2026-08-28, migration NOT YET RUN in production. See PROJECT_STATUS.md / CHANGELOG.md for full detail. New: src/db/sql/011_vendor03_hotel_facilities.sql, src/lib/repositories/hotel-facility.repository.ts, src/lib/auth/roles.ts. tsc --noEmit and eslint clean. Not verified: migration not run against any live Supabase instance (no DB credentials in this environment) — run manually, confirm via information_schema.columns, before starting M2 (the actual public form + Server Action). Also this session: renamed mangled "CHANGELOG (1).md"/"PROJECT_STATUS (1) (1).md" to canonical filenames (DOC_DEBT.md item 6), and found+logged a pre-existing dangling "DOC_DEBT.md item 5" citation in PROJECT_STATUS.md (DOC_DEBT.md item 5, left open — out of scope for this milestone).

PAY-04 — Automated Split Settlement via Cashfree Easy Split. NOT STARTED. Depends on VENDOR-02 (code complete, see below) and on Cashfree Payout API credentials, which have not been provided yet. No RULE 15 pre-coding audit exists yet — perform one before writing any code.

VENDOR-02 — Hotel Owner Payout KYC Capture. CODE COMPLETE 2026-08-28. Migration RUN AND CONFIRMED IN PRODUCTION 2026-09-03: public.vendor_payout_details verified live via information_schema.columns — all 12 expected columns present with correct types (bank_account_number/bank_ifsc/upi_id/cashfree_beneficiary_id text nullable, payout_status text NOT NULL default 'pending', id/vendor_id/created_at/updated_at NOT NULL, created_by/updated_by/deleted_at nullable), per RULE 13/35. RULE 15 au
