# Room seed photos (Shri Sitaram Seva Trust)

Professional gallery photos for the five Ayodhya room categories seeded by
`044_ayodhya01_sitaram_seva_seed.sql`. **6 images per room** (hero bed shot,
a second room angle, bathroom, a window/detail or amenity shot) — the count a
professional listing uses. Total ~2.2 MB, all resized to <=1400px wide WebP.

Uploaded to the `room-images` Storage bucket + `hotel_room_images` rows by
`scripts/seed-room-images.ts` (`npm run seed:room-images`). Folder names match
`hotel_rooms.room_name` exactly. The first file (`01.webp`) becomes the primary.

## Licensing

Every photo is free for commercial use. No all-rights-reserved stock:

- **CC0 / Public Domain (13)** — [rawpixel](https://www.rawpixel.com), no
  attribution required.
- **CC BY 4.0 / CC BY 2.0 (17)** — [Wikimedia Commons](https://commons.wikimedia.org),
  attribution required (photographers credited in `CREDITS.json`).

`CREDITS.json` lists the source, license, photographer, and landing URL for
each file. These are launch placeholders so the rooms are never photo-less —
replace them with the real property shoot when available (Admin -> Rooms ->
Images); the seeder skips any room that already has images, so a manual upload
wins and re-running the seeder is a no-op.
