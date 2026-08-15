import { BaseRepository } from './base.repository';
import { SupabaseClientType, DatabaseRecord } from './types';

// RoomPrice mirrors the ACTUAL live public.room_prices table (confirmed
// via production information_schema query — see PROJECT_STATUS.md /
// DATABASE_BIBLE.md). This repository talks to Supabase directly via
// BaseRepository, like every other repository in this project — it does
// not use Drizzle models or an invented RepositoryResult wrapper.
//
// CORRECTION (post-ROOM-01/02 hardening): the previous version of this
// file targeted start_date / end_date / is_default / status columns that
// do NOT exist on the live table — every create/update/delete call would
// have failed in production with "column does not exist". The real
// production schema is a per-day rate table keyed by price_date, with a
// stored final_price column (not DB-computed). Confirmed live columns:
//
//   id, room_id, price_date, base_price, discount_amount, tax_amount,
//   final_price, currency_id, created_at, updated_at, created_by,
//   updated_by, deleted_at
export interface RoomPrice extends DatabaseRecord {
  id: string;
  room_id: string;
  price_date: string;
  currency_id: string;
  base_price: number;
  discount_amount: number;
  tax_amount: number;
  final_price: number;
  created_by: string | null;
  updated_by: string | null;
}

export type CreateRoomPriceInput = {
  roomId: string;
  priceDate: string;
  currencyId: string;
  basePrice: number;
  discountAmount?: number;
  taxAmount?: number;
  createdBy?: string | null;
};

export type UpdateRoomPriceInput = Partial<
  Omit<CreateRoomPriceInput, 'roomId' | 'priceDate'>
> & {
  updatedBy?: string | null;
};

// Final price is a real, stored column in production (not DB-computed),
// so every write path must compute and set it itself. This is the single
// place that formula lives — see FINAL PRINCIPLE / RULE 9 (no scattered
// reimplementations).
export function calculateFinalPrice(
  basePrice: number,
  discountAmount: number,
  taxAmount: number
): number {
  return Math.max(0, basePrice - discountAmount + taxAmount);
}

export class RoomPriceRepository extends BaseRepository<RoomPrice> {
  constructor(supabase: SupabaseClientType) {
    super(supabase, {
      tableName: 'room_prices',
      softDelete: true,
      softDeleteColumn: 'deleted_at',
    });
  }

  async getPricesByRoom(roomId: string): Promise<RoomPrice[]> {
    const { data, error } = await this.supabase
      .from('room_prices')
      .select('*')
      .eq('room_id', roomId)
      .is('deleted_at', null)
      .order('price_date', { ascending: true });

    if (error) {
      console.error('[room_prices] getPricesByRoom failed', error);
      throw error;
    }

    return (data as RoomPrice[]) || [];
  }

  async getPricesForDateRange(
    roomId: string,
    startDate: string,
    endDate: string
  ): Promise<RoomPrice[]> {
    const { data, error } = await this.supabase
      .from('room_prices')
      .select('*')
      .eq('room_id', roomId)
      .gte('price_date', startDate)
      .lte('price_date', endDate)
      .is('deleted_at', null)
      .order('price_date', { ascending: true });

    if (error) {
      console.error('[room_prices] getPricesForDateRange failed', error);
      throw error;
    }

    return (data as RoomPrice[]) || [];
  }

  async getPriceById(id: string): Promise<RoomPrice | null> {
    const { data, error } = await this.supabase
      .from('room_prices')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) {
      console.error('[room_prices] getPriceById failed', error);
      throw error;
    }

    return (data as RoomPrice) || null;
  }

  // One rate row per (room_id, price_date) is the intended model, but no
  // unique constraint on that pair has been confirmed live (Bible RULE 7 —
  // never invent a constraint that isn't verified), so this checks for an
  // existing row first rather than relying on upsert/onConflict.
  async getPriceForDate(
    roomId: string,
    priceDate: string
  ): Promise<RoomPrice | null> {
    const { data, error } = await this.supabase
      .from('room_prices')
      .select('*')
      .eq('room_id', roomId)
      .eq('price_date', priceDate)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) {
      console.error('[room_prices] getPriceForDate failed', error);
      throw error;
    }

    return (data as RoomPrice) || null;
  }

  async verifyRoomOwnership(
    priceId: string | null,
    roomId: string,
    hotelId: string,
    userId: string,
    roles: string[]
  ): Promise<boolean> {
    // 1. Verify room belongs to hotel. Parent table for room_prices.room_id
    // is hotel_rooms (room_prices_room_id_fkey -> hotel_rooms.id) — the
    // production table, not room_types (confirmed absent, PGRST205).
    const { data: room, error: roomError } = await this.supabase
      .from('hotel_rooms')
      .select('id, hotel_id')
      .eq('id', roomId)
      .is('deleted_at', null)
      .maybeSingle();

    if (roomError || !room || room.hotel_id !== hotelId) {
      return false;
    }

    // 2. If priceId provided, verify price belongs to room
    if (priceId) {
      const { data: price, error: priceError } = await this.supabase
        .from('room_prices')
        .select('id, room_id')
        .eq('id', priceId)
        .is('deleted_at', null)
        .maybeSingle();

      if (priceError || !price || price.room_id !== roomId) {
        return false;
      }
    }

    // 3. Admin / Super admin bypass
    if (roles.includes('admin') || roles.includes('super_admin')) {
      return true;
    }

    // 4. For hotel_owner, check hotel vendor/owner relationship
    const { data: hotel, error: hotelError } = await this.supabase
      .from('hotels')
      .select('id, vendor_id, created_by')
      .eq('id', hotelId)
      .is('deleted_at', null)
      .maybeSingle();

    if (hotelError || !hotel) return false;

    if (hotel.created_by === userId) return true;

    if (hotel.vendor_id) {
      const { data: vendor } = await this.supabase
        .from('vendors')
        .select('id, owner_id')
        .eq('id', hotel.vendor_id)
        .is('deleted_at', null)
        .maybeSingle();

      if (vendor && vendor.owner_id === userId) return true;
    }

    return false;
  }

  async createRoomPrice(input: CreateRoomPriceInput): Promise<RoomPrice> {
    const finalPrice = calculateFinalPrice(
      input.basePrice,
      input.discountAmount ?? 0,
      input.taxAmount ?? 0
    );

    const { data, error } = await this.supabase
      .from('room_prices')
      .insert({
        room_id: input.roomId,
        price_date: input.priceDate,
        currency_id: input.currencyId,
        base_price: input.basePrice,
        discount_amount: input.discountAmount ?? 0,
        tax_amount: input.taxAmount ?? 0,
        final_price: finalPrice,
        created_by: input.createdBy || null,
        updated_by: input.createdBy || null,
      })
      .select()
      .single();

    if (error) {
      console.error('[room_prices] createRoomPrice failed', error);
      throw error;
    }

    if (!data) {
      throw new Error('Room rate was created but no record was returned.');
    }

    return data as RoomPrice;
  }

  async updateRoomPrice(
    id: string,
    input: UpdateRoomPriceInput
  ): Promise<RoomPrice> {
    const existing = await this.getPriceById(id);

    if (!existing) {
      throw new Error('Room rate not found.');
    }

    const nextBasePrice = input.basePrice ?? existing.base_price;
    const nextDiscount = input.discountAmount ?? existing.discount_amount;
    const nextTax = input.taxAmount ?? existing.tax_amount;

    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      final_price: calculateFinalPrice(nextBasePrice, nextDiscount, nextTax),
    };

    if (input.currencyId !== undefined) payload.currency_id = input.currencyId;
    if (input.basePrice !== undefined) payload.base_price = input.basePrice;
    if (input.discountAmount !== undefined) payload.discount_amount = input.discountAmount;
    if (input.taxAmount !== undefined) payload.tax_amount = input.taxAmount;
    if (input.updatedBy !== undefined) payload.updated_by = input.updatedBy;

    const { data, error } = await this.supabase
      .from('room_prices')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[room_prices] updateRoomPrice failed', error);
      throw error;
    }

    if (!data) {
      throw new Error('Room rate was updated but no record was returned.');
    }

    return data as RoomPrice;
  }

  async deleteRoomPrice(id: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('room_prices')
      .update({
        deleted_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      console.error('[room_prices] deleteRoomPrice failed', error);
      throw error;
    }

    return true;
  }

  // CORRECTION: previously filtered on `.eq('is_active', true)`, which
  // does not exist on the live public.currencies table (confirmed
  // columns: id, code, name, symbol, created_at, updated_at, created_by,
  // updated_by, deleted_at). Fixed to use the real soft-delete column.
  async getCurrencies(): Promise<
    Array<{ id: string; code: string; name: string; symbol: string }>
  > {
    const { data, error } = await this.supabase
      .from('currencies')
      .select('id, code, name, symbol')
      .is('deleted_at', null)
      .order('code', { ascending: true });

    if (error) {
      console.error('[room_prices] getCurrencies failed', error);
      throw error;
    }

    return data || [];
  }
}
