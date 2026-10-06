-- ROOT PATH: src/db/sql/029_offers_video_banner.sql
-- LAUNCH-05 — allow short looping videos (mp4 / webm) as offer banners.
-- Only widens the allowed mime types of the existing public bucket
-- 'offer-images' (created in 026). Size limit stays 5MB. Safe to re-run.

update storage.buckets
set allowed_mime_types = array[
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
  'video/mp4', 'video/webm'
]
where id = 'offer-images';
