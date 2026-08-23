'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { runAction, type ActionResult } from '@/lib/actions/action-result';
import { requireRole } from '@/lib/auth/session';
import {
  RoomInventoryRepository,
  type RoomInventoryRow,
} from '@/lib/repositories/room-inventory.repository';

const uuidSchema = z.string().uuid('Invalid UUID format');
const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');

const setInventorySchema = z.object({
  hotelId: uuidSchema,
  roomId: uuidSchema,
  inventoryDate: dateSchema,
  totalRooms: z
    .number()
    .int('Total rooms must be a whole number')
    .min(0, 'Total rooms cannot be negative'),
  blockedRooms: z
    .number()
    .int('Blocked rooms must be a whole number')
    .min(0, 'Blocked rooms cannot be negative')
    .default(0),
});

// Applies the same total/blocked room counts across every date in
// [startDate, endDate] (inclusive). Existing rows for a date in the
// range are updated in place; missing dates get a new row. This never
// touches room_prices or booking data — it only ever writes
// room_inventory, same scope boundary as setInventoryForDate.
const bulkSetInventorySchema = z
  .object({
    hotelId: uuidSchema,
    roomId: uuidSchema,
    startDate: dateSchema,
    endDate: dateSchema,
    totalRooms: z
      .number()
      .int('Total rooms must be a whole number')
      .min(0, 'Total rooms cannot be negative'),
    blockedRooms: z
      .number()
      .int('Blocked rooms must be a whole number')
      .min(0, 'Blocked rooms cannot be negative')
      .default(0),
  })
  .refine((data) => new Date(data.endDate) >= new Date(data.startDate), {
    message: 'End date must be on or after start date',
    path: ['endDate'],
  });

const getInventoryForRangeSchema = z.object({
  hotelId: uuidSchema,
  roomId: uuidSchema,
  startDate: dateSchema,
  endDate: dateSchema,
});

const deleteInventorySchema = z.object({
  hotelId: uuidSchema,
  roomId: uuidSchema,
  inventoryDate: dateSchema,
});

async function assertOwnership(
  repo: RoomInventoryRepository,
  roomId: string,
  hotelId: string
) {
  const user = await requireRole(['admin', 'super_admin', 'hotel_owner']);

  const isAuthorized = await repo.verifyRoomOwnership(
    roomId,
    hotelId,
    user.id,
    user.roles
  );

  if (!isAuthorized) {
    throw new Error('Unauthorized access to hotel room availability');
  }

  return user;
}

export async function setInventoryForDateAction(
  input: unknown
): Promise<ActionResult<RoomInventoryRow>> {
  return runAction(async () => {
    const validated = setInventorySchema.parse(input);
    const supabase = await createClient();
    const repo = new RoomInventoryRepository(supabase);
    const user = await assertOwnership(repo, validated.roomId, validated.hotelId);

    return repo.setInventoryForDate({
      roomId: validated.roomId,
      inventoryDate: validated.inventoryDate,
      totalRooms: validated.totalRooms,
      blockedRooms: validated.blockedRooms,
      actorId: user.id,
    });
  });
}

export async function deleteInventoryForDateAction(
  input: unknown
): Promise<ActionResult<{ success: boolean }>> {
  return runAction(async () => {
    const validated = deleteInventorySchema.parse(input);
    const supabase = await createClient();
    const repo = new RoomInventoryRepository(supabase);
    await assertOwnership(repo, validated.roomId, validated.hotelId);

    await repo.deleteInventoryForDate(validated.roomId, validated.inventoryDate);

    return { success: true };
  });
}

export async function getInventoryForRangeAction(
  input: unknown
): Promise<ActionResult<RoomInventoryRow[]>> {
  return runAction(async () => {
    const validated = getInventoryForRangeSchema.parse(input);
    const supabase = await createClient();
    const repo = new RoomInventoryRepository(supabase);
    await assertOwnership(repo, validated.roomId, validated.hotelId);

    return repo.getInventoryForRange(
      validated.roomId,
      validated.startDate,
      validated.endDate
    );
  });
}

// Bulk date-range availability. Confirmation is enforced by the calling
// UI (RoomInventoryManager shows a confirm dialog before invoking this)
// — the action itself just performs the writes once called.
export async function bulkSetInventoryAction(
  input: unknown
): Promise<ActionResult<{ updated: number; created: number }>> {
  return runAction(async () => {
    const validated = bulkSetInventorySchema.parse(input);
    const supabase = await createClient();
    const repo = new RoomInventoryRepository(supabase);
    const user = await assertOwnership(repo, validated.roomId, validated.hotelId);

    const dates: string[] = [];
    const cursor = new Date(`${validated.startDate}T00:00:00Z`);
    const end = new Date(`${validated.endDate}T00:00:00Z`);

    // Hard cap to keep a single bulk action bounded and predictable.
    const MAX_DAYS = 366;
    while (cursor <= end) {
      dates.push(cursor.toISOString().slice(0, 10));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
      if (dates.length > MAX_DAYS) {
        throw new Error(`Date range is too large. Please select ${MAX_DAYS} days or fewer.`);
      }
    }

    let updated = 0;
    let created = 0;

    for (const date of dates) {
      const existing = await repo.getInventoryForDate(validated.roomId, date);

      await repo.setInventoryForDate({
        roomId: validated.roomId,
        inventoryDate: date,
        totalRooms: validated.totalRooms,
        blockedRooms: validated.blockedRooms,
        actorId: user.id,
      });

      if (existing) {
        updated += 1;
      } else {
        created += 1;
      }
    }

    return { updated, created };
  });
}

// Dashboard summary for /admin/hotels/[id]/rooms: one inventory row per
// room (for the given date) across every room the caller passes in.
// Rooms with no inventory row for that date are simply omitted from the
// result — the page treats a missing entry as "availability not set
// yet" rather than zero (see roomsWithInventoryToday in page.tsx).
//
// This is called directly from a Server Component, not invoked as a
// client-side form action, so — unlike the mutation actions in this
// project — it returns the raw RoomInventoryRow[] instead of an
// ActionResult. The admin layout (src/app/admin/layout.tsx) already
// gates the whole /admin subtree on requireRole(["admin","super_admin"]);
// the check here is a defense-in-depth guard consistent with the other
// read actions in this project (e.g. getRoomPricesAction), not a
// replacement for it.
export async function getRoomInventorySummaryForHotelAdmin(
  roomIds: string[],
  date: string
): Promise<RoomInventoryRow[]> {
  await requireRole(['admin', 'super_admin']);

  if (roomIds.length === 0) {
    return [];
  }

  const supabase = await createClient();
  const repo = new RoomInventoryRepository(supabase);

  return repo.getInventoryForRoomsOnDate(roomIds, date);
}
