import { BaseRepository } from './base.repository';
import { SupabaseClientType, DatabaseRecord } from './types';

export const PROMOTION_SLOT_VALUES = [
  'after_hero',
  'between_destinations_trending',
  'between_packages_testimonials',
] as const;

export type PromotionSlot = (typeof PROMOTION_SLOT_VALUES)[number];

export interface PromotionRecord extends DatabaseRecord {
  id: string;
  hotel_id: string | null;
  company_name: string;
  logo_image: string | null;
  click_url: string;
  slot_position: PromotionSlot;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  click_count: number;
  impression_count: number;
}

export class PromotionRepository extends BaseRepository<PromotionRecord> {
  constructor(supabase: SupabaseClientType) {
    super(supabase, {
      tableName: 'promotions',
      softDelete: false,
    });
  }

  // PROMO-01: public homepage read, one slot at a time.
  //
  // Deliberately NOT built on BaseRepository.findMany()'s generic
  // filter list — start_date/end_date are nullable ("no start date"
  // means "always started"), which needs "column IS NULL OR column
  // <= today" per column. That's an OR-of-ANDs Postgrest's simple
  // eq/gte/lte filter chain can't express directly, and the RLS
  // policy on this table already enforces the same is_active +
  // date-range rule server-side — so the extra JS-side date filter
  // below is a defense-in-depth/ordering step, not the only guard.
  async getActivePromotionsForSlot(
    slot: PromotionSlot
  ): Promise<PromotionRecord[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('slot_position', slot)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    const today = new Date().toISOString().slice(0, 10);

    return ((data ?? []) as PromotionRecord[]).filter((row) => {
      const afterStart = !row.start_date || row.start_date <= today;
      const beforeEnd = !row.end_date || row.end_date >= today;
      return afterStart && beforeEnd;
    });
  }

  async incrementImpression(id: string): Promise<void> {
    const { error } = await this.supabase.rpc(
      'increment_promotion_impression',
      { promo_id: id }
    );
    if (error) {
      throw error;
    }
  }

  async incrementClick(id: string): Promise<void> {
    const { error } = await this.supabase.rpc('increment_promotion_click', {
      promo_id: id,
    });
    if (error) {
      throw error;
    }
  }

  // --- Admin CRUD — mirrors OfferRepository (ADMIN-08) exactly. ---

  async getAllPromotions(page: number = 1, limit: number = 20) {
    return this.findWithPagination({
      sort: { column: 'created_at', ascending: false },
      pagination: { page, limit },
    });
  }

  async getPromotionById(id: string): Promise<PromotionRecord | null> {
    return this.findById(id);
  }

  async createPromotion(
    data: Parameters<BaseRepository<PromotionRecord>['create']>[0]
  ) {
    return this.create(data);
  }

  async updatePromotion(
    id: string,
    data: Parameters<BaseRepository<PromotionRecord>['update']>[1]
  ) {
    return this.update(id, data);
  }

  async deletePromotion(id: string): Promise<boolean> {
    return this.delete(id);
  }
}

