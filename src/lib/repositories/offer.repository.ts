import { BaseRepository } from './base.repository';
import { SupabaseClientType, DatabaseRecord } from './types';

export interface OfferRecord extends DatabaseRecord {
  id: string;
  title: string;
  image: string | null;
  description: string | null;
  discount: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
}

export class OfferRepository extends BaseRepository<OfferRecord> {
  constructor(supabase: SupabaseClientType) {
    super(supabase, {
      tableName: 'offers',
      softDelete: false,
    });
  }

  async getActiveOffers(limit: number = 5): Promise<OfferRecord[]> {
    const today = new Date().toISOString();
    return this.findMany({
      filters: [
        { column: 'status', operator: 'eq', value: 'ACTIVE' },
        { column: 'end_date', operator: 'gte', value: today },
      ],
      sort: { column: 'start_date', ascending: false },
      pagination: { page: 1, limit },
    });
  }

  // --- ADMIN-08: minimal public exposure of BaseRepository, mirrors
  // DestinationRepository's ADMIN-06 section. softDelete is false for
  // this table (as at construction above), so deleteOffer() is a hard
  // delete via the base delete(), same as Destination/PackageRepository. ---

  async getAllOffers(page: number = 1, limit: number = 20) {
    return this.findWithPagination({
      sort: { column: 'created_at', ascending: false },
      pagination: { page, limit },
    });
  }

  async getOfferById(id: string): Promise<OfferRecord | null> {
    return this.findById(id);
  }

  async createOffer(
    data: Parameters<BaseRepository<OfferRecord>['create']>[0]
  ) {
    return this.create(data);
  }

  async updateOffer(
    id: string,
    data: Parameters<BaseRepository<OfferRecord>['update']>[1]
  ) {
    return this.update(id, data);
  }

  async deleteOffer(id: string): Promise<boolean> {
    return this.delete(id);
  }
}
