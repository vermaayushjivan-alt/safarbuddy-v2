import { BaseRepository } from './base.repository';
import { SupabaseClientType, DatabaseRecord } from './types';

export interface PackageRecord extends DatabaseRecord {
  id: string;
  title: string;
  slug: string;
  thumbnail: string | null;
  description: string | null;
  city: string | null;
  duration: string | null;
  price: number | null;
  is_featured: boolean;
  status: string;
}

export class PackageRepository extends BaseRepository<PackageRecord> {
  constructor(supabase: SupabaseClientType) {
    super(supabase, {
      tableName: 'packages',
      softDelete: false,
    });
  }

  async getFeaturedPackages(limit: number = 8): Promise<PackageRecord[]> {
    return this.findMany({
      filters: [
        { column: 'status', operator: 'eq', value: 'ACTIVE' },
        { column: 'is_featured', operator: 'eq', value: true },
      ],
      sort: { column: 'title', ascending: true },
      pagination: { page: 1, limit },
    });
  }
}
