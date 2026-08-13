import { BaseRepository } from './base.repository';
import { SupabaseClientType, DatabaseRecord } from './types';

// RoomTypeRecord mirrors public.hotel_rooms (live production table,
// confirmed via information_schema — see PROJECT_STATUS.md Phase 1 note).
//
// The table this repository originally targeted, public.room_types, does
// not exist in production (PGRST205). No 005_room01_schema.sql migration
// was ever applied for it. The real, live schema for this admin surface
// is hotel_rooms / hotel_room_images / room_prices / room_inventory, with
// hotel_rooms as the parent row (hotel_rooms.hotel_id -> hotels.id) and
// the others referencing hotel_rooms.id via room_id.
//
// Class/method names are kept as RoomTypeRepository / getRoomTypesByHotel
// etc. to minimize churn in call sites (page.tsx, room-type.actions.ts,
// RoomTypeForm), even though the underlying table is hotel_rooms, not a
// literal "room type" table.
//
// ROOM-01/02 scope only. Do NOT add columns here for room_prices
// (ROOM-03) or room_inventory (ROOM-04) — those are separate repositories
// / milestones.
export interface RoomTypeRecord extends DatabaseRecord {
  id: string;
  hotel_id: string;

  room_name: string;
  room_type: string;

  base_price: number;

  capacity_adults: number;
  capacity_children: number;
  max_occupancy: number;

  bed_type: string | null;
  room_size_sqft: number | null;

  status: RoomTypeStatus;
}

// hotel_rooms.status is `text NOT NULL DEFAULT 'active'` live — no CHECK
// constraint has been confirmed, so these values are an app-level
// convention (matching the values already used by the existing admin
// UI), not a verified DB constraint. Do not assume more values exist
// without confirming against the live schema first.
export const ROOM_TYPE_STATUS_VALUES = ['active', 'inactive'] as const;
export type RoomTypeStatus = (typeof ROOM_TYPE_STATUS_VALUES)[number];

// Mirrors public.hotel_room_images (live). The table this originally
// targeted, public.room_images, does not exist in production.
export interface RoomImageRow {
  id: string;
  room_id: string;
  storage_path: string;
  is_primary: boolean;
  sort_order: number;
}

export class RoomTypeRepository extends BaseRepository<RoomTypeRecord> {
  constructor(supabase: SupabaseClientType) {
    super(supabase, {
      tableName: 'hotel_rooms',
      softDelete: true,
      softDeleteColumn: 'deleted_at',
    });
  }

  // Room types are managed per-hotel (nested admin route), not via a
  // top-level paginated list — mirrors VendorRepository.listVendorBranches,
  // the closest existing "children of a parent" admin pattern.
  //
  // Sorted by created_at (real column) instead of display_order —
  // hotel_rooms has no display_order column live.
  async getRoomTypesByHotel(hotelId: string): Promise<RoomTypeRecord[]> {
    return this.findMany({
      filters: [{ column: 'hotel_id', operator: 'eq', value: hotelId }],
      sort: { column: 'created_at', ascending: true },
    });
  }

  async getRoomTypeById(id: string): Promise<RoomTypeRecord | null> {
    return this.findById(id);
  }

  async createRoomType(
    data: Parameters<BaseRepository<RoomTypeRecord>['create']>[0]
  ) {
    return this.create(data);
  }

  async updateRoomType(
    id: string,
    data: Parameters<BaseRepository<RoomTypeRecord>['update']>[1]
  ) {
    return this.update(id, data);
  }

  async deleteRoomType(id: string): Promise<boolean> {
    return this.softDeleteById(id).then(() => true);
  }

  // --- ROOM-02: hotel_room_images table CRUD only.
  // No Storage calls here — those live in room-type.actions.ts.
  //
  // Parameter is still named roomTypeId (it's a hotel_rooms.id) to keep
  // call sites unchanged; the column queried is hotel_room_images.room_id.

  async listRoomImages(roomTypeId: string): Promise<RoomImageRow[]> {
    const { data, error } = await this.supabase
      .from('hotel_room_images')
      .select('id, room_id, storage_path, is_primary, sort_order')
      .eq('room_id', roomTypeId)
      .order('sort_order', { ascending: true });

    if (error) {
      throw new Error(`Failed to list room images: ${error.message}`);
    }

    return (data ?? []) as RoomImageRow[];
  }

  async getRoomImageById(imageId: string): Promise<RoomImageRow | null> {
    const { data, error } = await this.supabase
      .from('hotel_room_images')
      .select('id, room_id, storage_path, is_primary, sort_order')
      .eq('id', imageId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to get room image: ${error.message}`);
    }

    return data as RoomImageRow;
  }

  async insertRoomImageRow(
    roomTypeId: string,
    storagePath: string,
    isPrimary: boolean,
    sortOrder: number
  ): Promise<RoomImageRow> {
    const { data, error } = await this.supabase
      .from('hotel_room_images')
      .insert({
        room_id: roomTypeId,
        storage_path: storagePath,
        is_primary: isPrimary,
        sort_order: sortOrder,
      })
      .select('id, room_id, storage_path, is_primary, sort_order')
      .single();

    if (error) {
      throw new Error(`Failed to insert room image row: ${error.message}`);
    }

    return data as RoomImageRow;
  }

  async setPrimaryRoomImage(
    roomTypeId: string,
    imageId: string
  ): Promise<void> {
    const { error: clearError } = await this.supabase
      .from('hotel_room_images')
      .update({ is_primary: false })
      .eq('room_id', roomTypeId);

    if (clearError) {
      throw new Error(
        `Failed to clear primary flags: ${clearError.message}`
      );
    }

    // Ownership check: the image being promoted must actually belong to
    // roomTypeId. Scoping the update to both id AND room_id (instead
    // of id alone) means a mismatched imageId affects zero rows instead of
    // silently flipping is_primary on another room's image.
    const { data: setData, error: setError } = await this.supabase
      .from('hotel_room_images')
      .update({ is_primary: true })
      .eq('id', imageId)
      .eq('room_id', roomTypeId)
      .select('id');

    if (setError) {
      throw new Error(`Failed to set primary image: ${setError.message}`);
    }

    if (!setData || setData.length === 0) {
      throw new Error(
        'Image not found for this room type.'
      );
    }
  }

  async updateRoomImageSortOrder(
    roomTypeId: string,
    imageId: string,
    sortOrder: number
  ): Promise<void> {
    // Scoped to id AND room_id — see setPrimaryRoomImage above.
    const { data, error } = await this.supabase
      .from('hotel_room_images')
      .update({ sort_order: sortOrder })
      .eq('id', imageId)
      .eq('room_id', roomTypeId)
      .select('id');

    if (error) {
      throw new Error(`Failed to update sort order: ${error.message}`);
    }

    if (!data || data.length === 0) {
      throw new Error(
        'Image not found for this room type.'
      );
    }
  }

  async deleteRoomImageRow(
    roomTypeId: string,
    imageId: string
  ): Promise<void> {
    // Scoped to id AND room_id — see setPrimaryRoomImage above.
    const { data, error } = await this.supabase
      .from('hotel_room_images')
      .delete()
      .eq('id', imageId)
      .eq('room_id', roomTypeId)
      .select('id');

    if (error) {
      throw new Error(`Failed to delete room image row: ${error.message}`);
    }

    if (!data || data.length === 0) {
      throw new Error(
        'Image not found for this room type.'
      );
    }
  }
}
