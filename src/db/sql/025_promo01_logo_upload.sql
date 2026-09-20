-- SafarBuddy — 025_promo01_logo_upload.sql
-- PROMO-01 follow-up — logo image UPLOAD (not just a pasted URL).
--
-- MIGRATION NUMBER: 024_promo01_promotions.sql (the `promotions` table
-- + counter functions) is already confirmed run live in Supabase.
-- This is a separate, additive migration — only creates a Storage
-- bucket, touches no existing table/column. Confirm 025 is actually
-- the next-free number before running (same caution as 024's own
-- renumbering note).
--
-- DESIGN: a new PUBLIC bucket (unlike vendor-kyc-documents, which is
-- private — a promotion logo is meant to be shown to every homepage
-- visitor, same reasoning as the existing `hotel-images`/`room-images`
-- buckets, both also public). Created via SQL rather than the
-- dashboard UI, same as vendor-kyc-documents' 019 migration in the
-- other thread — confirm it actually appears under Storage in the
-- dashboard after running, per that migration's own note.
--
-- No RLS/table change needed on `promotions` itself — `logo_image`
-- already stores a plain URL string; upload just gives the admin form
-- a second way to fill that same field (a public Storage URL instead
-- of a manually pasted one).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'promotion-logos',
  'promotion-logos',
  true,
  5242880, -- 5MB, same limit as hotel/room images
  array['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- Writes go through createServiceRoleClient() only (uploadPromotionLogoAdmin
-- in promotion.actions.ts, requireRole-gated) — no anon/authenticated
-- INSERT policy on storage.objects for this bucket, same pattern as
-- hotel-images. Being `public = true` is what makes GET (read) work
-- for every homepage visitor without a storage.objects SELECT policy.
