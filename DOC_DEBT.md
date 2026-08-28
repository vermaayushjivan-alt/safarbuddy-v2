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
