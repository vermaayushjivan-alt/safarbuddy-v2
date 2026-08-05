/**
 * ONE-TIME PLACEHOLDER IMAGE SEEDER
 *
 * Uploads local placeholder images to the existing hotel-images /
 * package-images Supabase Storage buckets, and inserts corresponding rows
 * into hotel_images / package_images — ONLY for hotels/packages that
 * currently have no image row.
 *
 * Idempotent: safe to run multiple times. Never overwrites or duplicates
 * existing rows or uploaded files.
 *
 * Requires elevated privileges (service role) since it writes across
 * multiple hotels/packages outside a normal user session — this script is
 * intended to be run manually, once, from a trusted environment. It is
 * NOT part of the app's request/response path.
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
      "writes storage objects and rows across many hotels/packages."
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const HOTEL_IMAGES_DIR = path.join(process.cwd(), "public", "seed-images", "hotels");
const PACKAGE_IMAGES_DIR = path.join(process.cwd(), "public", "seed-images", "packages");

function listLocalImages(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith(".webp"))
    .sort();
}

async function seedHotels() {
  const localFiles = listLocalImages(HOTEL_IMAGES_DIR);
  if (localFiles.length === 0) {
    console.log("[hotels] No local placeholder images found. Skipping.");
    return;
  }

  const { data: hotels, error: hotelsError } = await supabase
    .from("hotels")
    .select("id, slug");

  if (hotelsError) {
    console.error("[hotels] Failed to fetch hotels:", hotelsError.message);
    return;
  }
  if (!hotels || hotels.length === 0) {
    console.log("[hotels] No hotels found.");
    return;
  }

  let fileIndex = 0;

  for (const hotel of hotels) {
    // Never overwrite: skip if this hotel already has any image row.
    const { count, error: countError } = await supabase
      .from("hotel_images")
      .select("*", { count: "exact", head: true })
      .eq("hotel_id", hotel.id);

    if (countError) {
      console.error(`[hotels] Skipping ${hotel.slug} — count check failed:`, countError.message);
      continue;
    }
    if (count && count > 0) {
      console.log(`[hotels] ${hotel.slug} already has an image. Skipping.`);
      continue;
    }

    const localFileName = localFiles[fileIndex % localFiles.length];
    fileIndex++;

    const localFilePath = path.join(HOTEL_IMAGES_DIR, localFileName);
    // storage_path saved WITHOUT the bucket name prefix — bucket is already
    // provided by storage.from("hotel-images").
    const storagePath = `${hotel.slug}/${localFileName}`;

    const fileBuffer = fs.readFileSync(localFilePath);

    const { error: uploadError } = await supabase.storage
      .from("hotel-images")
      .upload(storagePath, fileBuffer, {
        contentType: "image/webp",
        upsert: false, // never overwrite an existing object
      });

    if (uploadError) {
      // If it already exists in storage (e.g. re-run after a partial
      // failure), treat as non-fatal and continue to the DB insert check.
      if (!uploadError.message.toLowerCase().includes("already exists")) {
        console.error(`[hotels] Upload failed for ${hotel.slug}:`, uploadError.message);
        continue;
      }
    }

    const { error: insertError } = await supabase.from("hotel_images").insert({
      hotel_id: hotel.id,
      storage_path: storagePath,
      is_primary: true,
      sort_order: 0,
    });

    if (insertError) {
      console.error(`[hotels] Insert failed for ${hotel.slug}:`, insertError.message);
      continue;
    }

    console.log(`[hotels] Seeded ${hotel.slug} -> ${storagePath}`);
  }
}

async function seedPackages() {
  const localFiles = listLocalImages(PACKAGE_IMAGES_DIR);
  if (localFiles.length === 0) {
    console.log("[packages] No local placeholder images found. Skipping.");
    return;
  }

  const { data: packages, error: packagesError } = await supabase
    .from("packages")
    .select("id, slug");

  if (packagesError) {
    console.error("[packages] Failed to fetch packages:", packagesError.message);
    return;
  }
  if (!packages || packages.length === 0) {
    console.log("[packages] No packages found.");
    return;
  }

  let fileIndex = 0;

  for (const pkg of packages) {
    const { count, error: countError } = await supabase
      .from("package_images")
      .select("*", { count: "exact", head: true })
      .eq("package_id", pkg.id);

    if (countError) {
      console.error(`[packages] Skipping ${pkg.slug} — count check failed:`, countError.message);
      continue;
    }
    if (count && count > 0) {
      console.log(`[packages] ${pkg.slug} already has an image. Skipping.`);
      continue;
    }

    const localFileName = localFiles[fileIndex % localFiles.length];
    fileIndex++;

    const localFilePath = path.join(PACKAGE_IMAGES_DIR, localFileName);
    const storagePath = `${pkg.slug}/${localFileName}`;

    const fileBuffer = fs.readFileSync(localFilePath);

    const { error: uploadError } = await supabase.storage
      .from("package-images")
      .upload(storagePath, fileBuffer, {
        contentType: "image/webp",
        upsert: false,
      });

    if (uploadError) {
      if (!uploadError.message.toLowerCase().includes("already exists")) {
        console.error(`[packages] Upload failed for ${pkg.slug}:`, uploadError.message);
        continue;
      }
    }

    const { error: insertError } = await supabase.from("package_images").insert({
      package_id: pkg.id,
      storage_path: storagePath,
      is_primary: true,
      sort_order: 0,
    });

    if (insertError) {
      console.error(`[packages] Insert failed for ${pkg.slug}:`, insertError.message);
      continue;
    }

    console.log(`[packages] Seeded ${pkg.slug} -> ${storagePath}`);
  }
}

async function main() {
  console.log("Starting placeholder image seed...");
  await seedHotels();
  await seedPackages();
  console.log("Done.");
}

main().catch((err) => {
  console.error("Seeder failed:", err);
  process.exit(1);
});
