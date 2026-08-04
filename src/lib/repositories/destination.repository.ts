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

  async getFeaturedDestinations(limit: number = 8): Promise<DestinationRecord[]> {
    return this.findMany({
      filters: [
        { column: 'status', operator: 'eq', value: 'ACTIVE' },
        { column: 'is_featured', operator: 'eq', value: true },
      ],
      sort: { column: 'name', ascending: true },
      pagination: { page: 1, limit },
    });
  }
}
