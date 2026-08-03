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
}
