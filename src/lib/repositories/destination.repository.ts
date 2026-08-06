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
}
