'use server';

// Photo gallery audit fix (2026-09-19) — owner-scoped counterpart to
// hotel.actions.ts's ADMIN-03 image actions. Until now only an admin
// could add/reorder/delete a property's gallery photos
// (getHotelImagesAdmin/uploadHotelImageAdmin/etc. all gate on
// requireRole(['admin','super_admin'])) — a hotel_owner had no way to
// manage their own exterior/lobby/pool photos at all, even though the
// public detail page has shown a full gallery since PUBLIC-02. This
// closes that gap using the exact same ownership pattern as
// owner-room-image.actions.ts: every action re-verifies hotelId belongs
// to the caller's vendor (via assertHotelOwnedByVendor) before touching
// Storage or the hotel_images table. Reuses HotelRepository directly —
// same repository the admin actions use (Bible Rule 9), same
// 'hotel-images' Storage bucket, same table — only the authorization
// layer differs.
//
// Scope note: this is property-level images only (exterior/lobby/pool —
// what getHotelGalleryImages renders on the public page). Room-level
// photos are a separate, already-tracked gap (owner-room-image.actions.ts
// exists but has no page yet — see hotel-owner/page.tsx's comment) and
// are intentionally not touched here.

import {
  requireOwnerVendor,
  assertHotelOwnedByVendor,
} from '@/lib/auth/owner-context';
import {
  HotelRepository,
  type HotelImageRow,
} from '@/lib/repositories/hotel.repository';
import {
  runAction,
  type ActionResult,
} from '@/lib/actions/action-result';

const HOTEL_ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

const HOTEL_MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

export interface OwnerHotelImageWithUrl extends HotelImageRow {
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

/**
 * Verifies hotelId belongs to the signed-in owner's vendor before any
 * Storage or hotel_images access. Throws FORBIDDEN (via
 * assertHotelOwnedByVendor) for both "hotel does not exist" and "hotel
 * belongs to a different vendor" — same reasoning as
 * owner-room-image.actions.ts's requireOwnedHotelRoomImageRepo.
 */
async function requireOwnedHotelImageRepo(hotelId: string) {
  const { vendor, supabase } = await requireOwnerVendor();
  const repo = new HotelRepository(supabase);

  await assertHotelOwnedByVendor(repo, hotelId, vendor.id);

  return { supabase, repo };
}

export async function getMyHotelImages(
  hotelId: string
): Promise<ActionResult<OwnerHotelImageWithUrl[]>> {
  return runAction(async () => {
    const { supabase, repo } = await requireOwnedHotelImageRepo(hotelId);

    const rows = await repo.listHotelImages(hotelId);

    return rows.map((row) => {
      const normalizedPath = normalizeHotelStoragePath(row.storage_path);

      const { data: publicUrlData } = supabase.storage
        .from('hotel-images')
        .getPublicUrl(normalizedPath);

      return {
        ...row,
        publicUrl: publicUrlData.publicUrl,
      };
    });
  });
}

export async function uploadMyHotelImage(
  hotelId: string,
  file: File,
  isPrimary: boolean
): Promise<ActionResult<OwnerHotelImageWithUrl>> {
  return runAction(async () => {
    if (!HOTEL_ALLOWED_IMAGE_TYPES.includes(file.type)) {
      throw new Error('Only jpg, jpeg, png, and webp files are allowed.');
    }

    if (file.size > HOTEL_MAX_IMAGE_SIZE_BYTES) {
      throw new Error('Image must be 5MB or smaller.');
    }

    const { supabase, repo } = await requireOwnedHotelImageRepo(hotelId);

    const ext = hotelExtensionFromMimeType(file.type);
    const objectKey = `${hotelId}/${crypto.randomUUID()}.${ext}`;
    const storedPath = `hotel-images/${objectKey}`;

    const { error: uploadError } = await supabase.storage
      .from('hotel-images')
      .upload(objectKey, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Failed to upload image: ${uploadError.message}`);
    }

    // Same orphan-cleanup guarantee as uploadMyRoomImage: if any step
    // below throws, remove the just-uploaded Storage object rather than
    // leaving it dangling with no DB row.
    try {
      const existing = await repo.listHotelImages(hotelId);

      const nextSortOrder =
        existing.length > 0
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

      return {
        ...row,
        publicUrl: publicUrlData.publicUrl,
      };
    } catch (err) {
      const { error: cleanupError } = await supabase.storage
        .from('hotel-images')
        .remove([objectKey]);

      if (cleanupError) {
        console.error(
          '[uploadMyHotelImage] Failed to clean up orphaned storage object after DB failure:',
          objectKey,
          cleanupError.message
        );
      }

      throw err;
    }
  });
}

export async function setMyPrimaryHotelImage(
  hotelId: string,
  imageId: string
): Promise<ActionResult<true>> {
  return runAction(async () => {
    const { repo } = await requireOwnedHotelImageRepo(hotelId);

    await repo.setPrimaryHotelImage(hotelId, imageId);

    return true as const;
  });
}

export async function reorderMyHotelImage(
  hotelId: string,
  imageId: string,
  sortOrder: number
): Promise<ActionResult<true>> {
  return runAction(async () => {
    const { repo } = await requireOwnedHotelImageRepo(hotelId);

    await repo.updateHotelImageSortOrder(imageId, sortOrder);

    return true as const;
  });
}

export async function deleteMyHotelImage(
  hotelId: string,
  imageId: string
): Promise<ActionResult<true>> {
  return runAction(async () => {
    const { supabase, repo } = await requireOwnedHotelImageRepo(hotelId);

    const image = await repo.getHotelImageById(imageId);
    if (!image || image.hotel_id !== hotelId) {
      throw new Error('FORBIDDEN');
    }

    // Same DB-row-delete-first-then-Storage ordering as deleteMyRoomImage
    // (ROOM-02 hardening): a Storage failure after a successful DB delete
    // can't leave a DB row pointing at a deleted file. Note this is the
    // opposite order from the older deleteHotelImageAdmin (storage-first) —
    // intentionally following the newer, hardened pattern here rather than
    // duplicating the older one's ordering.
    await repo.deleteHotelImageRow(imageId);

    const normalizedPath = normalizeHotelStoragePath(image.storage_path);
    const { error: removeError } = await supabase.storage
      .from('hotel-images')
      .remove([normalizedPath]);

    if (removeError) {
      console.error(
        '[deleteMyHotelImage] Non-fatal: DB row deleted but Storage removal failed (orphaned object):',
        normalizedPath,
        removeError.message
      );
    }

    return true as const;
  });
}
