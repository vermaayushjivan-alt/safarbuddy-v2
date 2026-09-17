DOC_DEBT.md

Per DEVELOPMENT_BIBLE.md RULE 40 — code/claims discovered in the repo that
either implement a real feature with no corresponding PROJECT_STATUS.md /
CHANGELOG.md / SESSION_HANDOFF.md entry, or claim something (a migration,
a fix) that turned out not to actually exist. Logged immediately rather
than silently adopted or silently ignored.

---

1. CONTACT-01 (Hotel Contact Capture + Booking Notifications)

What: HotelForm/schema/actions updated to capture hotel phone/email/
website; notifications table; contact-resolution (hotel then vendor
fallback); admin dashboard alert page; email sending via Gmail SMTP
(nodemailer). WhatsApp channel wired but inert (no provider selected).

Files: src/lib/notifications/dispatch.ts, src/lib/notifications/
email.client.ts, related HotelForm/schema/action files, notifications
table migration.

Status: Implemented and functionally verified in an earlier session, but
never recorded in PROJECT_STATUS.md/CHANGELOG.md until 2026-08-27. Backfilled
into PROJECT_STATUS.md's "Next Development Phase" section on that date.
Resolution: CLOSED — documentation backfilled.

---

2. Migration 008_room05_booking_room_linkage.sql — claimed but absent

What: SESSION_HANDOFF.md states this migration was "created for real this
time" and required to be run in Supabase before hotel bookings work, and
elsewhere states booking.repository.ts's createBooking() has been
unconditionally inserting a room_id column since an earlier undocumented
session. The migration file does not exist anywhere in the delivered repo
(only 001, 002, 003, 004, 006, 007, 009 are present on disk).

Files: src/lib/repositories/booking.repository.ts (createBooking),
src/db/sql/ (missing 008 file).

Status: OPEN — this is a RULE 32 violation (a migration claimed as created
must actually exist on disk) and a likely P0 production issue: if the live
bookings table lacks room_id, every booking insert fails with a Postgres
"column does not exist" error. Logged as milestone BOOKING-02 in
PROJECT_STATUS.md's Next Development Phase, with a RULE 15 pre-coding
audit already recorded there. Not yet fixed.

---

3. src/lib/notifications/whatsapp.client.ts — missing file, broke build

What: dispatch.ts imports sendWhatsApp from ./whatsapp.client, but that
file did not exist in the delivered repo, causing `tsc`/Vercel production
builds to fail with "Cannot find module './whatsapp.client'".

Status: CLOSED (2026-08-27) — recreated as an inert stub matching the
already-decided no-WhatsApp-provider-yet state (see CONTACT-01 notes).
Confirmed via tsc --noEmit and a clean Vercel build. Logged in
CHANGELOG.md's 2026-08-27 entry.

---

4. package.json — missing nodemailer dependency, broke build

What: email.client.ts imports nodemailer, but package.json never listed
nodemailer or @types/nodemailer as dependencies, causing Vercel production
builds to fail with "Cannot find module 'nodemailer'".

Status: CLOSED (2026-08-27) — both added to package.json. Confirmed via a
clean Vercel build. Logged in CHANGELOG.md's 2026-08-27 entry.

---

7. src/lib/config/env.ts / src/types/env.d.ts — GMAIL_USER and
   GMAIL_APP_PASSWORD missing despite a code comment claiming otherwise

What: src/lib/notifications/email.client.ts's header comment states
"Both vars are already declared in the validated serverEnvSchema and
in src/types/env.d.ts." They were not — neither file listed them,
only RESEND_API_KEY/EMAIL_FROM existed under the Email section. Same
"claimed but not actually present" pattern as items 2–4 above.

Status: CLOSED (2026-08-28, VENDOR-03/M2 session) — added
GMAIL_USER, GMAIL_APP_PASSWORD, and (new, for M2's admin alert email)
ADMIN_NOTIFICATION_EMAIL to serverEnvSchema, env.d.ts, and
.env.example together, per RULE 29.

---

General note: several of the items above (2, 3, 4, 7) are the same
underlying failure pattern — a session's SESSION_HANDOFF/CHANGELOG/code
comment claimed something was "done"/"already declared" that was not
actually present/complete in the delivered repo. RULE 21–23 (real
functional walkthroughs, not just a green typecheck) and RULE 32
(migrations must actually exist on disk) exist specifically to catch
this class of issue going forward.

---

5. Dangling "DOC_DEBT.md item 5" citation in PROJECT_STATUS.md

What: PROJECT_STATUS.md's "Next Development Phase" section cites
"SESSION_HANDOFF.md's original claim that one [a RULE 15 audit] exists
for each was false (DOC_DEBT.md item 5)" — but at the time this was
written, DOC_DEBT.md only had items 1–4; no item 5 existed. This is the
exact "claimed but not actually present" failure pattern this file
exists to catch, applied to this file's own citations.

Status: OPEN. Not fixed in this session (VENDOR-03/M1) — out of scope
(unrelated milestone), logged here per RULE 40 rather than silently
left. Whoever next touches PAY-04/CONTACT-02's audit status should
either find/restore the real originally-intended item 5, or correct
the citation in PROJECT_STATUS.md to point at wherever that claim is
actually substantiated (if anywhere).

6. CHANGELOG.md / PROJECT_STATUS.md — present under mangled filenames

What: at the root of the delivered ZIP, the files existed as
"CHANGELOG (1).md" and "PROJECT_STATUS (1) (1).md" — browser
duplicate-download suffixes — not as "CHANGELOG.md" / "PROJECT_STATUS.md".
Every rule in DEVELOPMENT_BIBLE.md (RULE 17, 18, F2 item 9) and every
prior CHANGELOG/SESSION_HANDOFF entry assumes these canonical filenames.
Any tooling, script, or person searching for "CHANGELOG.md" literally
would have found nothing and could easily have concluded — wrongly —
that the project had no changelog at all, or worse, created a second,
diverging CHANGELOG.md alongside the real one.

Status: CLOSED (2026-08-28, VENDOR-03/M1 session) — renamed to the
canonical filenames. Contents were not altered by the rename, only
appended to (see this session's CHANGELOG.md entry). No duplicate
"CHANGELOG.md" existed at the time of rename, so no content was lost
or overwritten.

REOPENED (2026-08-28, same day, later session): the delivered zip for
this session still has the mangled filenames ("CHANGELOG (1).md",
"PROJECT_STATUS (1) (1).md") — the rename either did not make it into
the copy actually delivered, or was undone by a re-export step
somewhere in between. Entries for this session were appended to the
mangled files as found, rather than silently renaming them again
without the user's awareness. Whoever next exports/re-uploads the
project should confirm the canonical filenames survive the export
step this time.

---

8. SESSION_HANDOFF_2026-08-28_P0_FIXES.md — P0.3 "not yet started"
   claim was false for Step 1

What: The P0-fixes handoff states "Not yet started: none of steps 1-5
have been coded yet. Next session should start with step 1
[owner-scoped repository/action layer]." On direct inspection of the
delivered repo, Step 1 already exists and is functionally complete:
VendorRepository.getVendorByOwnerUserId() (vendor.repository.ts),
src/lib/auth/owner-context.ts (requireOwnerVendor(),
assertHotelOwnedByVendor()), src/app/actions/owner-hotel.actions.ts,
and src/app/actions/owner-room-type.actions.ts all exist, are wired to
the ownership-check pattern described in the handoff's own plan, and
carry "P0.3" comments dated the same session. Steps 2-5 (onboarding
wizard page, post-submit session-based redirect, first-login smart
redirect, submitted-for-review screen) were independently verified
as genuinely absent — the handoff was correct about those.

Files: src/lib/repositories/vendor.repository.ts,
src/lib/auth/owner-context.ts, src/app/actions/owner-hotel.actions.ts,
src/app/actions/owner-room-type.actions.ts (all present, functional).
src/app/hotel-owner/ contains only layout.tsx, no onboarding page.
PropertyListingForm.tsx's success branch only shows a "check your
email" message + manual link to /login — no session check, no direct
redirect into a wizard. Login page has no hotel_owner+pending-hotel
redirect logic.

Status: OPEN — same "claimed state doesn't match delivered repo"
pattern as items 2-4 and 7, this time in the "not done" direction
(understating progress) rather than overstating it. Not fixed by
this entry; logged per RULE 40 so the next session builds Step 2
(onboarding wizard) on top of the real, already-complete Step 1,
instead of re-doing work that already exists.

---

9. room-price.repository.ts / room-inventory.repository.ts —
   `vendors.owner_id` does not exist; hotel_owner pricing/inventory
   access has likely never worked

What: Both repositories' `verifyRoomOwnership()` hotel_owner branch
queried `.select('id, owner_id')` on `vendors` and checked
`vendor.owner_id === userId`. The live `vendors` table has no
`owner_id` column — the confirmed live column (per
vendor.repository.ts's VENDOR-01 audit comment, and used correctly
everywhere else: VendorForm.tsx, property-listing.actions.ts,
owner-context.ts) is `owner_user_id`. The resulting Postgrest error
from selecting a nonexistent column was silently swallowed in both
call sites (`const { data: vendor } = await ...` — error
destructured but never checked), so `vendor` came back null and the
check always fell through to `return false`. Net effect: a
hotel_owner without `hotels.created_by === their id` (i.e. every
owner onboarded via the VENDOR-03 self-service flow, since that flow
sets `vendor_id` but does not set hotel `created_by` to the owner's
id) could never successfully price or manage inventory for their own
rooms — every such write would fail with "Unauthorized access to
hotel room pricing" / the inventory equivalent, even though the code
path looked complete end-to-end.

Files: src/lib/repositories/room-price.repository.ts,
src/lib/repositories/room-inventory.repository.ts.

Status: FIXED this session — both changed to select/compare
`owner_user_id`. Verified via `tsc --noEmit` (clean) and `eslint` on
both files (clean). NOT verified via a live functional walkthrough
(no reachable Supabase instance in this sandbox) — a hotel_owner
account should set a real room rate and a real inventory row in
production to confirm this fix actually restores access, per RULE 21-23.

---

12. BOOKING-03 (Guest Checkout) — previously delivered, absent from
    this session's repo zip

Numbering note: CHANGELOG.md's 2026-08-28 entry and SESSION_HANDOFF.md
both cite a "DOC_DEBT.md item 10" (P0.3 audit backfill) and "item 11"
(mangled-filename reopen) that do not actually exist as numbered
entries in this file — themselves an instance of the dangling-citation
pattern already logged as item 5. Rather than reuse 10/11 for a third,
unrelated meaning, this entry and the next are numbered 12/13.

What: SESSION_HANDOFF/CHANGELOG history (prior session, not present
in this file's own earlier entries) describes BOOKING-03 as
delivered: nullable customer_id + guest_name/email/phone columns
(migration 012), createBooking() accepting unauthenticated callers,
a getGuestBookingConfirmation() action, and a public
/booking-confirmation/[id] page. None of this existed in the repo
zip uploaded at the start of this session — createBooking() still
unconditionally threw "UNAUTHENTICATED", no migration 012 file
existed, and no /booking-confirmation route existed. Confirmed by
the user this session to be a real regression (the zip is the
latest state), not a stale/wrong upload.

Files: src/app/actions/booking.actions.ts, src/lib/repositories/
booking.repository.ts, src/components/booking/BookingForm.tsx,
src/app/hotels/[slug]/book/page.tsx, src/app/packages/[id]/book/
page.tsx, middleware.ts, src/db/sql/ (missing 012 file).

Status: RESTORED this session (2026-09-11) — see CHANGELOG.md /
PROJECT_STATUS.md for the current delivery. Root cause of the
original loss is unknown (not diagnosable from a repo snapshot
alone) — flagging so a future session doesn't assume a delivered
milestone is safe from silently reverting again.

---

13. PROJECT_STATUS.md P0.3 Steps 2-5 (hotel-owner onboarding wizard)
    — claimed CODE COMPLETE 2026-09-05, not present in this session's
    repo zip

What: PROJECT_STATUS.md and SESSION_HANDOFF.md both state the
hotel-owner onboarding wizard (post-submit session redirect,
first-login smart redirect, submitted-for-review screen) was CODE
COMPLETE as of 2026-09-05. The repo zip uploaded at the start of
this session has only src/app/hotel-owner/page.tsx and layout.tsx —
no wizard sub-pages. Same "claimed but not actually present" pattern
as items 2, 6, and 10.

Files: src/app/hotel-owner/ (wizard sub-pages not present).

Status: NOT fixed this session — out of scope (user's explicit
priority is booking-setup completion — coupons/invoices/commissions
— before returning to this). Logged per RULE 40 so the next session
building on P0.3 verifies against the live repo/schema first rather
than trusting PROJECT_STATUS.md's claim.

---

15. Chat-session incident (2026-09-17, separate from item 14 above,
    same root cause pattern): src/app/admin/page.tsx overwritten with
    coupon-edit content; coupons table schema mismatch + data-loss
    incident; coupons RLS gap

What: Three related problems surfaced while debugging "Admin nahi
khul rha" (reported as a live 404 on /admin) in a chat session, not a
sandboxed repo-audit session — no CHANGELOG/PROJECT_STATUS entry
exists for any of this yet.

15a. src/app/admin/page.tsx (the actual /admin dashboard homepage)
had been overwritten with an entire coupon-edit page's content
(`AdminEditCouponPage`, expecting a `params.id` route param). Since
`/admin` has no `[id]` segment, `id` was always undefined,
`getCouponByIdAdmin(undefined)` always returned null, and
`notFound()` fired on every load — this is what produced the live
404. Root cause matches item 14's own diagnosis exactly (two files
edited in the same round of fixes, a pasted block landing in the
wrong path) but is a second, independent occurrence, not the same
file. The coupon-edit content's actual intended destination,
src/app/admin/coupons/[id]/page.tsx, did not exist at all — so this
wasn't purely a swap, it was content that had never been placed
anywhere correct. Fixed: real dashboard content restored (recovered
from an older uploaded zip, safarbuddy-v2-main__9_.zip) to
src/app/admin/page.tsx, adding Coupons and Settlements cards that the
recovered older version predated; coupon-edit content moved to the
correct src/app/admin/coupons/[id]/page.tsx.

15b. Confirmed live in production 2026-09-17: `public.coupons` already
existed with a completely different, unrelated legacy schema
(usage_limit, per_user_limit, used_count, start_date, end_date,
status columns — no scope/vendor_id/valid_from/valid_until/is_active)
before 014_coupon01_coupons.sql was ever run. Its `create table if
not exists` therefore silently no-opped against production, and every
admin coupon page threw an uncaught DB error ("Something went wrong").
Contained one real coupon row (WELCOME10) at the time this was found.
Reconciled via a hand-written ALTER-based migration (add new columns,
backfill from old columns, drop old columns, add constraints/indexes,
enable RLS) run manually against production by the user — not by
running 014's own DDL, which would have been a no-op. **Data-loss
incident during this fix**: an earlier draft fix (a DROP TABLE CASCADE
+ recreate script, offered as the "if the table is empty" option
before row count was confirmed) was run instead of the ALTER-based
one, cascade-dropping the WELCOME10 row with no backup captured first
(the backup-table step existed only in the ALTER-based script, not
the one actually run). Recovered by hand-reconstructing an INSERT for
WELCOME10 from data already captured earlier in the chat transcript
(an information_schema/row-content query result) — exact original
id/timestamps preserved, but this was a manual, chat-log-dependent
recovery, not a real backup/restore. RULE 34 (destructive-change
pre-run note in CHANGELOG) was not followed, because the destructive
script's true effect was not identified as destructive-in-context
until after it ran — logged here after the fact as the closest
available compliance, and as a caution: when two migration options
are handed to a person to choose between, confirm which one was
actually run before assuming the safer path was taken.

15c. Confirmed live 2026-09-17: `public.coupons` has RLS enabled with
no policy (as 014's own header comment already said it would), but
every admin function in coupon.actions.ts used the session client
(`createClient()`) instead of `createServiceRoleClient()` — contrary
to the same header comment's stated design. This produced exactly the
two symptoms predicted by "RLS enabled, no policy": 0 rows on the
admin list (SELECT silently returns nothing) and a hard
"new row violates row-level security policy" error on create
(INSERT is rejected outright). Fixed: all five admin functions
(createCouponAdmin, updateCouponAdmin, setCouponActiveAdmin,
getCouponByIdAdmin, getAllCouponsAdmin) switched to
createServiceRoleClient(); requireRole() remains the authorization
gate, unchanged.

Files: src/app/admin/page.tsx, src/app/admin/coupons/[id]/page.tsx
(new), src/app/actions/coupon.actions.ts, public.coupons (live schema,
via manual SQL — no new file on disk matches what was actually run;
014_coupon01_coupons.sql itself was NOT updated to reflect the
ALTER-based reality, see DATABASE_BIBLE.md Migration Registry row for
014 — pending).

Status: CLOSED functionally (2026-09-17) — /admin, /admin/coupons, and
/admin/coupons/[id] all confirmed working live by the user, including
WELCOME10 visible again and a new coupon create attempt succeeding.
NOT closed on documentation: (1) 014_coupon01_coupons.sql needs
rewriting to an ALTER-based migration matching live reality (RULE 32),
(2) CHANGELOG.md/PROJECT_STATUS.md need this session's fixes recorded
(RULE 17/18) — done in the same pass as this entry, see the
2026-09-17 "Admin panel + coupons production incident" CHANGELOG
entry, (3) item 15b's RULE 34 gap is logged but not resolvable
retroactively, (4) item 15b's manual-recovery data-loss risk pattern
(two migration scripts handed over without first confirming row count,
then the wrong one run) should inform how destructive-vs-safe SQL
options are presented in any future session, (5) whether
vendor_payout_details / vendor_settlements share coupons' item-15c RLS
bug is UNVERIFIED — see DATABASE_BIBLE.md coupons RLS entry.

---

16. Audit session (2026-09-17, continuation of the same day's chat
    session as item 15): mangled filenames recurred a fifth time;
    PROJECT_STATUS.md found truncated mid-sentence; VENDOR-03 M4
    (Admin Approval Queue) found fully CODE COMPLETE on disk but
    claimed "not started" everywhere

16a. `CHANGELOG.md` and `next.config.ts` were present under mangled
names again — `CHANGELOG .md` (trailing space) and `next.config (2).ts`
— the same pattern as item 6, now recurring for a fifth time (previously
closed/reopened across 2026-08-28, 2026-09-03, 2026-09-05, and now
2026-09-17). Renamed `CHANGELOG .md` → `CHANGELOG.md`. Compared
`next.config (2).ts` against the canonical `next.config.ts` line by
line before touching anything (RULE 7-adjacent caution — do not assume
which of two same-purpose files is stale): confirmed `next.config.ts`
already contains everything `next.config (2).ts` has and more
(the `(2)` file was missing the `images.remotePatterns` Supabase
hostname entry, the SVG/CSP image config, and the documented
`experimental.serverActions.bodySizeLimit` fix for the >1MB image
upload bug) — `next.config (2).ts` was the stale duplicate, not a
newer version. Removed it; no code change, both were pre-existing.
Per item 6's own prior note, this is now the fifth occurrence — still
recommend fixing this at whatever export/upload step produces the
zip, rather than re-patching it every session.

16b. `PROJECT_STATUS.md` was found truncated mid-sentence at the very
end of the file (the VENDOR-03 M2 entry's "Delivered:" list cuts off
after "...one consolidated Zod schema/form covering owner account +
property details + facilities checklist (from M1's catalog) +
payout/contact, submitted\nin " — no closing text, no M3 entry, no M4
entry, despite the same file's own "Next Development Phase" summary
line claiming "M3 partially covered, M4 not started"). Root cause not
determined — could be an export/copy truncation (same family of
issue as item 6/16a) or content that was genuinely never written.
Fixed by completing the M2 entry's file list from CHANGELOG.md's
matching 2026-08-28 entry (the two were never actually in conflict,
just cut off) and adding real M3/M4 entries — see PROJECT_STATUS.md's
VENDOR-03 section, this session.

16c. Nowhere in PROJECT_STATUS.md, SESSION_HANDOFF.md, CHANGELOG.md,
or DEVELOPMENT_BIBLE.md is VENDOR-03 M3 ever actually scoped — no
milestone plan entry defines what M3 covers, only that CHANGELOG.md's
2026-08-28 M2 entry says "property photo/ID-proof upload... no
Storage bucket/path designed yet" was explicitly deferred out of M2.
The "M3 partially covered" line in PROJECT_STATUS.md's Next
Development Phase summary is therefore a dangling claim with nothing
behind it — same class of issue as item 5's dangling citation. Not
resolved this session (would require a product decision on M3's real
scope, which is outside a documentation-audit session — RULE 12, no
assumptions). Logged so the next session either scopes M3 properly
(most likely: property photo/ID-proof upload, per the M2 deferral
note above) or removes the dangling claim.

16d. VENDOR-03 M4 (Admin Approval Queue) was found fully implemented
on disk — `src/app/admin/hotels/pending/page.tsx`,
`HotelRepository.getHotelsByStatus()`, and
`getPendingHotelsAdmin`/`approveHotelAdmin`/`rejectHotelAdmin` in
`hotel.actions.ts` — complete with its own RULE 15 audit note already
written in the code comments, role-gated (`requireRole(['admin',
'super_admin'])`), linked from `/admin/hotels`, and mentioned in
`/admin`'s dashboard card description. None of this had a
PROJECT_STATUS.md/CHANGELOG.md/SESSION_HANDOFF.md entry —
PROJECT_STATUS.md instead claimed "M4 not started." Classic RULE 40
gap (code shipped, docs never caught up), same pattern as CONTACT-01
originally. No code was changed for M4 itself this session — it was
verified against `tsc --noEmit`/`eslint` (both clean, part of this
session's whole-project run) and backfilled into PROJECT_STATUS.md
and CHANGELOG.md. NOT verified: no live Supabase reachable from this
sandbox, so the approve/reject flow has not been walked through
end-to-end against a real pending listing (RULE 21/23).

Status: 16a CLOSED (filenames fixed, again). 16b CLOSED (file
completed). 16c OPEN (needs a product scoping decision, not a code
fix). 16d CLOSED on documentation (backfilled); the underlying M4 code
itself remains NOT VERIFIED live per RULE 23.

---

17. VENDOR-BOOKING-01 (vendor-facing booking visibility) — found fully
    implemented on disk, zero PROJECT_STATUS.md/CHANGELOG.md/
    SESSION_HANDOFF.md entry of its own; PROJECT_STATUS.md's Pending
    section still lists "vendor-facing booking access" as deferred

What: discovered while scoping the next milestone (2026-09-17,
continuation of the day's session, right after the item-16 audit
above). `src/lib/auth/vendor-context.ts` (requireVendorContext() — a
read-only counterpart to owner-context.ts's requireOwnerVendor(),
deliberately separate per its own header comment so the write-scoped
hotel_owner allowlist is never widened to the read-only 'vendor'
role), `src/app/actions/vendor-booking.actions.ts`
(getMyVendorBookings(), scoped via BookingRepository.getBookingsByVendorId()),
`src/app/vendor/page.tsx` (redirects to /vendor/bookings — "a full
vendor dashboard home is out of scope here" per its own comment), and
`src/app/vendor/bookings/page.tsx` (status-filterable, paginated list)
are all present, wired together, and role-gated
(`requireRole(['vendor','hotel_owner','admin','super_admin'])`).
The code's own comments explicitly say it "clos[es] the 'vendor-facing
booking access' gap named in PROJECT_STATUS.md's Booking deferred-
scope list" — but PROJECT_STATUS.md line 263 (Pending → Booking →
deferred scope) still lists that exact gap as open, and CHANGELOG.md
only mentions `src/app/vendor/bookings/page.tsx` once, in passing,
inside PAY-04's 2026-09-17 entry (which added a nav row to an already-
existing page, not the page itself) — the milestone that actually
built VENDOR-BOOKING-01 has no entry of its own anywhere. Same RULE 40
failure mode as CONTACT-01 and item 16d (VENDOR-03 M4): real,
correctly-built feature code, shipped with no paper trail.

Files: src/lib/auth/vendor-context.ts, src/app/actions/vendor-booking.actions.ts,
src/app/vendor/page.tsx, src/app/vendor/bookings/page.tsx,
src/lib/repositories/booking.repository.ts (getBookingsByVendorId,
read-only, scoped to a single vendor_id).

Verified this session: tsc --noEmit PASS, eslint PASS (0 errors,
whole project, same run as item 16). Read-only (no writes) — a vendor
cannot confirm/cancel/complete a booking from this page, by explicit
design (see vendor-booking.actions.ts header comment — a vendor-write
workflow is intentionally left for a future, separately-audited
milestone). No schema change; reuses the existing bookings.vendor_id
column populated at booking-creation time.

Status: Backfilled into PROJECT_STATUS.md and CHANGELOG.md this
session (see VENDOR-BOOKING-01 entries there) — the Pending section's
stale "vendor-facing booking access" line removed accordingly. NOT
verified: no live Supabase reachable in this sandbox, so no real
vendor account has ever exercised this page end-to-end (RULE 21/23).
