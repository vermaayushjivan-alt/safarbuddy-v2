// src/lib/repositories/coupon.repository.ts
// COUPON-01 — Discount Coupons.

import { BaseRepository } from './base.repository';
import { SupabaseClientType, DatabaseRecord } from './types';

export type CouponDiscountType = 'percentage' | 'flat';
export type CouponScope = 'global' | 'vendor';

export interface CouponRecord extends DatabaseRecord {
  id: string;
  code: string;
  description: string | null;
  discount_type: CouponDiscountType;
  discount_value: number;
  max_discount_amount: number | null;
  min_booking_amount: number | null;
  scope: CouponScope;
  vendor_id: string | null;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
  created_by: string | null;
  updated_by: string | null;
}

export interface CouponWithVendorName extends CouponRecord {
  vendor: { vendor_name: string } | null;
}

export class CouponRepository extends BaseRepository<CouponRecord> {
  constructor(supabase: SupabaseClientType) {
    super(supabase, {
      tableName: 'coupons',
      softDelete: true,
      softDeleteColumn: 'deleted_at',
    });
  }

  async createCoupon(
    data: Parameters<BaseRepository<CouponRecord>['create']>[0]
  ): Promise<CouponRecord> {
    return this.create(data);
  }

  async updateCoupon(
    id: string,
    data: Parameters<BaseRepository<CouponRecord>['update']>[1]
  ): Promise<CouponRecord> {
    return this.update(id, data);
  }

  async getCouponById(id: string): Promise<CouponRecord | null> {
    return this.findById(id);
  }

  // Case-insensitive — matches the coupons_code_unique index (which is
  // built on upper(code)).
  async getCouponByCode(code: string): Promise<CouponRecord | null> {
    const { data, error } = await this.supabase
      .from('coupons')
      .select('*')
      .ilike('code', code.trim())
      .is('deleted_at', null)
      .maybeSingle();

    if (error) {
      console.error('[coupons] getCouponByCode failed', error);
      throw error;
    }

    return (data as CouponRecord) ?? null;
  }

  async getAllCouponsAdmin(
    page: number = 1,
    limit: number = 20
  ): Promise<{
    data: CouponWithVendorName[];
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  }> {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(Math.max(1, limit), 100);
    const from = (safePage - 1) * safeLimit;
    const to = from + safeLimit - 1;

    const { data, error, count } = await this.supabase
      .from('coupons')
      .select('*, vendor:vendors(vendor_name)', { count: 'exact' })
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('[coupons] getAllCouponsAdmin failed', error);
      throw error;
    }

    const total = count ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / safeLimit));

    return {
      data: (data ?? []) as CouponWithVendorName[],
      total,
      totalPages,
      hasNext: safePage < totalPages,
      hasPrev: safePage > 1,
    };
  }

  // Count of bookings that used this coupon — informational only
  // (no usage limit is enforced, per explicit product decision), shown
  // on the admin list so the coupon's actual usage is still visible.
  async getUsageCount(couponId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('coupon_id', couponId)
      .is('deleted_at', null);

    if (error) {
      console.error('[coupons] getUsageCount failed', error);
      throw error;
    }

    return count ?? 0;
  }
}

