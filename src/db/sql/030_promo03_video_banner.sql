-- ROOT PATH: src/db/sql/030_promo03_video_banner.sql
-- PROMO-03 — allow short looping videos (mp4 / webm) as homepage promotion
-- banners. Only widens the allowed mime types of the existing public bucket
-- 'promotion-logos' (created in 025). Size limit stays 5MB. Safe to re-run.
-- Confirm 030 is the next-free migration number before running.

update storage.buckets
set allowed_mime_types = array[
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
  'video/mp4', 'video/webm'
]
where id = 'promotion-logos';
