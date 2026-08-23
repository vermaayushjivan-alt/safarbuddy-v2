'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/session';
import {
  RoomTypeRepository,
  RoomTypeRecord,
  RoomImageRow,
  ROOM_TYPE_STATUS_VALUES,
  ROOM_TYPE_VALUES,
} from '@/lib/repositories/room-type.repository';
import { RoomPriceRepository } from '@/lib/repositories/room-price.repository';
import {
  runAction,
  emptyToNull,
  type ActionResult,
} from '@/lib/actions/action-result';

// --- ROOM-01: Room Type Management (CRUD) ---

const MAX_ROOM_PRICE = 99_999_999.99;

// Field set matches the live public.hotel_rooms columns (confirmed via
// information_schema). room_types never existed in production, so there
// is no `description` or `display_order` column to map here — they have
// been dropped rather than invented. `room_type` and `max_occupancy` are
// real, required (NOT NULL) hotel_rooms columns that the old room_types
// -based schema never modeled, so they've been added.
const roomTypeInputSchema = z.object({
  hotel_id: z.string().uuid('A valid hotel is required'),

  room_name: z.string().min(1, 'Room name is required'),

  room_type: z.enum(ROOM_TYPE_VALUES, {
    message: `Room type must be one of: ${ROOM_TYPE_VALUES.join(', ')}.`,
  }),

  base_price: z
    .number()
    .min(0, 'Base price cannot be negative')
    .max(
      MAX_ROOM_PRICE,
      'The amount is too large. Please enter a smaller value.'
    ),

  capacity_adults: z
    .number()
    .int()
    .min(1, 'At least 1 adult is required'),

  capacity_children: z
    .number()
    .int()
    .min(0, 'Cannot be negative'),

  max_occupancy: z
    .number()
    .int()
    .min(1, 'Max occupancy must be at least 1'),

  bed_type: z.preprocess(
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

// --- ROOM-05 (public read path) ---
//
// Root cause this fixes: the public hotel detail/booking pages had no
// way to read hotel_rooms / room_prices at all — every existing action
// for these tables (above, and all of room-price.actions.ts) is gated
// behind requireRole(['admin','super_admin','hotel_owner']), so an
// anonymous visitor or logged-in customer could never see rooms or
// their rates. This is a new, intentionally unauthenticated read-only
// action (no requireRole — matches getHotelBySlug's public pattern in
// hotel.actions.ts). It does not add, rename, or touch any admin
// action, and it does not modify RoomTypeRepository / RoomPriceRepository.
//
// Price resolution per room, for a given date (defaults to today):
//   1. A room_prices row for that exact room_id + date, if one exists
//      (the same rate an admin sets via RoomPriceManager) — this is
//      what was previously invisible to the public site.
//   2. Otherwise hotel_rooms.base_price, the room's own fallback rate,
//      so a room still shows/bookable even before an admin has set any
//      per-date pricing.
// Both are real, already-confirmed columns (see room-type.repository.ts
// / room-price.repository.ts) — nothing invented here.
export interface BookableRoom {
  id: string;
  room_name: string;
  room_type: RoomTypeRecord['room_type'];
  capacity_adults: number;
  capacity_children: number;
  max_occupancy: number;
  bed_type: string | null;
  room_size_sqft: number | null;
  price: number;
  price_source: 'room_prices' | 'base_price';
  currency_id: string | null;
  // Public gallery for this room — previously unreachable outside admin
  // (see getRoomImagesAdmin above). Empty array if no images uploaded.
  images: { id: string; publicUrl: string; is_primary: boolean }[];
}

// Shared by getBookableRoomsForHotel and getBookableRoomById so the two
// public read paths can never resolve price/images differently from
// each other. Takes the already-fetched RoomTypeRecord plus the same
// supabase client so it doesn't create a second one.
async function resolveBookableRoom(
  supabase: Awaited<ReturnType<typeof createClient>>,
  roomRepo: RoomTypeRepository,
  priceRepo: RoomPriceRepository,
  room: RoomTypeRecord,
  resolvedDate: string
): Promise<BookableRoom> {
  const [priceRow, imageRows] = await Promise.all([
    priceRepo.getPriceForDate(room.id, resolvedDate),
    roomRepo.listRoomImages(room.id),
  ]);

  const images = imageRows
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((img) => {
      const normalizedPath = normalizeRoomStoragePath(img.storage_path);
      const { data: publicUrlData } = supabase.storage
        .from('room-images')
        .getPublicUrl(normalizedPath);

      return {
        id: img.id,
        publicUrl: publicUrlData.publicUrl,
        is_primary: img.is_primary,
      };
    });

  return {
    id: room.id,
    room_name: room.room_name,
    room_type: room.room_type,
    capacity_adults: room.capacity_adults,
    capacity_children: room.capacity_children,
    max_occupancy: room.max_occupancy,
    bed_type: room.bed_type,
    room_size_sqft: room.room_size_sqft,
    price: priceRow ? priceRow.final_price : room.base_price,
    price_source: priceRow ? ('room_prices' as const) : ('base_price' as const),
    currency_id: priceRow?.currency_id ?? null,
    images,
  };
}

export async function getBookableRoomsForHotel(
  hotelId: string,
  priceDate?: string
): Promise<BookableRoom[]> {
  const supabase = await createClient();
  const roomRepo = new RoomTypeRepository(supabase);
  const priceRepo = new RoomPriceRepository(supabase);

  const allRooms = await roomRepo.getRoomTypesByHotel(hotelId);
  const activeRooms = allRooms.filter((room) => room.status === 'active');

  const resolvedDate =
    priceDate ?? new Date().toISOString().slice(0, 10);

  return Promise.all(
    activeRooms.map((room) =>
      resolveBookableRoom(supabase, roomRepo, priceRepo, room, resolvedDate)
    )
  );
}

// ROOM-05 (public read path, single room): backs the room detail page.
// Public/no-auth like getBookableRoomsForHotel above — same reasoning.
// Returns null (not an error) for: room not found, room belongs to a
// different hotel than hotelId, or room.status !== 'active' — all three
// should render the page's not-found state rather than leak an
// inactive/foreign room's details.
export async function getBookableRoomById(
  hotelId: string,
  roomId: string,
  priceDate?: string
): Promise<BookableRoom | null> {
  const supabase = await createClient();
  const roomRepo = new RoomTypeRepository(supabase);
  const priceRepo = new RoomPriceRepository(supabase);

  const room = await roomRepo.getRoomTypeById(roomId);
  if (!room || room.hotel_id !== hotelId || room.status !== 'active') {
    return null;
  }

  const resolvedDate = priceDate ?? new Date().toISOString().slice(0, 10);

  return resolveBookableRoom(supabase, roomRepo, priceRepo, room, resolvedDate);
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

    if (!row || row.room_id !== roomTypeId) {
      throw new Error('Image not found for this room type.');
    }

    const normalizedPath =
      normalizeRoomStoragePath(row.storage_path);

    // DB row is the source of truth for the UI, so it is deleted first
    // (scoped to id AND room_id as a second ownership check). If the
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
