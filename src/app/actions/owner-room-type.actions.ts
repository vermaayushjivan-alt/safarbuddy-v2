'use server';

// P0.3 (2026-08-28 session, see ULTRA_PRO_AUDIT.md Section 3 /
// SESSION_HANDOFF_2026-08-28_P0_FIXES.md).
//
// Owner-scoped counterpart to room-type.actions.ts's *Admin actions.
// Every action here re-verifies hotel ownership via
// assertHotelOwnedByVendor() BEFORE touching a room row — this matters
// even for update/delete-by-room-id, because a room id alone doesn't
// prove which hotel it belongs to. A malicious hotel_owner could try
// passing another owner's roomId directly; getRoomTypeByIdOwned() below
// closes that gap by checking the fetched room's hotel_id against the
// caller's own (already-ownership-verified) hotel, not just trusting the
// id.
//
// Reuses RoomTypeRepository directly — same repository the admin actions
// use — so there is exactly one place that knows how to read/write
// hotel_rooms; only the authorization layer differs.

import { z } from 'zod';
import {
  requireOwnerVendor,
  assertHotelOwnedByVendor,
} from '@/lib/auth/owner-context';
import { HotelRepository } from '@/lib/repositories/hotel.repository';
import {
  RoomTypeRepository,
  type RoomTypeRecord,
  ROOM_TYPE_STATUS_VALUES,
  ROOM_TYPE_VALUES,
} from '@/lib/repositories/room-type.repository';
import {
  runAction,
  emptyToNull,
  type ActionResult,
} from '@/lib/actions/action-result';

const MAX_ROOM_PRICE = 99_999_999.99;

// Mirrors room-type.actions.ts's roomTypeInputSchema exactly (that
// schema isn't exported, so it's redeclared here rather than importing
// a private symbol — same field set, same live hotel_rooms constraints).
// hotel_id is NOT accepted from the caller here: it is always the
// already-ownership-verified hotelId argument, never a value the
// hotel_owner could override to attach a room to a different hotel.
const ownerRoomTypeInputSchema = z.object({
  room_name: z.string().min(1, 'Room name is required'),

  room_type: z.enum(ROOM_TYPE_VALUES, {
    message: `Room type must be one of: ${ROOM_TYPE_VALUES.join(', ')}.`,
  }),

  base_price: z
    .number()
    .min(0, 'Base price cannot be negative')
    .max(MAX_ROOM_PRICE, 'The amount is too large. Please enter a smaller value.'),

  capacity_adults: z.number().int().min(1, 'At least 1 adult is required'),

  capacity_children: z.number().int().min(0, 'Cannot be negative'),

  max_occupancy: z.number().int().min(1, 'Max occupancy must be at least 1'),

  bed_type: z.preprocess(emptyToNull, z.string().nullable().optional()),

  room_size_sqft: z.preprocess(
    emptyToNull,
    z.number().int().positive().nullable().optional()
  ),

  status: z.enum(ROOM_TYPE_STATUS_VALUES, {
    message: `Status must be one of: ${ROOM_TYPE_STATUS_VALUES.join(', ')}.`,
  }),
});

export type OwnerRoomTypeInput = z.infer<typeof ownerRoomTypeInputSchema>;

/**
 * Shared by every action below: verifies the caller owns hotelId, then
 * returns a ready-to-use RoomTypeRepository bound to the same supabase
 * client as the ownership check (avoids a second client / second
 * round-trip auth check per action).
 */
async function requireOwnedHotelRoomRepo(hotelId: string) {
  const { vendor, supabase } = await requireOwnerVendor();
  const hotelRepo = new HotelRepository(supabase);

  await assertHotelOwnedByVendor(hotelRepo, hotelId, vendor.id);

  return new RoomTypeRepository(supabase);
}

export async function getMyRoomTypes(hotelId: string): Promise<RoomTypeRecord[]> {
  const roomRepo = await requireOwnedHotelRoomRepo(hotelId);
  return roomRepo.getRoomTypesByHotel(hotelId);
}

/**
 * Fetches a single room, but only returns it if it actually belongs to
 * hotelId — closes the "valid room id, wrong hotel" gap described in the
 * file header. Returns null (not an error) for both "not found" and
 * "belongs to a different hotel", same reasoning as
 * assertHotelOwnedByVendor()'s FORBIDDEN-for-both choice.
 */
async function getRoomTypeByIdOwned(
  roomRepo: RoomTypeRepository,
  roomId: string,
  hotelId: string
): Promise<RoomTypeRecord | null> {
  const room = await roomRepo.getRoomTypeById(roomId);
  if (!room || room.hotel_id !== hotelId) {
    return null;
  }
  return room;
}

export async function createMyRoomType(
  hotelId: string,
  input: OwnerRoomTypeInput
): Promise<ActionResult<RoomTypeRecord>> {
  return runAction(async () => {
    const roomRepo = await requireOwnedHotelRoomRepo(hotelId);
    const parsed = ownerRoomTypeInputSchema.parse(input);

    return roomRepo.createRoomType({ ...parsed, hotel_id: hotelId });
  });
}

export async function updateMyRoomType(
  hotelId: string,
  roomId: string,
  input: OwnerRoomTypeInput
): Promise<ActionResult<RoomTypeRecord>> {
  return runAction(async () => {
    const roomRepo = await requireOwnedHotelRoomRepo(hotelId);

    const existing = await getRoomTypeByIdOwned(roomRepo, roomId, hotelId);
    if (!existing) {
      throw new Error('FORBIDDEN');
    }

    const parsed = ownerRoomTypeInputSchema.parse(input);

    return roomRepo.updateRoomType(roomId, parsed);
  });
}

export async function deleteMyRoomType(
  hotelId: string,
  roomId: string
): Promise<ActionResult<boolean>> {
  return runAction(async () => {
    const roomRepo = await requireOwnedHotelRoomRepo(hotelId);

    const existing = await getRoomTypeByIdOwned(roomRepo, roomId, hotelId);
    if (!existing) {
      throw new Error('FORBIDDEN');
    }

    return roomRepo.deleteRoomType(roomId);
  });
}
