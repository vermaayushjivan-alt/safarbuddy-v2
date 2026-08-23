PROJECT_STATUS.md — ADD THIS ENTRY
(I don't have live repo access, so paste this into your actual
PROJECT_STATUS.md: add the milestone under "Completed", and add the
v13 line under "Version History", matching your existing v8–v12
format.)

--------------------------------------------------------------------
Add under "Completed":

PUBLIC-02 (Public Room Browsing on Hotel Detail Page) — CODE COMPLETE
— DEPLOYMENT NOT YET VERIFIED LIVE

Root-caused why room type + image data added via ROOM-01 through
ROOM-05 was invisible everywhere it was supposed to surface —
customer hotel pages, the booking flow, the admin room list, and
hotel-owner (which has no page built at all yet). Not a single bug:
five independent RLS/policy/code gaps, all fail-closed and all
silent (Supabase returns an empty array on RLS denial, never an
error):

- hotel_rooms had an owner/admin-only ALL policy and zero public
  SELECT policy.
- room_prices and room_inventory had RLS enabled with zero policies
  at all — blocked even admin/owner reads through the app (direct
  SQL via the Supabase SQL editor bypasses RLS, which is why the
  data "looked fine" in the SQL editor while the app saw nothing).
- hotel_room_images: same zero-policy issue, blocking the DB insert
  step of image upload even after Storage upload succeeded.
- storage.objects policy for the room-images bucket gated uploads on
  the first path segment matching the uploader's own user id — right
  pattern for true per-user buckets (user-avatars, vendor-logos),
  wrong for room-images, which is keyed by room id, not uploader.
  Every upload failed the with_check regardless of who was logged in.
- /hotels/[slug]/page.tsx (public hotel detail page) never rendered
  any room-level content — by original PUBLIC-01 design, only
  hotel-level fields were shown. Rooms were only ever reachable via
  the booking page's post-date-selection flow.

Fixed via new/replaced RLS policies (applied directly in the
Supabase SQL editor — see "Not yet migrated" below) and added a
Rooms section to the public hotel detail page: card grid showing
each active room's primary image (or a placeholder), name, type, bed
type, capacity, size, and base price, sourced from a new
getRoomsForHotelPublic() action. Deliberately does not show final
per-date price/availability (still requires the booking flow) and
deliberately does not show any hotel/vendor contact info — a
"Contact SafarBuddy Support" link (existing footerContact.supportEmail)
is shown instead, to keep the booking flow as the only path to
completing a booking rather than letting customers route around it
directly to the vendor.

Not yet migrated: the new RLS policies (hotel_rooms_public_read,
room_prices_public_read, room_inventory_public_read,
hotel_room_images_admin_all, hotel_room_images_public_read) and the
three replaced room-images storage.objects policies exist live in
Supabase but are not yet captured as a numbered migration file in
src/db/sql/ — same "live-only" gap already flagged for
005_room01_schema.sql in v9.

Deployment status: code is committed, but as of session end had not
been confirmed live — Vercel's deployment list showed repeated
"Redeploy of <hash>" entries against an unrelated old commit rather
than fresh builds off the new pushes. Working theory: edits made
directly on github.com landed on an open PR branch instead of the
production branch, so Vercel's auto-deploy never saw them. Next
session must confirm the PR is merged, confirm a fresh (non-redeploy)
production build actually ran, verify the Rooms section renders with
a nonzero room count, and only then remove the two TEMP DEBUG blocks
left in src/app/hotels/[slug]/page.tsx.

Not started: hotel-owner room management (src/app/hotel-owner/ has
only layout.tsx, no actual pages), and linking a specific room card
to a pre-selected room in the booking flow (currently all "Book Now"
/ room card actions land on the same generic date-picker booking
page).

--------------------------------------------------------------------
Add under "Version History":

v13 (2026-08-24) — PUBLIC-02 built: public Rooms section added to
the hotel detail page. Session also found and fixed the actual root
cause of ROOM-01–05 data being invisible end-to-end: hotel_rooms had
no public SELECT policy, room_prices/room_inventory/hotel_room_images
had RLS enabled with zero policies at all (fail-closed, silent), and
the room-images storage bucket's upload policy used a per-uploader
foldername check that could never match this room-keyed upload path.
All fixed via new RLS policies applied live in Supabase (not yet
captured in a src/db/sql/ migration file — carried over as a gap,
same as 005_room01_schema.sql in v9). Deployment of the PUBLIC-02
code itself was NOT confirmed live by end of session — see
SESSION_HANDOFF.md for the open PR/deploy issue and required next
step before this can be marked Frozen.
