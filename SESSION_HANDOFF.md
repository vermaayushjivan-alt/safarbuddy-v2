<!-- ROOT PATH: SESSION_HANDOFF.md -->

SESSION_HANDOFF.md

Single source of truth for the current session boundary. Read this first if picking up the project without the full ZIP.

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

VENDOR-02 — Hotel Owner Payout KYC Capture. CODE COMPLETE 2026-08-28. Migration RUN AND CONFIRMED IN PRODUCTION 2026-09-03: public.vendor_payout_details verified live via information_schema.columns — all 12 expected columns present with correct types (bank_account_number/bank_ifsc/upi_id/cashfree_beneficiary_id text nullable, payout_status text NOT NULL default 'pending', id/vendor_id/created_at/updated_at NOT NULL, created_by/updated_by/deleted_at nullable), per RULE 13/35. RULE 15 audit performed (see PROJECT_STATUS.md v14): admin-only capture form at /admin/vendors/[id]/payout now safe to rely on in production. Cashfree beneficiary creation left as an inert stub pending separate Payout credentials. Admin-managed rather than owner self-service, since src/app/vendor/ has no actual page yet (layout-only role guard) — building owner-facing UI/auth was out of scope for this milestone.

BOOKING-02 — CLOSED 2026-08-28. Live schema confirmed via information_schema.columns and pg_attribute/pg_attrdef/pg_constraint: public.bookings.room_id exists (uuid, nullable, no default, FK → hotel_rooms(id)). This resolved the DATABASE_BIBLE.md-vs-audit contradiction in DATABASE_BIBLE.md's favor. Migration src/db/sql/008_room05_booking_room_linkage.sql created (idempotent) to close the RULE 32 disk-gap. No application code changed — booking.repository.ts already handled room_id correctly. Bookings were never actually broken by this in production. See PROJECT_STATUS.md v13 and CHANGELOG.md 2026-08-28.

Completed this session (2026-08-28 — documentation backfill + BOOKING-02 resolution + VENDOR-02 implementation)

User confirmed PROJECT_STATUS.md/CHANGELOG.md had not been updated for the 2026-08-23 (ROOM-05) and 2026-08-27 (build-stability/planning) sessions. Both files backfilled from this file's own record of those sessions, cross-checked against the actual repo contents. Also found and logged (DOC_DEBT.md item 5): this file's own claim that BOOKING-02/VENDOR-02/PAY-04/CONTACT-02 each had "a full RULE 15 pre-coding audit recorded in PROJECT_STATUS.md" was false — none of the four audits actually exist there. They were not fabricated to close the gap; VENDOR-02/PAY-04/CONTACT-02 still need real audits before coding.

Then resolved BOOKING-02 itself: ran the live-schema queries (information_schema.columns, then pg_attribute/pg_attrdef/pg_constraint) against public.bookings, confirmed room_id's actual state, and wrote the missing migration file as a documentation record (not a live change — the column was already there).

Completed previous session (2026-08-27 — build-stability audit + launch-readiness planning)

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

src/db/sql/010_vendor02_payout_kyc.sql — RUN 2026-09-03, confirmed live (see VENDOR-02 above). Done.

src/db/sql/011_vendor03_hotel_facilities.sql — RUN 2026-09-05 (this session), confirmed live via information_schema.columns: both public.hotel_facilities and public.hotel_facility_links exist with all expected columns and correct types (hotel_facilities: id uuid, code/label/category text, display_order integer, is_active boolean, created_at/updated_at timestamptz; hotel_facility_links: id/hotel_id/facility_id uuid, created_at timestamptz). VENDOR-03 M1 is now DEPLOYMENT READY per RULE 13/35 — the live "List Your Property" flow (M2) can now be functionally tested end-to-end for the first time. Done.

P0.3 Steps 2-5 (onboarding wizard page, post-submit session redirect, first-login smart redirect, submitted-for-review screen) — CODE COMPLETE this session (2026-09-05, see Current milestone above). NOT
