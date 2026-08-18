import { BaseRepository } from './base.repository';
import { SupabaseClientType, DatabaseRecord } from './types';

// RoomInventory mirrors the live public.room_inventory table (see
// PROJECT_STATUS.md / DATABASE_BIBLE.md — confirmed via production
// information_schema query). ROOM-04 scope: this repository only ever
// writes total_rooms / available_rooms / blocked_rooms. booked_rooms is
// owned by the booking system and is never written here — see
// setInventoryForDate below.
//
// Confirmed live columns:
//   id, room_id, inventory_date, total_rooms, available_rooms,
//   blocked_rooms, booked_rooms, created_at, updated_at, created_by,
//   updated_by, deleted_at
export interface RoomInventoryRow extends DatabaseRecord {
  id: string;
  room_id: string;
  inventory_date: string;
  total_rooms: number;
  available_rooms: number;
  blocked_rooms: number;
  booked_rooms: number;
  created_by: string | null;
  updated_by: string | null;
}

export type SetInventoryInput = {
  roomId: string;
  inventoryDate: string;
  totalRooms: number;
  blockedRooms: number;
  actorId?: string | null;
};

export class RoomInventoryRepository extends BaseRepository<RoomInventoryRow> {
  constructor(supabase: SupabaseClientType) {
    super(supabase, {
      tableName: 'room_inventory',
      softDelete: true,
      softDeleteColumn: 'deleted_at',
    });
  }

  async getInventoryForRange(
    roomId: string,
    startDate: string,
    endDate: string
  ): Promise<RoomInventoryRow[]> {
    const { data, error } = await this.supabase
      .from('room_inventory')
      .select('*')
      .eq('room_id', roomId)
      .gte('inventory_date', startDate)
      .lte('inventory_date', endDate)
      .is('deleted_at', null)
      .order('inventory_date', { ascending: true });

    if (error) {
      console.error('[room_inventory] getInventoryForRange failed', error);
      throw error;
    }

    return (data as RoomInventoryRow[]) || [];
  }

  async getInventoryForDate(
    roomId: string,
    inventoryDate: string
  ): Promise<RoomInventoryRow | null> {
    const { data, error } = await this.supabase
      .from('room_inventory')
      .select('*')
      .eq('room_id', roomId)
      .eq('inventory_date', inventoryDate)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) {
      console.error('[room_inventory] getInventoryForDate failed', error);
      throw error;
    }

    return (data as RoomInventoryRow) || null;
  }

  // Dashboard helper: one query for every room's inventory row on a given
  // date, scoped to a hotel via the room_id list the caller already has
  // (avoids an N+1 query per room on the rooms dashboard page).
  async getInventoryForRoomsOnDate(
    roomIds: string[],
    date: string
  ): Promise<RoomInventoryRow[]> {
    if (roomIds.length === 0) return [];

    const { data, error } = await this.supabase
      .from('room_inventory')
      .select('*')
      .in('room_id', roomIds)
      .eq('inventory_date', date)
      .is('deleted_at', null);

    if (error) {
      console.error('[room_inventory] getInventoryForRoomsOnDate failed', error);
      throw error;
    }

    return (data as RoomInventoryRow[]) || [];
  }

  async verifyRoomOwnership(
    roomId: string,
    hotelId: string,
    userId: string,
    roles: string[]
  ): Promise<boolean> {
    const { data: room, error: roomError } = await this.supabase
      .from('hotel_rooms')
      .select('id, hotel_id')
      .eq('id', roomId)
      .is('deleted_at', null)
      .maybeSingle();

    if (roomError || !room || room.hotel_id !== hotelId) {
      return false;
    }

    if (roles.includes('admin') || roles.includes('super_admin')) {
      return true;
    }

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

  // Creates or updates the inventory row for one date. booked_rooms is
  // never written by this method — it is read-only here, sourced from
  // the booking system. available_rooms is derived (total - blocked -
  // booked, floored at 0) and stored, since it is a real stored column
  // with no confirmed DB-side formula (Bible RULE 7 — do not assume a
  // generated column exists).
  //
  // Safety: throws if totalRooms would be set below the room's current
  // booked_rooms for that date — this is the "never invalidate an
  // existing booking" guard required by the task.
  async setInventoryForDate(input: SetInventoryInput): Promise<RoomInventoryRow> {
    const existing = await this.getInventoryForDate(input.roomId, input.inventoryDate);
    const currentBooked = existing?.booked_rooms ?? 0;

    if (input.totalRooms < currentBooked) {
      throw new Error(
        `Cannot set total rooms to ${input.totalRooms} on ${input.inventoryDate} — ` +
        `${currentBooked} room(s) are already booked for that date.`
      );
    }

    if (input.totalRooms < input.blockedRooms + currentBooked) {
      throw new Error(
        `Total rooms (${input.totalRooms}) cannot be less than blocked (${input.blockedRooms}) ` +
        `plus already-booked (${currentBooked}) rooms on ${input.inventoryDate}.`
      );
    }

    const availableRooms = Math.max(
      0,
      input.totalRooms - input.blockedRooms - currentBooked
    );

    if (existing) {
      const { data, error } = await this.supabase
        .from('room_inventory')
        .update({
          total_rooms: input.totalRooms,
          blocked_rooms: input.blockedRooms,
          available_rooms: availableRooms,
          updated_at: new Date().toISOString(),
          updated_by: input.actorId || null,
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        console.error('[room_inventory] setInventoryForDate (update) failed', error);
        throw error;
      }

      return data as RoomInventoryRow;
    }

    const { data, error } = await this.supabase
      .from('room_inventory')
      .insert({
        room_id: input.roomId,
        inventory_date: input.inventoryDate,
        total_rooms: input.totalRooms,
        blocked_rooms: input.blockedRooms,
        available_rooms: availableRooms,
        booked_rooms: 0,
        created_by: input.actorId || null,
        updated_by: input.actorId || null,
      })
      .select()
      .single();

    if (error) {
      console.error('[room_inventory] setInventoryForDate (insert) failed', error);
      throw error;
    }

    return data as RoomInventoryRow;
  }

  // Resets a single date back to "not set" (soft-delete). Refuses if any
  // rooms are already booked for that date — same "never invalidate an
  // existing booking" guard as setInventoryForDate, since a missing
  // inventory row is treated as "not managed" by the rest of the app,
  // and silently discarding a date with live bookings would hide that
  // fact rather than protect it.
  async deleteInventoryForDate(
    roomId: string,
    inventoryDate: string
  ): Promise<boolean> {
    const existing = await this.getInventoryForDate(roomId, inventoryDate);

    if (!existing) {
      return true;
    }

    if (existing.booked_rooms > 0) {
      throw new Error(
        `Cannot clear availability for ${inventoryDate} — ` +
        `${existing.booked_rooms} room(s) are already booked for that date.`
      );
    }

    const { error } = await this.supabase
      .from('room_inventory')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', existing.id);

    if (error) {
      console.error('[room_inventory] deleteInventoryForDate failed', error);
      throw error;
    }

    return true;
  }
}
