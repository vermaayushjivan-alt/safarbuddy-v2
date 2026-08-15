'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { runAction, type ActionResult } from '@/lib/actions/action-result';
import { requireRole } from '@/lib/auth/session';
import { RoomPriceRepository, type RoomPrice } from '@/lib/repositories/room-price.repository';

const uuidSchema = z.string().uuid('Invalid UUID format');
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');

const createRoomPriceSchema = z.object({
  hotelId: uuidSchema,
  roomId: uuidSchema,
  priceDate: dateSchema,
  currencyId: uuidSchema,
  basePrice: z.number().positive('Base price must be greater than 0'),
  discountAmount: z.number().min(0, 'Discount amount cannot be negative').default(0),
  taxAmount: z.number().min(0, 'Tax amount cannot be negative').default(0),
});

const updateRoomPriceSchema = z.object({
  id: uuidSchema,
  hotelId: uuidSchema,
  roomId: uuidSchema,
  currencyId: uuidSchema.optional(),
  basePrice: z.number().positive('Base price must be greater than 0').optional(),
  discountAmount: z.number().min(0, 'Discount amount cannot be negative').optional(),
  taxAmount: z.number().min(0, 'Tax amount cannot be negative').optional(),
});

// Applies one base rate across every date in [startDate, endDate]
// (inclusive). Existing rows for a date in the range are updated in
// place; missing dates get a new row. This never touches room_inventory
// or booking data — it only ever writes room_prices.
const bulkSetRoomPriceSchema = z.object({
  hotelId: uuidSchema,
  roomId: uuidSchema,
  startDate: dateSchema,
  endDate: dateSchema,
  currencyId: uuidSchema,
  basePrice: z.number().positive('Base price must be greater than 0'),
  discountAmount: z.number().min(0, 'Discount amount cannot be negative').default(0),
  taxAmount: z.number().min(0, 'Tax amount cannot be negative').default(0),
}).refine((data) => new Date(data.endDate) >= new Date(data.startDate), {
  message: 'End date must be on or after start date',
  path: ['endDate'],
});

const getRoomPricesSchema = z.object({
  hotelId: uuidSchema,
  roomId: uuidSchema,
});

const getRoomPricesForRangeSchema = z.object({
  hotelId: uuidSchema,
  roomId: uuidSchema,
  startDate: dateSchema,
  endDate: dateSchema,
});

const deleteRoomPriceSchema = z.object({
  id: uuidSchema,
  hotelId: uuidSchema,
  roomId: uuidSchema,
});

async function assertOwnership(
  repo: RoomPriceRepository,
  priceId: string | null,
  roomId: string,
  hotelId: string
) {
  const user = await requireRole(['admin', 'hotel_owner']);

  const isAuthorized = await repo.verifyRoomOwnership(
    priceId,
    roomId,
    hotelId,
    user.id,
    user.roles
  );

  if (!isAuthorized) {
    throw new Error('Unauthorized access to hotel room pricing');
  }

  return user;
}

export async function createRoomPriceAction(input: unknown): Promise<ActionResult<RoomPrice>> {
  return runAction(async () => {
    const validated = createRoomPriceSchema.parse(input);
    const supabase = await createClient();
    const repo = new RoomPriceRepository(supabase);
    const user = await assertOwnership(repo, null, validated.roomId, validated.hotelId);

    const existing = await repo.getPriceForDate(validated.roomId, validated.priceDate);
    if (existing) {
      throw new Error(
        `A rate already exists for ${validated.priceDate}. Edit that rate instead of creating a duplicate.`
      );
    }

    return repo.createRoomPrice({
      roomId: validated.roomId,
      priceDate: validated.priceDate,
      currencyId: validated.currencyId,
      basePrice: validated.basePrice,
      discountAmount: validated.discountAmount,
      taxAmount: validated.taxAmount,
      createdBy: user.id,
    });
  });
}

export async function updateRoomPriceAction(input: unknown): Promise<ActionResult<RoomPrice>> {
  return runAction(async () => {
    const validated = updateRoomPriceSchema.parse(input);
    const supabase = await createClient();
    const repo = new RoomPriceRepository(supabase);
    const user = await assertOwnership(repo, validated.id, validated.roomId, validated.hotelId);

    return repo.updateRoomPrice(validated.id, {
      currencyId: validated.currencyId,
      basePrice: validated.basePrice,
      discountAmount: validated.discountAmount,
      taxAmount: validated.taxAmount,
      updatedBy: user.id,
    });
  });
}

export async function deleteRoomPriceAction(input: unknown): Promise<ActionResult<{ success: boolean }>> {
  return runAction(async () => {
    const validated = deleteRoomPriceSchema.parse(input);
    const supabase = await createClient();
    const repo = new RoomPriceRepository(supabase);
    await assertOwnership(repo, validated.id, validated.roomId, validated.hotelId);

    await repo.deleteRoomPrice(validated.id);

    return { success: true };
  });
}

export async function getRoomPricesAction(input: unknown): Promise<ActionResult<RoomPrice[]>> {
  return runAction(async () => {
    const validated = getRoomPricesSchema.parse(input);
    const supabase = await createClient();
    const repo = new RoomPriceRepository(supabase);
    await assertOwnership(repo, null, validated.roomId, validated.hotelId);

    return repo.getPricesByRoom(validated.roomId);
  });
}

export async function getRoomPricesForRangeAction(
  input: unknown
): Promise<ActionResult<RoomPrice[]>> {
  return runAction(async () => {
    const validated = getRoomPricesForRangeSchema.parse(input);
    const supabase = await createClient();
    const repo = new RoomPriceRepository(supabase);
    await assertOwnership(repo, null, validated.roomId, validated.hotelId);

    return repo.getPricesForDateRange(validated.roomId, validated.startDate, validated.endDate);
  });
}

// Bulk date-range rate application. Confirmation is enforced by the
// calling UI (RoomPriceManager shows a confirm dialog before invoking
// this) — the action itself just performs the writes once called.
export async function bulkSetRoomPriceAction(
  input: unknown
): Promise<ActionResult<{ updated: number; created: number }>> {
  return runAction(async () => {
    const validated = bulkSetRoomPriceSchema.parse(input);
    const supabase = await createClient();
    const repo = new RoomPriceRepository(supabase);
    const user = await assertOwnership(repo, null, validated.roomId, validated.hotelId);

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
      const existing = await repo.getPriceForDate(validated.roomId, date);

      if (existing) {
        await repo.updateRoomPrice(existing.id, {
          currencyId: validated.currencyId,
          basePrice: validated.basePrice,
          discountAmount: validated.discountAmount,
          taxAmount: validated.taxAmount,
          updatedBy: user.id,
        });
        updated += 1;
      } else {
        await repo.createRoomPrice({
          roomId: validated.roomId,
          priceDate: date,
          currencyId: validated.currencyId,
          basePrice: validated.basePrice,
          discountAmount: validated.discountAmount,
          taxAmount: validated.taxAmount,
          createdBy: user.id,
        });
        created += 1;
      }
    }

    return { updated, created };
  });
}

export async function getCurrenciesAction(): Promise<ActionResult<Array<{ id: string; code: string; name: string; symbol: string }>>> {
  return runAction(async () => {
    await requireRole(['admin', 'hotel_owner']);
    const supabase = await createClient();
    const repo = new RoomPriceRepository(supabase);
    return repo.getCurrencies();
  });
}
