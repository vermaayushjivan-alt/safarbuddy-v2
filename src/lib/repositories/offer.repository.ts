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
  //
  // OFFER-HOTELS-01: the "is this offer live" rule now lives in ONE place
  // (activeOffersQuery) and is shared by the homepage list and the
  // /offers/[id] detail lookup, so the two can never disagree about which
  // offers are live (RULE 1).
  private activeOffersQuery() {
    const today = new Date().toISOString().slice(0, 10);

    return this.supabase
      .from('offers')
      .select('*')
      .ilike('status', 'active')
      .or(`end_date.is.null,end_date.gte.${today}`);
  }

  async getActiveOffers(limit: number = 5): Promise<OfferRecord[]> {
    const { data, error } = await this.activeOffersQuery()
      .order('start_date', { ascending: false, nullsFirst: false })
      .limit(limit);

    if (error) throw new Error(error.message);
    return (data ?? []) as OfferRecord[];
  }

  // OFFER-HOTELS-01: one live offer by id for the public /offers/[id]
  // page. Returns null (never throws) for an unknown / malformed id or an
  // offer that is not live, so the page can render a clean 404.
  async getActiveOfferById(id: string): Promise<OfferRecord | null> {
    if (!id || !id.trim()) return null;

    const { data, error } = await this.activeOffersQuery()
      .eq('id', id)
      .maybeSingle();

    if (error) {
      // 22P02 = invalid input syntax for type uuid (e.g. /offers/abc)
      if (error.code === '22P02') return null;
      throw new Error(error.message);
    }

    return (data as OfferRecord | null) ?? null;
  }

  // --- OFFER-HOTELS-01: offer <-> hotel links (public.offer_hotels) ---
  //
  // Data layer only (RULE 3): no auth here. Admin gating is done by the
  // callers in offer.actions.ts (requireRole) and by the
  // offer_hotels_admin_all RLS policy.

  async getHotelIdsForOffer(offerId: string): Promise<string[]> {
    const { data, error } = await this.supabase
      .from('offer_hotels')
      .select('hotel_id')
      .eq('offer_id', offerId);

    if (error) {
      throw new Error(`Failed to load offer hotels: ${error.message}`);
    }

    return (data ?? []).map((row) => (row as { hotel_id: string }).hotel_id);
  }

  // Makes the offer's linked hotels EXACTLY equal `hotelIds`: removes the
  // ones no longer selected and adds the new ones. Diffing (instead of
  // delete-all + re-insert) means an edit that doesn't touch the hotel
  // selection performs no writes at all, and a failure part-way can never
  // leave an offer with its previous hotels wiped.
  async setOfferHotels(offerId: string, hotelIds: string[]): Promise<void> {
    const wanted = Array.from(new Set(hotelIds));
    const existing = await this.getHotelIdsForOffer(offerId);

    const toRemove = existing.filter((id) => !wanted.includes(id));
    const toAdd = wanted.filter((id) => !existing.includes(id));

    if (toRemove.length > 0) {
      const { error } = await this.supabase
        .from('offer_hotels')
        .delete()
        .eq('offer_id', offerId)
        .in('hotel_id', toRemove);

      if (error) {
        throw new Error(`Failed to remove offer hotels: ${error.message}`);
      }
    }

    if (toAdd.length > 0) {
      const { error } = await this.supabase
        .from('offer_hotels')
        .insert(toAdd.map((hotel_id) => ({ offer_id: offerId, hotel_id })));

      if (error) {
        throw new Error(`Failed to add offer hotels: ${error.message}`);
      }
    }
  }

  // --- ADMIN-08: minimal public exposure of BaseRepository, mirrors
  // DestinationRepository's ADMIN-06 section. softDelete is false for
  // this table (as at construction above), so deleteOffer() is a hard
  // delete via the base delete(), same as Destination/PackageRepository.
  // offer_hotels rows are removed automatically (ON DELETE CASCADE). ---

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
