import { BaseRepository } from './base.repository';
import { SupabaseClientType, DatabaseRecord } from './types';

export interface OfferRecord extends DatabaseRecord {
  id: string;
  title: string;
  banner_image: string | null;
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

  // FIX (offers not showing on homepage): the old filter used
  //   status = 'ACTIVE' (uppercase) AND end_date >= now()
  // but the offers_public_read RLS policy only lets public visitors see
  // lowercase status ('active'/'approved'/'published') and deleted_at IS NULL,
  // so the two never matched. Also NULL end_date never satisfied >=. Now:
  //   - status is matched case-insensitively (data should be lowercase)
  //   - offers with NULL end_date are treated as "no expiry"
  //   - end_date is compared as a plain date (YYYY-MM-DD), so an offer
  //     ending today stays live for the whole day
  async getActiveOffers(limit: number = 5): Promise<OfferRecord[]> {
    const today = new Date().toISOString().slice(0, 10);

    const { data, error } = await this.supabase
      .from('offers')
      .select('*')
      .ilike('status', 'active')
      .or(`end_date.is.null,end_date.gte.${today}`)
      .order('start_date', { ascending: false, nullsFirst: false })
      .limit(limit);

    if (error) throw new Error(error.message);
    return (data ?? []) as OfferRecord[];
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
