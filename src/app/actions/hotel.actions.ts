'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/session';
import { HotelRepository, HotelRecord, HotelImageRow } from '@/lib/repositories/hotel.repository';

// --- HOME-03: Trending Hotels (public, homepage) ---
// Restored during the 2026-08-06 stabilization audit — Trending.tsx
// already called this, but the export was missing from this file.

export async function getTrendingHotels(limit: number = 6): Promise<HotelRecord[]> {
  const supabase = await createClient();
  const repo = new HotelRepository(supabase);
  return repo.getTrendingHotels(limit);
}

// --- PUBLIC-01: Public Marketing Pages (/hotels, /hotels/[slug]) ---
// No requireRole — public read. Mirrors destination.actions.ts's
// getAllPublicDestinations / getDestinationBySlug. Restored during the
// 2026-08-06 stabilization audit — src/app/hotels/page.tsx and
// src/app/hotels/[slug]/page.tsx already called these, but the exports
// were missing from this file even though HotelRepository already had
// the matching getPublishedHotels()/getHotelBySlug() methods.

export async function getPublishedHotels(page: number = 1, limit: number = 20) {
  const supabase = await createClient();
  const repo = new HotelRepository(supabase);
  return repo.getPublishedHotels(page, limit);
}

export async function getHotelBySlug(slug: string): Promise<HotelRecord | null> {
  const supabase = await createClient();
  const repo = new HotelRepository(supabase);
  return repo.getHotelBySlug(slug);
}

// --- ADMIN-02: Hotel Management (CRUD) ---
// Restored during the 2026-08-06 stabilization audit. HotelForm,
// admin/hotels pages, and admin/hotels/[id]/edit all already called
// these admin actions, and HotelRepository already had the matching
// data-layer methods (getAllHotelsPaginated, getHotelById, createHotel,
// updateHotel, deleteHotel) — only the Server Action wiring was
// missing. Mirrors destination.actions.ts (ADMIN-06) and
// package.actions.ts (ADMIN-04) exactly.

const hotelInputSchema = z.object({
  hotel_name: z.string().min(1, 'Hotel name is required'),
  slug: z.string().min(1, 'Slug is required'),
  description: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  star_rating: z.number().min(0).max(5).nullable().optional(),
  starting_price: z.number().min(0).nullable().optional(),
  is_featured: z.boolean().optional(),
  status: z.string().min(1, 'Status is required'),
});

export type HotelInput = z.infer<typeof hotelInputSchema>;

export async function getAllHotelsAdmin(page: number = 1, limit: number = 20) {
  await requireRole(['admin', 'super_admin']);
  const supabase = await createClient();
  const repo = new HotelRepository(supabase);
  return repo.getAllHotelsPaginated(page, limit);
}

export async function getHotelByIdAdmin(id: string): Promise<HotelRecord | null> {
  await requireRole(['admin', 'super_admin']);
  const supabase = await createClient();
  const repo = new HotelRepository(supabase);
  return repo.getHotelById(id);
}

export async function createHotelAdmin(input: HotelInput) {
  await requireRole(['admin', 'super_admin']);
  const parsed = hotelInputSchema.parse(input);
  const supabase = await createClient();
  const repo = new HotelRepository(supabase);
  return repo.createHotel(parsed);
}

export async function updateHotelAdmin(id: string, input: HotelInput) {
  await requireRole(['admin', 'super_admin']);
  const parsed = hotelInputSchema.parse(input);
  const supabase = await createClient();
  const repo = new HotelRepository(supabase);
  return repo.updateHotel(id, parsed);
}

export async function deleteHotelAdmin(id: string): Promise<boolean> {
  await requireRole(['admin', 'super_admin']);
  const supabase = await createClient();
  const repo = new HotelRepository(supabase);
  return repo.deleteHotel(id);
}

// --- ADMIN-03: Hotel Image Upload / Management ---
// All Supabase Storage calls (upload/remove/getPublicUrl) live here.
// HotelRepository performs hotel_images table CRUD only. Restored
// during the 2026-08-06 stabilization audit — HotelImageManager.tsx
// and admin/hotels/[id]/images already called these admin actions;
// only the Server Action wiring was missing. Mirrors
// destination.actions.ts (ADMIN-07) / package.actions.ts (ADMIN-05).

const HOTEL_ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const HOTEL_MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export interface HotelImageWithUrl extends HotelImageRow {
  publicUrl: string;
}

function normalizeHotelStoragePath(storagePath: string): string {
  return storagePath.startsWith('hotel-images/')
    ? storagePath.slice('hotel-images/'.length)
    : storagePath;
}

function hotelExtensionFromMimeType(mimeType: string): string {
  switch (mimeType) {
    case 'image/jpeg':
    case 'image/jpg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    default:
      return 'webp';
  }
}

export async function getHotelImagesAdmin(hotelId: string): Promise<HotelImageWithUrl[]> {
  await requireRole(['admin', 'super_admin']);
  const supabase = await createClient();
  const repo = new HotelRepository(supabase);

  const rows = await repo.listHotelImages(hotelId);

  return rows.map((row) => {
    const normalizedPath = normalizeHotelStoragePath(row.storage_path);
    const { data: publicUrlData } = supabase.storage
      .from('hotel-images')
      .getPublicUrl(normalizedPath);

    return { ...row, publicUrl: publicUrlData.publicUrl };
  });
}

export async function uploadHotelImageAdmin(
  hotelId: string,
  file: File,
  isPrimary: boolean
): Promise<HotelImageWithUrl> {
  await requireRole(['admin', 'super_admin']);

  if (!HOTEL_ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error('Only jpg, jpeg, png, and webp files are allowed.');
  }
  if (file.size > HOTEL_MAX_IMAGE_SIZE_BYTES) {
    throw new Error('Image must be 5MB or smaller.');
  }

  const supabase = await createClient();
  const repo = new HotelRepository(supabase);

  // Stable path: hotel-images/{hotelId}/{uuid}.{ext} — never uses hotel
  // slug, since slugs can change.
  const ext = hotelExtensionFromMimeType(file.type);
  const objectKey = `${hotelId}/${crypto.randomUUID()}.${ext}`;
  const storedPath = `hotel-images/${objectKey}`; // stored in DB, matches existing convention

  const { error: uploadError } = await supabase.storage
    .from('hotel-images')
    .upload(objectKey, file, { contentType: file.type, upsert: false });

  if (uploadError) {
    throw new Error(`Failed to upload image: ${uploadError.message}`);
  }

  const existing = await repo.listHotelImages(hotelId);
  const nextSortOrder = existing.length > 0
    ? Math.max(...existing.map((img) => img.sort_order)) + 1
    : 0;

  const shouldBePrimary = isPrimary || existing.length === 0;

  const row = await repo.insertHotelImageRow(
    hotelId,
    storedPath,
    shouldBePrimary,
    nextSortOrder
  );

  if (shouldBePrimary && existing.length > 0) {
    await repo.setPrimaryHotelImage(hotelId, row.id);
  }

  const { data: publicUrlData } = supabase.storage
    .from('hotel-images')
    .getPublicUrl(objectKey);

  return { ...row, publicUrl: publicUrlData.publicUrl };
}

export async function setPrimaryHotelImageAdmin(hotelId: string, imageId: string): Promise<void> {
  await requireRole(['admin', 'super_admin']);
  const supabase = await createClient();
  const repo = new HotelRepository(supabase);
  await repo.setPrimaryHotelImage(hotelId, imageId);
}

export async function reorderHotelImageAdmin(imageId: string, sortOrder: number): Promise<void> {
  await requireRole(['admin', 'super_admin']);
  const supabase = await createClient();
  const repo = new HotelRepository(supabase);
  await repo.updateHotelImageSortOrder(imageId, sortOrder);
}

export async function deleteHotelImageAdmin(imageId: string): Promise<void> {
  await requireRole(['admin', 'super_admin']);
  const supabase = await createClient();
  const repo = new HotelRepository(supabase);

  // Delete order: fetch row -> Storage.remove() -> only then delete DB row.
  const row = await repo.getHotelImageById(imageId);
  if (!row) {
    throw new Error('Image not found.');
  }

  const normalizedPath = normalizeHotelStoragePath(row.storage_path);

  const { error: removeError } = await supabase.storage
    .from('hotel-images')
    .remove([normalizedPath]);

  if (removeError) {
    throw new Error(`Failed to delete image from storage: ${removeError.message}`);
  }

  await repo.deleteHotelImageRow(imageId);
}

// --- Pre-existing exports below (unchanged) ---

export async function addHotelImageAction(
  hotelId: string,
  storagePath: string,
  isPrimary: boolean = false,
  sortOrder: number = 0
) {
  const supabase = await createClient();
  const repo = new HotelRepository(supabase);

  try {
    const newImage = await repo.insertHotelImageRow(
      hotelId,
      storagePath,
      isPrimary,
      sortOrder
    );
    return { success: true, data: newImage };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createHotelImage(
  hotelId: string,
  storagePath: string,
  isPrimary: boolean = false,
  sortOrder: number = 0
) {
  const supabase = await createClient();
  const repo = new HotelRepository(supabase);

  try {
    const image = await repo.insertHotelImageRow(
      hotelId,
      storagePath,
      isPrimary,
      sortOrder
    );
    return { success: true, data: image };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getHotelsAction(page: number = 1, limit: number = 20) {
  const supabase = await createClient();
  const repo = new HotelRepository(supabase);

  try {
    const result = await repo.getAllHotelsPaginated(page, limit);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getPublishedHotelsAction(page: number = 1, limit: number = 20) {
  const supabase = await createClient();
  const repo = new HotelRepository(supabase);

  try {
    const result = await repo.getPublishedHotels(page, limit);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getHotelBySlugAction(slug: string) {
  const supabase = await createClient();
  const repo = new HotelRepository(supabase);

  try {
    const hotel = await repo.getHotelBySlug(slug);
    return { success: true, data: hotel };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteHotelImageAction(imageId: string) {
  const supabase = await createClient();
  const repo = new HotelRepository(supabase);

  try {
    await repo.deleteHotelImageRow(imageId);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function setPrimaryHotelImageAction(hotelId: string, imageId: string) {
  const supabase = await createClient();
  const repo = new HotelRepository(supabase);

  try {
    await repo.setPrimaryHotelImage(hotelId, imageId);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
