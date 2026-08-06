import { BaseRepository } from './base.repository';
import { SupabaseClientType, DatabaseRecord } from './types';
export interface DestinationRecord extends DatabaseRecord {
  id: string;
  name: string;
  slug: string;
  state: string | null;
  thumbnail: string | null;
  banner: string | null;
  description: string | null;
  is_featured: boolean;
  status: string;
}
export interface DestinationImageRow {
  id: string;
  destination_id: string;
  storage_path: string;
  is_primary: boolean;
  sort_order: number;
}

export class DestinationRepository extends BaseRepository<DestinationRecord> {
  constructor(supabase: SupabaseClientType) {
    super(supabase, {
      tableName: 'destinations',
      softDelete: false,
    });
  }

  // --- Existing HOME-03 method (unchanged) ---

  async getFeaturedDestinations(limit: number = 8): Promise<DestinationRecord[]> {
    return this.findMany({
      filters: [
        { column: 'is_featured', operator: 'eq', value: true },
      ],
      sort: { column: 'name', ascending: true },
      pagination: { page: 1, limit },
    });
  }

  // --- ADMIN-06: minimal public exposure of BaseRepository, mirrors
  // HotelRepository's ADMIN-02 section. softDelete is false for this
  // table (as at construction above), so deleteDestination() is a hard
  // delete via the base delete(), same as PackageRepository. ---

  async getAllDestinations(page: number = 1, limit: number = 20) {
    return this.findWithPagination({
      sort: { column: 'created_at', ascending: false },
      pagination: { page, limit },
    });
  }

  async getDestinationById(id: string): Promise<DestinationRecord | null> {
    return this.findById(id);
  }

  async createDestination(
    data: Parameters<BaseRepository<DestinationRecord>['create']>[0]
  ) {
    return this.create(data);
  }

  async updateDestination(
    id: string,
    data: Parameters<BaseRepository<DestinationRecord>['update']>[1]
  ) {
    return this.update(id, data);
  }

  async deleteDestination(id: string): Promise<boolean> {
    return this.delete(id);
  }

  // --- ADMIN-07: destination_images table CRUD only. No Storage calls
  // here — mirrors PackageRepository's ADMIN-05 section. ---

  async listDestinationImages(destinationId: string): Promise<DestinationImageRow[]> {
    const { data, error } = await this.supabase
      .from('destination_images')
      .select('id, destination_id, storage_path, is_primary, sort_order')
      .eq('destination_id', destinationId)
      .order('sort_order', { ascending: true });

    if (error) {
      throw new Error(`Failed to list destination images: ${error.message}`);
    }

    return (data ?? []) as DestinationImageRow[];
  }

  async getDestinationImageById(imageId: string): Promise<DestinationImageRow | null> {
    const { data, error } = await this.supabase
      .from('destination_images')
      .select('id, destination_id, storage_path, is_primary, sort_order')
      .eq('id', imageId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to get destination image: ${error.message}`);
    }

    return data as DestinationImageRow;
  }

  async insertDestinationImageRow(
    destinationId: string,
    storagePath: string,
    isPrimary: boolean,
    sortOrder: number
  ): Promise<DestinationImageRow> {
    const { data, error } = await this.supabase
      .from('destination_images')
      .insert({
        destination_id: destinationId,
        storage_path: storagePath,
        is_primary: isPrimary,
        sort_order: sortOrder,
      })
      .select('id, destination_id, storage_path, is_primary, sort_order')
      .single();

    if (error) {
      throw new Error(`Failed to insert destination image row: ${error.message}`);
    }

    return data as DestinationImageRow;
  }

  async setPrimaryDestinationImage(destinationId: string, imageId: string): Promise<void> {
    const { error: clearError } = await this.supabase
      .from('destination_images')
      .update({ is_primary: false })
      .eq('destination_id', destinationId);

    if (clearError) {
      throw new Error(`Failed to clear primary flags: ${clearError.message}`);
    }

    const { error: setError } = await this.supabase
      .from('destination_images')
      .update({ is_primary: true })
      .eq('id', imageId);

    if (setError) {
      throw new Error(`Failed to set primary image: ${setError.message}`);
    }
  }

  async updateDestinationImageSortOrder(imageId: string, sortOrder: number): Promise<void> {
    const { error } = await this.supabase
      .from('destination_images')
      .update({ sort_order: sortOrder })
      .eq('id', imageId);

    if (error) {
      throw new Error(`Failed to update sort order: ${error.message}`);
    }
  }

  async deleteDestinationImageRow(imageId: string): Promise<void> {
    const { error } = await this.supabase
      .from('destination_images')
      .delete()
      .eq('id', imageId);

    if (error) {
      throw new Error(`Failed to delete destination image row: ${error.message}`);
    }
  }
}
