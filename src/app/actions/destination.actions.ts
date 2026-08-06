'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/session';
import { DestinationRepository, DestinationRecord, DestinationImageRow } from '@/lib/repositories/destination.repository';

export async function getFeaturedDestinations(): Promise<DestinationRecord[]> {
  const supabase = await createClient();
  const repo = new DestinationRepository(supabase);
  return repo.getFeaturedDestinations(8);
}

// --- ADMIN-06: Destination Management (CRUD) ---
// Mirrors hotel.actions.ts (ADMIN-02). status kept as a validated
// non-empty string (not a hardcoded enum) — same caution as
// package.actions.ts, since destinations.status has no DB-verified
// enum values on record.

const destinationInputSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().min(1, 'Slug is required'),
  state: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  is_featured: z.boolean().optional(),
  status: z.string().min(1, 'Status is required'),
});

export type DestinationInput = z.infer<typeof destinationInputSchema>;

export async function getAllDestinationsAdmin(page: number = 1, limit: number = 20) {
  await requireRole(['admin', 'super_admin']);
  const supabase = await createClient();
  const repo = new DestinationRepository(supabase);
  return repo.getAllDestinations(page, limit);
}

export async function getDestinationByIdAdmin(id: string): Promise<DestinationRecord | null> {
  await requireRole(['admin', 'super_admin']);
  const supabase = await createClient();
  const repo = new DestinationRepository(supabase);
  return repo.getDestinationById(id);
}

export async function createDestinationAdmin(input: DestinationInput) {
  await requireRole(['admin', 'super_admin']);
  const parsed = destinationInputSchema.parse(input);
  const supabase = await createClient();
  const repo = new DestinationRepository(supabase);
  return repo.createDestination(parsed);
}

export async function updateDestinationAdmin(id: string, input: DestinationInput) {
  await requireRole(['admin', 'super_admin']);
  const parsed = destinationInputSchema.parse(input);
  const supabase = await createClient();
  const repo = new DestinationRepository(supabase);
  return repo.updateDestination(id, parsed);
}

export async function deleteDestinationAdmin(id: string): Promise<boolean> {
  await requireRole(['admin', 'super_admin']);
  const supabase = await createClient();
  const repo = new DestinationRepository(supabase);
  return repo.deleteDestination(id);
}

// --- ADMIN-07: Destination Image Upload / Management ---
// All Supabase Storage calls (upload/remove/getPublicUrl) live here.
// DestinationRepository performs destination_images table CRUD only.
// Mirrors package.actions.ts's ADMIN-05 section exactly.

const DESTINATION_ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const DESTINATION_MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export interface DestinationImageWithUrl extends DestinationImageRow {
  publicUrl: string;
}

function normalizeDestinationStoragePath(storagePath: string): string {
  return storagePath.startsWith('destination-images/')
    ? storagePath.slice('destination-images/'.length)
    : storagePath;
}

function destinationExtensionFromMimeType(mimeType: string): string {
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

export async function getDestinationImagesAdmin(destinationId: string): Promise<DestinationImageWithUrl[]> {
  await requireRole(['admin', 'super_admin']);
  const supabase = await createClient();
  const repo = new DestinationRepository(supabase);

  const rows = await repo.listDestinationImages(destinationId);

  return rows.map((row) => {
    const normalizedPath = normalizeDestinationStoragePath(row.storage_path);
    const { data: publicUrlData } = supabase.storage
      .from('destination-images')
      .getPublicUrl(normalizedPath);

    return { ...row, publicUrl: publicUrlData.publicUrl };
  });
}

export async function uploadDestinationImageAdmin(
  destinationId: string,
  file: File,
  isPrimary: boolean
): Promise<DestinationImageWithUrl> {
  await requireRole(['admin', 'super_admin']);

  if (!DESTINATION_ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error('Only jpg, jpeg, png, and webp files are allowed.');
  }
  if (file.size > DESTINATION_MAX_IMAGE_SIZE_BYTES) {
    throw new Error('Image must be 5MB or smaller.');
  }

  const supabase = await createClient();
  const repo = new DestinationRepository(supabase);

  // Stable path: destination-images/{destinationId}/{uuid}.{ext} — never
  // uses destination slug, since slugs can change.
  const ext = destinationExtensionFromMimeType(file.type);
  const objectKey = `${destinationId}/${crypto.randomUUID()}.${ext}`;
  const storedPath = `destination-images/${objectKey}`; // stored in DB, matches existing convention

  const { error: uploadError } = await supabase.storage
    .from('destination-images')
    .upload(objectKey, file, { contentType: file.type, upsert: false });

  if (uploadError) {
    throw new Error(`Failed to upload image: ${uploadError.message}`);
  }

  const existing = await repo.listDestinationImages(destinationId);
  const nextSortOrder = existing.length > 0
    ? Math.max(...existing.map((img) => img.sort_order)) + 1
    : 0;

  const shouldBePrimary = isPrimary || existing.length === 0;

  const row = await repo.insertDestinationImageRow(
    destinationId,
    storedPath,
    shouldBePrimary,
    nextSortOrder
  );

  if (shouldBePrimary && existing.length > 0) {
    await repo.setPrimaryDestinationImage(destinationId, row.id);
  }

  const { data: publicUrlData } = supabase.storage
    .from('destination-images')
    .getPublicUrl(objectKey);

  return { ...row, publicUrl: publicUrlData.publicUrl };
}

export async function setPrimaryDestinationImageAdmin(
  destinationId: string,
  imageId: string
): Promise<void> {
  await requireRole(['admin', 'super_admin']);
  const supabase = await createClient();
  const repo = new DestinationRepository(supabase);
  await repo.setPrimaryDestinationImage(destinationId, imageId);
}

export async function reorderDestinationImageAdmin(
  imageId: string,
  sortOrder: number
): Promise<void> {
  await requireRole(['admin', 'super_admin']);
  const supabase = await createClient();
  const repo = new DestinationRepository(supabase);
  await repo.updateDestinationImageSortOrder(imageId, sortOrder);
}

export async function deleteDestinationImageAdmin(imageId: string): Promise<void> {
  await requireRole(['admin', 'super_admin']);
  const supabase = await createClient();
  const repo = new DestinationRepository(supabase);

  // Delete order: fetch row -> Storage.remove() -> only then delete DB row.
  const row = await repo.getDestinationImageById(imageId);
  if (!row) {
    throw new Error('Image not found.');
  }

  const normalizedPath = normalizeDestinationStoragePath(row.storage_path);

  const { error: removeError } = await supabase.storage
    .from('destination-images')
    .remove([normalizedPath]);

  if (removeError) {
    throw new Error(`Failed to delete image from storage: ${removeError.message}`);
  }

  await repo.deleteDestinationImageRow(imageId);
}
