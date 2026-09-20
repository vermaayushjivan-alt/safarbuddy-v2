
-- SafarBuddy — 026_offers_image_upload.sql
-- ADMIN-08 follow-up — offer banner image UPLOAD (was a plain pasted
-- URL only, per that milestone's own explicit-scope note in
-- offer.actions.ts: "no Storage/bucket logic is added here; that is
-- out of scope for this milestone per explicit instruction" — that
-- instruction has now changed, per chat).
--
-- MIGRATION NUMBER: follows 024 (promotions table) and 025
-- (promotion-logos bucket), both reported run live already. Confirm
-- 026 is actually the next-free number before running — same caution
-- repeated at every migration in this project.
--
-- Same pattern as 025_promo01_logo_upload.sql: a new PUBLIC bucket
-- (an offer banner must be visible to every homepage visitor), same
-- 5MB / jpg-png-webp limits as hotel-images/room-images/promotion-logos.
-- No table/column change — `offers.image` already stores a plain URL
-- string; upload just gives the admin form a second way to fill it.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'offer-images',
  'offer-images',
  true,
  5242880,
  array['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- Writes go through the session client + requireRole(['admin',
-- 'super_admin']) in uploadOfferImageAdmin (offer.actions.ts) — same
-- as every other write in offer.actions.ts, which uses createClient()
-- rather than createServiceRoleClient() (unlike promotion.actions.ts,
-- which uses the service-role client for its admin writes). Adding an
-- explicit authenticated INSERT policy below rather than assuming
-- whatever policy already lets hotel-images/room-images accept
-- authenticated uploads also covers this new bucket — self-contained,
-- doesn't rely on an unverified existing policy. `public = true` is
-- what makes reads work for every homepage visitor; this policy only
-- covers writes.

drop policy if exists "offer-images insert authenticated" on storage.objects;
create policy "offer-images insert authenticated"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'offer-images');
