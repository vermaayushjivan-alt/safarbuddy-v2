import { BaseRepository } from './base.repository';
import type { RepositoryResult } from './types';
import type { InferSelectModel } from 'drizzle-orm';
import type { roomPrices } from '@/db/schema';

export type RoomPrice = InferSelectModel<typeof roomPrices>;

export type CreateRoomPriceInput = {
  roomId: string;
  currencyId: string;
  basePrice: number;
  discountAmount?: number;
  taxAmount?: number;
  startDate?: string | null;
  endDate?: string | null;
  isDefault?: boolean;
  status?: 'active' | 'inactive' | 'archived';
  createdBy?: string | null;
};

export type UpdateRoomPriceInput = Partial<Omit<CreateRoomPriceInput, 'roomId'>> & {
  updatedBy?: string | null;
};

export class RoomPriceRepository extends BaseRepository<RoomPrice> {
  constructor() {
    super('room_prices');
  }

  async getPricesByRoom(roomId: string): Promise<RepositoryResult<RoomPrice[]>> {
    return this.executeQuery(async (client) => {
      const { data, error } = await client
        .from('room_prices')
        .select('*')
        .eq('room_id', roomId)
        .is('deleted_at', null)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data as RoomPrice[]) || [];
    });
  }

  async getPriceById(id: string): Promise<RepositoryResult<RoomPrice | null>> {
    return this.executeQuery(async (client) => {
      const { data, error } = await client
        .from('room_prices')
        .select('*')
        .eq('id', id)
        .is('deleted_at', null)
        .maybeSingle();

      if (error) throw error;
      return (data as RoomPrice) || null;
    });
  }

  async verifyRoomOwnership(priceId: string | null, roomId: string, hotelId: string, userId: string, roles: string[]): Promise<boolean> {
    return this.executeQuery(async (client) => {
      // 1. Verify room belongs to hotel
      const { data: room, error: roomError } = await client
        .from('room_types')
        .select('id, hotel_id')
        .eq('id', roomId)
        .is('deleted_at', null)
        .maybeSingle();

      if (roomError || !room || room.hotel_id !== hotelId) {
        return false;
      }

      // 2. If priceId provided, verify price belongs to room
      if (priceId) {
        const { data: price, error: priceError } = await client
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
      const { data: hotel, error: hotelError } = await client
        .from('hotels')
        .select('id, vendor_id, created_by')
        .eq('id', hotelId)
        .is('deleted_at', null)
        .maybeSingle();

      if (hotelError || !hotel) return false;

      if (hotel.created_by === userId) return true;

      if (hotel.vendor_id) {
        const { data: vendor } = await client
          .from('vendors')
          .select('id, owner_id')
          .eq('id', hotel.vendor_id)
          .is('deleted_at', null)
          .maybeSingle();

        if (vendor && vendor.owner_id === userId) return true;
      }

      return false;
    });
  }

  async createRoomPrice(input: CreateRoomPriceInput): Promise<RepositoryResult<RoomPrice>> {
    return this.executeQuery(async (client) => {
      if (input.isDefault) {
        await client
          .from('room_prices')
          .update({ is_default: false, updated_at: new Date().toISOString() })
          .eq('room_id', input.roomId)
          .eq('is_default', true);
      }

      const { data, error } = await client
        .from('room_prices')
        .insert({
          room_id: input.roomId,
          currency_id: input.currencyId,
          base_price: input.basePrice,
          discount_amount: input.discountAmount ?? 0,
          tax_amount: input.taxAmount ?? 0,
          start_date: input.startDate || null,
          end_date: input.endDate || null,
          is_default: input.isDefault ?? false,
          status: input.status ?? 'active',
          created_by: input.createdBy || null,
          updated_by: input.createdBy || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as RoomPrice;
    });
  }

  async updateRoomPrice(id: string, input: UpdateRoomPriceInput): Promise<RepositoryResult<RoomPrice>> {
    return this.executeQuery(async (client) => {
      const { data: current } = await client
        .from('room_prices')
        .select('room_id')
        .eq('id', id)
        .single();

      if (input.isDefault && current?.room_id) {
        await client
          .from('room_prices')
          .update({ is_default: false, updated_at: new Date().toISOString() })
          .eq('room_id', current.room_id)
          .eq('is_default', true)
          .neq('id', id);
      }

      const payload: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (input.currencyId !== undefined) payload.currency_id = input.currencyId;
      if (input.basePrice !== undefined) payload.base_price = input.basePrice;
      if (input.discountAmount !== undefined) payload.discount_amount = input.discountAmount;
      if (input.taxAmount !== undefined) payload.tax_amount = input.taxAmount;
      if (input.startDate !== undefined) payload.start_date = input.startDate || null;
      if (input.endDate !== undefined) payload.end_date = input.endDate || null;
      if (input.isDefault !== undefined) payload.is_default = input.isDefault;
      if (input.status !== undefined) payload.status = input.status;
      if (input.updatedBy !== undefined) payload.updated_by = input.updatedBy;

      const { data, error } = await client
        .from('room_prices')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as RoomPrice;
    });
  }

  async deleteRoomPrice(id: string): Promise<RepositoryResult<boolean>> {
    return this.executeQuery(async (client) => {
      const { error } = await client
        .from('room_prices')
        .update({
          deleted_at: new Date().toISOString(),
          status: 'archived',
        })
        .eq('id', id);

      if (error) throw error;
      return true;
    });
  }

  async getPricesForDateRange(roomId: string, startDate: string, endDate: string): Promise<RepositoryResult<RoomPrice[]>> {
    return this.executeQuery(async (client) => {
      const { data, error } = await client
        .from('room_prices')
        .select('*')
        .eq('room_id', roomId)
        .eq('status', 'active')
        .is('deleted_at', null)
        .or(`and(start_date.lte.${endDate},end_date.gte.${startDate}),is_default.eq.true`);

      if (error) throw error;
      return (data as RoomPrice[]) || [];
    });
  }

  async getCurrencies(): Promise<RepositoryResult<Array<{ id: string; code: string; name: string; symbol: string }>>> {
    return this.executeQuery(async (client) => {
      const { data, error } = await client
        .from('currencies')
        .select('id, code, name, symbol')
        .eq('is_active', true)
        .order('code', { ascending: true });

      if (error) throw error;
      return data || [];
    });
  }
}
