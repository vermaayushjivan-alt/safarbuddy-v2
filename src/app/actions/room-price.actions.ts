'use server';

import { z } from 'zod';
import { runAction, type ActionResult } from '@/lib/actions/action-result';
import { requireRole } from '@/lib/auth/session';
import { RoomPriceRepository, type RoomPrice } from '@/lib/repositories/room-price.repository';

const uuidSchema = z.string().uuid('Invalid UUID format');

const createRoomPriceSchema = z.object({
  hotelId: uuidSchema,
  roomId: uuidSchema,
  currencyId: uuidSchema,
  basePrice: z.number().positive('Base price must be greater than 0'),
  discountAmount: z.number().min(0, 'Discount amount cannot be negative').default(0),
  taxAmount: z.number().min(0, 'Tax amount cannot be negative').default(0),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  isDefault: z.boolean().default(false),
  status: z.enum(['active', 'inactive', 'archived']).default('active'),
}).refine((data) => {
  if (data.startDate && data.endDate) {
    return new Date(data.endDate) >= new Date(data.startDate);
  }
  return true;
}, {
  message: 'End date must be greater than or equal to start date',
  path: ['endDate'],
});

const updateRoomPriceSchema = z.object({
  id: uuidSchema,
  hotelId: uuidSchema,
  roomId: uuidSchema,
  currencyId: uuidSchema.optional(),
  basePrice: z.number().positive('Base price must be greater than 0').optional(),
  discountAmount: z.number().min(0, 'Discount amount cannot be negative').optional(),
  taxAmount: z.number().min(0, 'Tax amount cannot be negative').optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  isDefault: z.boolean().optional(),
  status: z.enum(['active', 'inactive', 'archived']).optional(),
}).refine((data) => {
  if (data.startDate && data.endDate) {
    return new Date(data.endDate) >= new Date(data.startDate);
  }
  return true;
}, {
  message: 'End date must be greater than or equal to start date',
  path: ['endDate'],
});

const getRoomPricesSchema = z.object({
  hotelId: uuidSchema,
  roomId: uuidSchema,
});

const deleteRoomPriceSchema = z.object({
  id: uuidSchema,
  hotelId: uuidSchema,
  roomId: uuidSchema,
});

export async function createRoomPriceAction(input: unknown): Promise<ActionResult<RoomPrice>> {
  return runAction(async () => {
    const user = await requireRole(['admin', 'hotel_owner']);
    const validated = createRoomPriceSchema.parse(input);

    const repo = new RoomPriceRepository();
    const isAuthorized = await repo.verifyRoomOwnership(
      null,
      validated.roomId,
      validated.hotelId,
      user.id,
      user.role
    );

    if (!isAuthorized) {
      throw new Error('Unauthorized access to hotel room pricing');
    }

    const result = await repo.createRoomPrice({
      roomId: validated.roomId,
      currencyId: validated.currencyId,
      basePrice: validated.basePrice,
      discountAmount: validated.discountAmount,
      taxAmount: validated.taxAmount,
      startDate: validated.startDate,
      endDate: validated.endDate,
      isDefault: validated.isDefault,
      status: validated.status,
      createdBy: user.id,
    });

    if (result.error || !result.data) {
      throw new Error(result.error?.message || 'Failed to create room rate');
    }

    return result.data;
  });
}

export async function updateRoomPriceAction(input: unknown): Promise<ActionResult<RoomPrice>> {
  return runAction(async () => {
    const user = await requireRole(['admin', 'hotel_owner']);
    const validated = updateRoomPriceSchema.parse(input);

    const repo = new RoomPriceRepository();
    const isAuthorized = await repo.verifyRoomOwnership(
      validated.id,
      validated.roomId,
      validated.hotelId,
      user.id,
      user.role
    );

    if (!isAuthorized) {
      throw new Error('Unauthorized access to hotel room pricing');
    }

    const result = await repo.updateRoomPrice(validated.id, {
      currencyId: validated.currencyId,
      basePrice: validated.basePrice,
      discountAmount: validated.discountAmount,
      taxAmount: validated.taxAmount,
      startDate: validated.startDate,
      endDate: validated.endDate,
      isDefault: validated.isDefault,
      status: validated.status,
      updatedBy: user.id,
    });

    if (result.error || !result.data) {
      throw new Error(result.error?.message || 'Failed to update room rate');
    }

    return result.data;
  });
}

export async function deleteRoomPriceAction(input: unknown): Promise<ActionResult<{ success: boolean }>> {
  return runAction(async () => {
    const user = await requireRole(['admin', 'hotel_owner']);
    const validated = deleteRoomPriceSchema.parse(input);

    const repo = new RoomPriceRepository();
    const isAuthorized = await repo.verifyRoomOwnership(
      validated.id,
      validated.roomId,
      validated.hotelId,
      user.id,
      user.role
    );

    if (!isAuthorized) {
      throw new Error('Unauthorized access to hotel room pricing');
    }

    const result = await repo.deleteRoomPrice(validated.id);

    if (result.error) {
      throw new Error(result.error.message || 'Failed to delete room rate');
    }

    return { success: true };
  });
}

export async function getRoomPricesAction(input: unknown): Promise<ActionResult<RoomPrice[]>> {
  return runAction(async () => {
    const user = await requireRole(['admin', 'hotel_owner']);
    const validated = getRoomPricesSchema.parse(input);

    const repo = new RoomPriceRepository();
    const isAuthorized = await repo.verifyRoomOwnership(
      null,
      validated.roomId,
      validated.hotelId,
      user.id,
      user.role
    );

    if (!isAuthorized) {
      throw new Error('Unauthorized access to hotel room pricing');
    }

    const result = await repo.getPricesByRoom(validated.roomId);

    if (result.error) {
      throw new Error(result.error.message || 'Failed to fetch room rates');
    }

    return result.data || [];
  });
}

export async function getCurrenciesAction(): Promise<ActionResult<Array<{ id: string; code: string; name: string; symbol: string }>>> {
  return runAction(async () => {
    await requireRole(['admin', 'hotel_owner']);
    const repo = new RoomPriceRepository();
    const result = await repo.getCurrencies();
    if (result.error) {
      throw new Error(result.error.message || 'Failed to fetch currencies');
    }
    return result.data || [];
  });
}
