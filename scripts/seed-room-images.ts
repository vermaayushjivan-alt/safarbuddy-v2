/**
 * ROOM IMAGE SEEDER (Shri Sitaram Seva Trust, Ayodhya)
 *
 * Uploads the curated, license-free room photos in
 * public/seed-images/rooms/<folder>/ to the `room-images` Storage bucket
 * and inserts matching rows into hotel_room_images — the exact table +
 * bucket the public read path uses (room-type.actions.ts
 * resolveBookableRoom -> hotel_room_images -> storage.from('room-images')).
 *
 * Each subfolder name must equal the hotel_rooms.room_name it seeds
 * (see 044_ayodhya01_sitaram_seva_seed.sql). The seeder resolves rooms by
 * exact name under the target hotel, so it never guesses or touches other
 * hotels' rooms.
 *
 * Idempotent: a room that already has ANY hotel_room_images row is skipped
 * entirely, so re-running never duplicates or overwrites. Uploaded objects
 * use upsert:false, mirroring seed-placeholder-images.ts.
 *
 * Requires the service role key (writes Storage objects + rows outside a
 * user session) — run manually from a trusted environment, once. NOT part
 * of the app's request/response path.
 *
 * Run:  npx tsx scripts/seed-room-images.ts
 */

import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment. " +
      "This script requires the service role key (not the anon key) because it " +
      "writes storage objects and rows across rooms."
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const HOTEL_SLUG = "shri-sitaram-seva-trust";
const ROOM_IMAGES_DIR = path.join(
  process.cwd(),
  "public",
  "seed-images",
  "rooms"
);
const BUCKET = "room-images";

interface RoomRow {
  id: string;
  room_name: string;
}

function listRoomFolders(): string[] {
  if (!fs.existsSync(ROOM_IMAGES_DIR)) return [];
  return fs
    .readdirSync(ROOM_IMAGES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
}

function listFolderImages(folder: string): string[] {
  const dir = path.join(ROOM_IMAGES_DIR, folder);
  return fs
    .readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith(".webp"))
    .sort();
}

async function resolveHotelId(): Promise<string | null> {
  // Same legacy-slug tolerance as 044: rows saved before slug
  // canonicalization may hold spaces instead of hyphens.
  const { data, error } = await supabase
    .from("hotels")
    .select("id")
    .or(`slug.eq.${HOTEL_SLUG},slug.eq.shri sitaram seva trust`)
    .is("deleted_at", null)
    .limit(1);

  if (error) {
    console.error("Failed to resolve hotel:", error.message);
    return null;
  }
  return data?.[0]?.id ?? null;
}

async function roomHasImages(roomId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from("hotel_room_images")
    .select("*", { count: "exact", head: true })
    .eq("room_id", roomId);

  if (error) {
    console.error(`  count check failed: ${error.message}`);
    return false;
  }
  return !!count && count > 0;
}

async function seedRooms() {
  const folders = listRoomFolders();
  if (folders.length === 0) {
    console.log("No room folders found under public/seed-images/rooms. Nothing to do.");
    return;
  }

  const hotelId = await resolveHotelId();
  if (!hotelId) {
    console.error(
      `Hotel not found (slug: ${HOTEL_SLUG}). Run 044_ayodhya01_sitaram_seva_seed.sql first.`
    );
    process.exit(1);
  }

  const { data: rooms, error: roomsError } = await supabase
    .from("hotel_rooms")
    .select("id, room_name")
    .eq("hotel_id", hotelId)
    .is("deleted_at", null);

  if (roomsError) {
    console.error("Failed to fetch rooms:", roomsError.message);
    process.exit(1);
  }
  const roomRows = (rooms ?? []) as RoomRow[];

  for (const folder of folders) {
    const room = roomRows.find((r) => r.room_name === folder);
    if (!room) {
      console.log(`[${folder}] no matching room_name under hotel. Skipping.`);
      continue;
    }

    if (await roomHasImages(room.id)) {
      console.log(`[${folder}] already has images. Skipping.`);
      continue;
    }

    const files = listFolderImages(folder);
    if (files.length === 0) {
      console.log(`[${folder}] no .webp images found. Skipping.`);
      continue;
    }

    let saved = 0;
    for (let i = 0; i < files.length; i++) {
      const fileName = files[i];
      const localPath = path.join(ROOM_IMAGES_DIR, folder, fileName);

      // Deterministic object key (roomId + filename) so a re-run after a
      // partial failure reuses the same path rather than orphaning a new
      // UUID object. Stored path carries the `room-images/` prefix exactly
      // like uploadRoomImageAdmin / uploadMyRoomImage write it — the public
      // read path strips that prefix via normalizeRoomStoragePath.
      const objectKey = `${room.id}/${fileName}`;
      const storagePath = `room-images/${objectKey}`;

      const fileBuffer = fs.readFileSync(localPath);

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(objectKey, fileBuffer, {
          contentType: "image/webp",
          upsert: false,
        });

      if (uploadError) {
        if (!uploadError.message.toLowerCase().includes("already exists")) {
          console.error(`  upload failed for ${fileName}: ${uploadError.message}`);
          continue;
        }
      }

      const { error: insertError } = await supabase
        .from("hotel_room_images")
        .insert({
          room_id: room.id,
          storage_path: storagePath,
          is_primary: i === 0,
          sort_order: i,
        });

      if (insertError) {
        console.error(`  insert failed for ${fileName}: ${insertError.message}`);
        continue;
      }

      saved++;
    }

    console.log(`[${folder}] seeded ${saved}/${files.length} images.`);
  }
}

async function main() {
  console.log("Starting room image seed...");
  await seedRooms();
  console.log("Done.");
}

main().catch((err) => {
  console.error("Seeder failed:", err);
  process.exit(1);
});
