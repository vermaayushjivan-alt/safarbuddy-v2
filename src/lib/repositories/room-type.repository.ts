import { BaseRepository } from './base.repository';
import { SupabaseClientType, DatabaseRecord } from './types';

// RoomTypeRecord mirrors public.room_types as created by
// src/db/sql/005_room01_schema.sql (ROOM-01). This is a "content table"
// in the same sense as hotels/offers/destinations per DATABASE_BIBLE.md
// — accessed directly via the Supabase client through BaseRepository,
// not via Drizzle.
//
// ROOM-01 scope only. Do NOT add columns here for room_images (ROOM-02),
// room_rates (ROOM-03), room_inventory (ROOM-04), or booking_rooms
// (ROOM-05) — those are separate future milestones.
export interface RoomTypeRecord extends DatabaseRecord {
  id: string;
  hotel_id: string;

  name: string;
  description: string | null;

  base_price: number;

  max_adults: number;
  max_children: number;

  bed_config: string | null;
  room_size_sqft: number | null;

  status: RoomTypeStatus;
  display_order: number;
}

// Matches room_types_status_check in 005_room01_schema.sql.
export const ROOM_TYPE_STATUS_VALUES = ['active', 'inactive'] as const;
export type RoomTypeStatus = (typeof ROOM_TYPE_STATUS_VALUES)[number];

export interface RoomImageRow {
  id: string;
  room_type_id: string;
  storage_path: string;
  is_primary: boolean;
  sort_order: number;
}

export class RoomTypeRepository extends BaseRepository<RoomTypeRecord> {
  constructor(supabase: SupabaseClientType) {
    super(supabase, {
      tableName: 'room_types',
      softDelete: true,
      softDeleteColumn: 'deleted_at',
    });
  }

  // Room types are managed per-hotel (nested admin route), not via a
  // top-level paginated list — mirrors VendorRepository.listVendorBranches,
  // the closest existing "children of a parent" admin pattern.
  async getRoomTypesByHotel(hotelId: string): Promise<RoomTypeRecord[]> {
    return this.findMany({
      filters: [{ column: 'hotel_id', operator: 'eq', value: hotelId }],
      sort: { column: 'display_order', ascending: true },
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

  // --- ROOM-02: room_images table CRUD only.
  // No Storage calls here — those live in room-type.actions.ts.

  async listRoomImages(roomTypeId: string): Promise<RoomImageRow[]> {
    const { data, error } = await this.supabase
      .from('room_images')
      .select('id, room_type_id, storage_path, is_primary, sort_order')
      .eq('room_type_id', roomTypeId)
      .order('sort_order', { ascending: true });

    if (error) {
      throw new Error(`Failed to list room images: ${error.message}`);
    }

    return (data ?? []) as RoomImageRow[];
  }

  async getRoomImageById(imageId: string): Promise<RoomImageRow | null> {
    const { data, error } = await this.supabase
      .from('room_images')
      .select('id, room_type_id, storage_path, is_primary, sort_order')
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
      .from('room_images')
      .insert({
        room_type_id: roomTypeId,
        storage_path: storagePath,
        is_primary: isPrimary,
        sort_order: sortOrder,
      })
      .select('id, room_type_id, storage_path, is_primary, sort_order')
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
      .from('room_images')
      .update({ is_primary: false })
      .eq('room_type_id', roomTypeId);

    if (clearError) {
      throw new Error(
        `Failed to clear primary flags: ${clearError.message}`
      );
    }

    // Ownership check: the image being promoted must actually belong to
    // roomTypeId. Scoping the update to both id AND room_type_id (instead
    // of id alone) means a mismatched imageId affects zero rows instead of
    // silently flipping is_primary on another room type's image.
    const { data: setData, error: setError } = await this.supabase
      .from('room_images')
      .update({ is_primary: true })
      .eq('id', imageId)
      .eq('room_type_id', roomTypeId)
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
    // Scoped to id AND room_type_id — see setPrimaryRoomImage above.
    const { data, error } = await this.supabase
      .from('room_images')
      .update({ sort_order: sortOrder })
      .eq('id', imageId)
      .eq('room_type_id', roomTypeId)
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
    // Scoped to id AND room_type_id — see setPrimaryRoomImage above.
    const { data, error } = await this.supabase
      .from('room_images')
      .delete()
      .eq('id', imageId)
      .eq('room_type_id', roomTypeId)
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
