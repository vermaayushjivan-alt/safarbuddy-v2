'use server';

// P0.3 follow-up (see DOC_DEBT.md item 8) — owner-scoped counterpart to
// room-type.actions.ts's *Admin image actions. Step 1 (owner-context.ts,
// owner-hotel.actions.ts, owner-room-type.actions.ts) covered hotel and
// room-type CRUD but not images, leaving the onboarding wizard unable to
// let an owner upload room photos. This file closes that gap using the
// exact same ownership pattern: every action re-verifies hotelId belongs
// to the caller's vendor, then re-verifies roomTypeId belongs to that
// hotelId, before touching Storage or the room_images table. Reuses
// RoomTypeRepository directly — same repository the admin actions use.

import {
  requireOwnerVendor,
  assertHotelOwnedByVendor,
} from '@/lib/auth/owner-context';
import { HotelRepository } from '@/lib/repositories/hotel.repository';
import {
  RoomTypeRepository,
  type RoomImageRow,
} from '@/lib/repositories/room-type.repository';
import {
  runAction,
  type ActionResult,
} from '@/lib/actions/action-result';

const ROOM_ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

const ROOM_MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

export interface RoomImageWithUrl extends RoomImageRow {
  publicUrl: string;
}

function normalizeRoomStoragePath(storagePath: string): string {
  return storagePath.startsWith('room-images/')
    ? storagePath.slice('room-images/'.length)
    : storagePath;
}

function roomExtensionFromMimeType(mimeType: string): string {
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
 * Verifies hotelId belongs to the signed-in owner's vendor, then verifies
 * roomTypeId belongs to that hotel. Throws FORBIDDEN for both "room does
 * not exist" and "room belongs to a different hotel" — same reasoning
 * as owner-room-type.actions.ts's getRoomTypeByIdOwned.
 */
async function requireOwnedHotelRoomImageRepo(hotelId: string, roomTypeId: string) {
  const { vendor, supabase } = await requireOwnerVendor();
  const hotelRepo = new HotelRepository(supabase);

  await assertHotelOwnedByVendor(hotelRepo, hotelId, vendor.id);

  const roomRepo = new RoomTypeRepository(supabase);
  const room = await roomRepo.getRoomTypeById(roomTypeId);

  if (!room || room.hotel_id !== hotelId) {
    throw new Error('FORBIDDEN');
  }

  return { supabase, roomRepo };
}

export async function getMyRoomImages(
  hotelId: string,
  roomTypeId: string
): Promise<ActionResult<RoomImageWithUrl[]>> {
  return runAction(async () => {
    const { supabase, roomRepo } = await requireOwnedHotelRoomImageRepo(
      hotelId,
      roomTypeId
    );

    const rows = await roomRepo.listRoomImages(roomTypeId);

    return rows.map((row) => {
      const normalizedPath = normalizeRoomStoragePath(row.storage_path);

      const { data: publicUrlData } = supabase.storage
        .from('room-images')
        .getPublicUrl(normalizedPath);

      return {
        ...row,
        publicUrl: publicUrlData.publicUrl,
      };
    });
  });
}

export async function uploadMyRoomImage(
  hotelId: string,
  roomTypeId: string,
  file: File,
  isPrimary: boolean
): Promise<ActionResult<RoomImageWithUrl>> {
  return runAction(async () => {
    if (!ROOM_ALLOWED_IMAGE_TYPES.includes(file.type)) {
      throw new Error('Only jpg, jpeg, png, and webp files are allowed.');
    }

    if (file.size > ROOM_MAX_IMAGE_SIZE_BYTES) {
      throw new Error('Image must be 5MB or smaller.');
    }

    const { supabase, roomRepo } = await requireOwnedHotelRoomImageRepo(
      hotelId,
      roomTypeId
    );

    const ext = roomExtensionFromMimeType(file.type);
    const objectKey = `${roomTypeId}/${crypto.randomUUID()}.${ext}`;
    const storedPath = `room-images/${objectKey}`;

    const { error: uploadError } = await supabase.storage
      .from('room-images')
      .upload(objectKey, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Failed to upload image: ${uploadError.message}`);
    }

    // Same orphan-cleanup guarantee as uploadRoomImageAdmin: if any step
    // below throws, remove the just-uploaded Storage object rather than
    // leaving it dangling with no DB row.
    try {
      const existing = await roomRepo.listRoomImages(roomTypeId);

      const nextSortOrder =
        existing.length > 0
          ? Math.max(...existing.map((img) => img.sort_order)) + 1
          : 0;

      const shouldBePrimary = isPrimary || existing.length === 0;

      const row = await roomRepo.insertRoomImageRow(
        roomTypeId,
        storedPath,
        shouldBePrimary,
        nextSortOrder
      );

      if (shouldBePrimary && existing.length > 0) {
        await roomRepo.setPrimaryRoomImage(roomTypeId, row.id);
      }

      const { data: publicUrlData } = supabase.storage
        .from('room-images')
        .getPublicUrl(objectKey);

      return {
        ...row,
        publicUrl: publicUrlData.publicUrl,
      };
    } catch (err) {
      const { error: cleanupError } = await supabase.storage
        .from('room-images')
        .remove([objectKey]);

      if (cleanupError) {
        console.error(
          '[uploadMyRoomImage] Failed to clean up orphaned storage object after DB failure:',
          objectKey,
          cleanupError.message
        );
      }

      throw err;
    }
  });
}

export async function setMyPrimaryRoomImage(
  hotelId: string,
  roomTypeId: string,
  imageId: string
): Promise<ActionResult<true>> {
  return runAction(async () => {
    const { roomRepo } = await requireOwnedHotelRoomImageRepo(hotelId, roomTypeId);

    await roomRepo.setPrimaryRoomImage(roomTypeId, imageId);

    return true as const;
  });
}

export async function reorderMyRoomImage(
  hotelId: string,
  roomTypeId: string,
  imageId: string,
  sortOrder: number
): Promise<ActionResult<true>> {
  return runAction(async () => {
    const { roomRepo } = await requireOwnedHotelRoomImageRepo(hotelId, roomTypeId);

    await roomRepo.updateRoomImageSortOrder(roomTypeId, imageId, sortOrder);

    return true as const;
  });
}

export async function deleteMyRoomImage(
  hotelId: string,
  roomTypeId: string,
  imageId: string
): Promise<ActionResult<true>> {
  return runAction(async () => {
    const { supabase, roomRepo } = await requireOwnedHotelRoomImageRepo(
      hotelId,
      roomTypeId
    );

    const image = await roomRepo.getRoomImageById(imageId);
    if (!image || image.room_id !== roomTypeId) {
      throw new Error('FORBIDDEN');
    }

    // Same DB-row-delete-first-then-Storage ordering as deleteRoomImageAdmin
    // (ROOM-02 hardening): a Storage failure after a successful DB delete
    // can't leave a DB row pointing at a deleted file.
    await roomRepo.deleteRoomImageRow(roomTypeId, imageId);

    const normalizedPath = normalizeRoomStoragePath(image.storage_path);
    const { error: removeError } = await supabase.storage
      .from('room-images')
      .remove([normalizedPath]);

    if (removeError) {
      console.error(
        '[deleteMyRoomImage] Non-fatal: DB row deleted but Storage removal failed (orphaned object):',
        normalizedPath,
        removeError.message
      );
    }

    return true as const;
  });
}
