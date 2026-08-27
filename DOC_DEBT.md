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

General note: three of these four items (2, 3, 4) are the same underlying
failure pattern — a session's SESSION_HANDOFF/CHANGELOG claimed something
was "done" that was not actually present/complete in the delivered repo.
RULE 21–23 (real functional walkthroughs, not just a green typecheck) and
RULE 32 (migrations must actually exist on disk) exist specifically to
catch this class of issue going forward.
