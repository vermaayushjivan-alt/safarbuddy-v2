'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/session';
import {
  RoomTypeRepository,
  RoomTypeRecord,
  RoomImageRow,
  ROOM_TYPE_STATUS_VALUES,
} from '@/lib/repositories/room-type.repository';
import {
  runAction,
  emptyToNull,
  type ActionResult,
} from '@/lib/actions/action-result';

// --- ROOM-01: Room Type Management (CRUD) ---

const MAX_ROOM_PRICE = 99_999_999.99;

const roomTypeInputSchema = z.object({
  hotel_id: z.string().uuid('A valid hotel is required'),

  name: z.string().min(1, 'Room type name is required'),

  description: z.preprocess(
    emptyToNull,
    z.string().nullable().optional()
  ),

  base_price: z
    .number()
    .min(0, 'Base price cannot be negative')
    .max(
      MAX_ROOM_PRICE,
      'The amount is too large. Please enter a smaller value.'
    ),

  max_adults: z
    .number()
    .int()
    .min(1, 'At least 1 adult is required'),

  max_children: z
    .number()
    .int()
    .min(0, 'Cannot be negative'),

  bed_config: z.preprocess(
    emptyToNull,
    z.string().nullable().optional()
  ),

  room_size_sqft: z.preprocess(
    emptyToNull,
    z.number().int().positive().nullable().optional()
  ),

  status: z.enum(ROOM_TYPE_STATUS_VALUES, {
    message: `Status must be one of: ${ROOM_TYPE_STATUS_VALUES.join(', ')}.`,
  }),

  display_order: z.preprocess(
    emptyToNull,
    z.number().int().min(0).nullable().optional()
  ),
});

export type RoomTypeInput = z.infer<typeof roomTypeInputSchema>;

export async function getRoomTypesByHotelAdmin(
  hotelId: string
): Promise<RoomTypeRecord[]> {
  await requireRole(['admin', 'super_admin']);

  const supabase = await createClient();
  const repo = new RoomTypeRepository(supabase);

  return repo.getRoomTypesByHotel(hotelId);
}

export async function getRoomTypeByIdAdmin(
  id: string
): Promise<RoomTypeRecord | null> {
  await requireRole(['admin', 'super_admin']);

  const supabase = await createClient();
  const repo = new RoomTypeRepository(supabase);

  return repo.getRoomTypeById(id);
}

export async function createRoomTypeAdmin(
  input: RoomTypeInput
): Promise<ActionResult<RoomTypeRecord>> {
  return runAction(async () => {
    await requireRole(['admin', 'super_admin']);

    const parsed = roomTypeInputSchema.parse(input);
    const supabase = await createClient();
    const repo = new RoomTypeRepository(supabase);

    return repo.createRoomType(parsed);
  });
}

export async function updateRoomTypeAdmin(
  id: string,
  input: RoomTypeInput
): Promise<ActionResult<RoomTypeRecord>> {
  return runAction(async () => {
    await requireRole(['admin', 'super_admin']);

    const parsed = roomTypeInputSchema.parse(input);
    const supabase = await createClient();
    const repo = new RoomTypeRepository(supabase);

    return repo.updateRoomType(id, parsed);
  });
}

export async function deleteRoomTypeAdmin(
  id: string
): Promise<ActionResult<boolean>> {
  return runAction(async () => {
    await requireRole(['admin', 'super_admin']);

    const supabase = await createClient();
    const repo = new RoomTypeRepository(supabase);

    return repo.deleteRoomType(id);
  });
}

// --- ROOM-02: Room Image Upload / Management ---

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

export async function getRoomImagesAdmin(
  roomTypeId: string
): Promise<ActionResult<RoomImageWithUrl[]>> {
  return runAction(async () => {
    await requireRole(['admin', 'super_admin']);

    const supabase = await createClient();
    const repo = new RoomTypeRepository(supabase);

    const rows = await repo.listRoomImages(roomTypeId);

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

export async function uploadRoomImageAdmin(
  roomTypeId: string,
  file: File,
  isPrimary: boolean
): Promise<ActionResult<RoomImageWithUrl>> {
  return runAction(async () => {
    await requireRole(['admin', 'super_admin']);

    if (!ROOM_ALLOWED_IMAGE_TYPES.includes(file.type)) {
      throw new Error(
        'Only jpg, jpeg, png, and webp files are allowed.'
      );
    }

    if (file.size > ROOM_MAX_IMAGE_SIZE_BYTES) {
      throw new Error('Image must be 5MB or smaller.');
    }

    const supabase = await createClient();
    const repo = new RoomTypeRepository(supabase);

    const ext = roomExtensionFromMimeType(file.type);

    const objectKey =
      `${roomTypeId}/${crypto.randomUUID()}.${ext}`;

    const storedPath = `room-images/${objectKey}`;

    const { error: uploadError } = await supabase.storage
      .from('room-images')
      .upload(objectKey, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      throw new Error(
        `Failed to upload image: ${uploadError.message}`
      );
    }

    // From here on, storage upload has already succeeded. If any step
    // below throws, the uploaded object would otherwise be orphaned in
    // Storage with no DB row pointing to it — so any failure past this
    // point cleans up the uploaded object before rethrowing.
    try {
      const existing = await repo.listRoomImages(roomTypeId);

      const nextSortOrder =
        existing.length > 0
          ? Math.max(...existing.map((img) => img.sort_order)) + 1
          : 0;

      const shouldBePrimary =
        isPrimary || existing.length === 0;

      const row = await repo.insertRoomImageRow(
        roomTypeId,
        storedPath,
        shouldBePrimary,
        nextSortOrder
      );

      if (shouldBePrimary && existing.length > 0) {
        await repo.setPrimaryRoomImage(roomTypeId, row.id);
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
          '[uploadRoomImageAdmin] Failed to clean up orphaned storage object after DB failure:',
          objectKey,
          cleanupError.message
        );
      }

      throw err;
    }
  });
}

export async function setPrimaryRoomImageAdmin(
  roomTypeId: string,
  imageId: string
): Promise<ActionResult<true>> {
  return runAction(async () => {
    await requireRole(['admin', 'super_admin']);

    const supabase = await createClient();
    const repo = new RoomTypeRepository(supabase);

    await repo.setPrimaryRoomImage(roomTypeId, imageId);

    return true as const;
  });
}

export async function reorderRoomImageAdmin(
  roomTypeId: string,
  imageId: string,
  sortOrder: number
): Promise<ActionResult<true>> {
  return runAction(async () => {
    await requireRole(['admin', 'super_admin']);

    const supabase = await createClient();
    const repo = new RoomTypeRepository(supabase);

    await repo.updateRoomImageSortOrder(roomTypeId, imageId, sortOrder);

    return true as const;
  });
}

export async function deleteRoomImageAdmin(
  roomTypeId: string,
  imageId: string
): Promise<ActionResult<true>> {
  return runAction(async () => {
    await requireRole(['admin', 'super_admin']);

    const supabase = await createClient();
    const repo = new RoomTypeRepository(supabase);

    const row = await repo.getRoomImageById(imageId);

    if (!row || row.room_type_id !== roomTypeId) {
      throw new Error('Image not found for this room type.');
    }

    const normalizedPath =
      normalizeRoomStoragePath(row.storage_path);

    // DB row is the source of truth for the UI, so it is deleted first
    // (scoped to id AND room_type_id as a second ownership check). If the
    // subsequent Storage removal fails, the DB is already consistent and
    // the leftover Storage object is a harmless, non-user-visible orphan
    // that can be cleaned up separately — the reverse order would risk a
    // DB row left pointing at an already-deleted file.
    await repo.deleteRoomImageRow(roomTypeId, imageId);

    const { error: removeError } = await supabase.storage
      .from('room-images')
      .remove([normalizedPath]);

    if (removeError) {
      console.error(
        '[deleteRoomImageAdmin] DB row deleted but Storage removal failed — orphaned object:',
        normalizedPath,
        removeError.message
      );
    }

    return true as const;
  });
}
