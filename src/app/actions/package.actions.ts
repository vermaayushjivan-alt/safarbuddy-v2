'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/session';
import { PackageRepository, PackageRecord, PackageImageRow } from '@/lib/repositories/package.repository';

export async function getFeaturedPackages(): Promise<PackageRecord[]> {
  const supabase = await createClient();
  const repo = new PackageRepository(supabase);
  return repo.getFeaturedPackages(8);
}

// --- ADMIN-04: Package Management (CRUD) ---
// Only verified fields are validated. `status` is a non-empty string —
// no enum values are assumed, since only 'ACTIVE' is confirmed in
// production usage (see getFeaturedPackages above).

const packageInputSchema = z.object({
  package_name: z.string().min(1, 'Package name is required'),
  slug: z.string().min(1, 'Slug is required'),
  description: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  duration: z.string().nullable().optional(),
  starting_price: z.number().min(0).nullable().optional(),
  is_featured: z.boolean().optional(),
  status: z.string().min(1, 'Status is required'),
});

export type PackageInput = z.infer<typeof packageInputSchema>;

export async function getAllPackagesAdmin(page: number = 1, limit: number = 20) {
  await requireRole(['admin', 'super_admin']);
  const supabase = await createClient();
  const repo = new PackageRepository(supabase);
  return repo.getAllPackages(page, limit);
}

export async function getPackageByIdAdmin(id: string): Promise<PackageRecord | null> {
  await requireRole(['admin', 'super_admin']);
  const supabase = await createClient();
  const repo = new PackageRepository(supabase);
  return repo.getPackageById(id);
}

export async function createPackageAdmin(input: PackageInput) {
  await requireRole(['admin', 'super_admin']);
  const parsed = packageInputSchema.parse(input);
  const supabase = await createClient();
  const repo = new PackageRepository(supabase);
  return repo.createPackage(parsed);
}

export async function updatePackageAdmin(id: string, input: PackageInput) {
  await requireRole(['admin', 'super_admin']);
  const parsed = packageInputSchema.parse(input);
  const supabase = await createClient();
  const repo = new PackageRepository(supabase);
  return repo.updatePackage(id, parsed);
}

export async function deletePackageAdmin(id: string): Promise<boolean> {
  await requireRole(['admin', 'super_admin']);
  const supabase = await createClient();
  const repo = new PackageRepository(supabase);
  return repo.deletePackage(id);
}

// --- ADMIN-05: Package Image Upload / Management ---
// All Supabase Storage calls (upload/remove/getPublicUrl) live here.
// PackageRepository performs package_images table CRUD only.

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export interface PackageImageWithUrl extends PackageImageRow {
  publicUrl: string;
}

/**
 * Strips the redundant bucket-name prefix from a stored path before it is
 * used either as the actual object key for a Storage call, or passed to
 * getPublicUrl(). Mirrors normalizeStoragePath() in hotel.actions.ts so
 * read/write stay symmetric with the existing PackageRepository.resolveImages().
 */
function normalizeStoragePath(storagePath: string): string {
  return storagePath.startsWith('package-images/')
    ? storagePath.slice('package-images/'.length)
    : storagePath;
}

function extensionFromMimeType(mimeType: string): string {
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

export async function getPackageImagesAdmin(packageId: string): Promise<PackageImageWithUrl[]> {
  await requireRole(['admin', 'super_admin']);
  const supabase = await createClient();
  const repo = new PackageRepository(supabase);

  const rows = await repo.listPackageImages(packageId);

  return rows.map((row) => {
    const normalizedPath = normalizeStoragePath(row.storage_path);
    const { data: publicUrlData } = supabase.storage
      .from('package-images')
      .getPublicUrl(normalizedPath);

    return { ...row, publicUrl: publicUrlData.publicUrl };
  });
}

export async function uploadPackageImageAdmin(
  packageId: string,
  file: File,
  isPrimary: boolean
): Promise<PackageImageWithUrl> {
  await requireRole(['admin', 'super_admin']);

  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error('Only jpg, jpeg, png, and webp files are allowed.');
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error('Image must be 5MB or smaller.');
  }

  const supabase = await createClient();
  const repo = new PackageRepository(supabase);

  // Stable path: package-images/{packageId}/{uuid}.{ext} — never uses
  // package slug, since slugs can change.
  const ext = extensionFromMimeType(file.type);
  const objectKey = `${packageId}/${crypto.randomUUID()}.${ext}`;
  const storedPath = `package-images/${objectKey}`; // stored in DB, matches existing convention

  const { error: uploadError } = await supabase.storage
    .from('package-images')
    .upload(objectKey, file, { contentType: file.type, upsert: false });

  if (uploadError) {
    throw new Error(`Failed to upload image: ${uploadError.message}`);
  }

  const existing = await repo.listPackageImages(packageId);
  const nextSortOrder = existing.length > 0
    ? Math.max(...existing.map((img) => img.sort_order)) + 1
    : 0;

  const shouldBePrimary = isPrimary || existing.length === 0;

  const row = await repo.insertPackageImageRow(
    packageId,
    storedPath,
    shouldBePrimary,
    nextSortOrder
  );

  if (shouldBePrimary && existing.length > 0) {
    await repo.setPrimaryPackageImage(packageId, row.id);
  }

  const { data: publicUrlData } = supabase.storage
    .from('package-images')
    .getPublicUrl(objectKey);

  return { ...row, publicUrl: publicUrlData.publicUrl };
}

export async function setPrimaryPackageImageAdmin(
  packageId: string,
  imageId: string
): Promise<void> {
  await requireRole(['admin', 'super_admin']);
  const supabase = await createClient();
  const repo = new PackageRepository(supabase);
  await repo.setPrimaryPackageImage(packageId, imageId);
}

export async function reorderPackageImageAdmin(
  imageId: string,
  sortOrder: number
): Promise<void> {
  await requireRole(['admin', 'super_admin']);
  const supabase = await createClient();
  const repo = new PackageRepository(supabase);
  await repo.updatePackageImageSortOrder(imageId, sortOrder);
}

export async function deletePackageImageAdmin(imageId: string): Promise<void> {
  await requireRole(['admin', 'super_admin']);
  const supabase = await createClient();
  const repo = new PackageRepository(supabase);

  // Delete order: fetch row -> Storage.remove() -> only then delete DB row.
  const row = await repo.getPackageImageById(imageId);
  if (!row) {
    throw new Error('Image not found.');
  }

  const normalizedPath = normalizeStoragePath(row.storage_path);

  const { error: removeError } = await supabase.storage
    .from('package-images')
    .remove([normalizedPath]);

  if (removeError) {
    throw new Error(`Failed to delete image from storage: ${removeError.message}`);
  }

  await repo.deletePackageImageRow(imageId);
}
