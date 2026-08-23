SESSION_HANDOFF.md — ADD THIS SECTION AT THE TOP
(Note: I don't have live access to your repo, so this is a draft
block written from this chat session. Paste it above the existing
"Current milestone" section in SESSION_HANDOFF.md, and update
PROJECT_STATUS.md / CHANGELOG.md the same way you have for prior
sessions.)

Current milestone

PUBLIC-02 — Public room browsing on hotel detail page — CODE COMPLETE,
DEPLOYMENT NOT YET VERIFIED LIVE (this session, 2026-08-24).

Do not reopen the RLS/data work below — it is confirmed correct at
the database level. What's unverified is whether the latest commit
is actually the one Vercel is serving in production (see "Known open
issue" below).

Completed this session

1. Root-caused why rooms/images never appeared anywhere (customer
   hotel page, booking flow, admin, hotel-owner) despite ROOM-01
   through ROOM-05 being marked complete in earlier sessions:

   a. hotel_rooms had exactly one RLS policy
      (hotel_rooms_owner — ALL commands, gated on
      owns_vendor(vendor_id) OR is_admin()) and no policy allowing
      public/customer SELECT at all. Fail-closed by default — Supabase
      returns an empty array on RLS denial, not an error, so this
      failure was silent everywhere.

   b. room_prices and room_inventory both had RLS enabled with ZERO
      policies of any kind — also fail-closed, blocking even the
      admin/owner from reading their own data through the app (though
      direct SQL via the Supabase SQL editor bypasses RLS entirely,
      which is why DB queries looked fine while the app didn't).

   c. storage.objects policy room-images_auth_upload required the
      first path segment of the uploaded object key to equal
      current_user_id() — but the app's actual upload path is
      `${roomTypeId}/${uuid}.${ext}`, i.e. keyed by room, not by
      uploader. This pattern is correct for the true per-user buckets
      (user-avatars, vendor-logos, etc.) but wrong for room-images,
      which is an admin/owner-managed resource. Upload always failed
      the with_check regardless of who was logged in.

   d. hotel_room_images table had RLS enabled with ZERO policies —
      same fail-closed issue as (b), blocking the DB insert step even
      after storage upload succeeded.

   e. /app/hotel-owner/ only contains layout.tsx (a role gate) — no
      actual page.tsx was ever built for hotel owners to manage or
      view rooms. Not a bug; a feature that was never implemented.

   f. /hotels/[slug]/page.tsx (public hotel detail page) never
      rendered any room-level content at all — by design in the
      original PUBLIC-01 build, it only rendered hotel-level fields.
      Rooms were only ever reachable via the booking page after date
      selection, and only for rooms with both pricing and inventory
      rows present.

2. Applied SQL fixes directly via Supabase SQL editor (run by the
   user, verified in this session):

   - hotel_rooms_public_read — SELECT, public, using
     (status = 'active' and deleted_at is null)
   - room_prices_public_read — SELECT, public, using
     (deleted_at is null)
   - room_inventory_public_read — SELECT, public, using (true)
   - hotel_room_images_admin_all — ALL, authenticated, gated on the
     same owns_vendor()/is_admin() join pattern as hotel_rooms_owner
   - hotel_room_images_public_read — SELECT, public, using (true)
   - Dropped and recreated the three room-images storage.objects
     policies (auth_upload, owner_update, owner_delete) to check
     bucket_id = 'room-images' and is_admin() instead of the
     per-uploader foldername match. Confirmed: image upload now
     succeeds end-to-end (storage write + hotel_room_images row).

3. Shipped a product decision: room cards do NOT show any hotel/vendor
   contact info (would let customers bypass the booking flow and
   contact the vendor directly). Instead, a single "Contact SafarBuddy
   Support" mailto link (footerContact.supportEmail from
   src/data/home.ts — already used on the existing Contact page) is
   shown under the room grid.

4. Built PUBLIC-02 — added a Rooms section to
   /app/hotels/[slug]/page.tsx:

   - New function getRoomsForHotelPublic(hotelId) in
     room-type.actions.ts — public, no-auth read that returns active
     rooms plus each room's primary image (falls back to first image
     if none flagged primary), via the existing RoomTypeRepository.
   - Renders as a card grid: image (or "No photo yet" placeholder),
     room name, type, bed type, adult/child capacity, max occupancy,
     size, and base price. Explicitly does not show final
     price/availability — those still require the booking page's
     date-based flow, and the section says so.
   - Currently ships with a visible TEMP DEBUG line
     (`DEBUG — hotel.id: ... | rooms found: ...`) directly under the
     booking sidebar — added specifically to diagnose the deployment
     issue below. MUST BE REMOVED once deployment is confirmed
     working (see Known open issue).

Known open issue — NOT YET RESOLVED

Symptom: after pushing the PUBLIC-02 changes, the live site
(https://safarbuddy-v2-two.vercel.app/hotels/shri-sitaram-seva-trust)
kept showing the pre-change page — no Rooms section, no DEBUG line —
across cache-busting query params, incognito, and Vercel's own
"Visit" link on the latest deployment. Confirmed the committed file
on GitHub is correct (DEBUG line and imports present, verified by
reading it directly).

The Deployments list showed every recent entry as "Redeploy of
<hash>" with the same unrelated commit message ("Refactor payment
a...") — i.e. Vercel was repeatedly rebuilding an old commit, not
building fresh off new pushes.

Working theory (unconfirmed at session end): the file edits were
made directly on github.com, and the repo has an open Pull Request
(visible under the repo's "Pull requests (1)" tab). If GitHub routed
those edits into a PR branch instead of committing straight to the
production branch, Vercel — which only auto-deploys the connected
production branch — would never see the change, explaining exactly
this symptom.

Next step for whoever picks this up: open the repo's Pull Requests
tab, confirm the PUBLIC-02 changes are sitting in that PR, merge it
to the production branch, wait for the resulting auto-deploy (not a
manual redeploy), then reload the hotel page and confirm the DEBUG
line appears with a nonzero room count. Once confirmed working,
remove both TEMP DEBUG blocks from
src/app/hotels/[slug]/page.tsx (the console.log and the red
debug <p>) and redeploy clean.

Files changed this session

- src/app/actions/room-type.actions.ts — added
  getRoomsForHotelPublic() + PublicRoomSummary type.
- src/app/hotels/[slug]/page.tsx — added Rooms section, support
  contact link, and temporary debug output (to be removed — see
  above).

Database changes this session (applied directly via Supabase SQL
editor, not yet captured in a migration file in this repo)

- New RLS policies: hotel_rooms_public_read, room_prices_public_read,
  room_inventory_public_read, hotel_room_images_admin_all,
  hotel_room_images_public_read.
- Replaced three storage.objects policies on the room-images bucket
  (room-images_auth_upload, room-images_owner_update,
  room-images_owner_delete) with admin-gated equivalents.
- TODO: write these up as a proper numbered migration file (following
  the existing src/db/sql/NNN_*.sql convention) so they're tracked
  in-repo instead of only living in the live database.

Not started

- Hotel-owner rooms page (src/app/hotel-owner/ has no page.tsx at
  all yet) — needed if hotel owners are expected to manage their own
  rooms/images/pricing/availability, not just admins.
- Wiring the new public room cards to a specific room selection in
  the booking flow (currently "Book Now" still goes through the
  existing generic date-picker flow; clicking a specific room card
  doesn't pre-select that room).
  
