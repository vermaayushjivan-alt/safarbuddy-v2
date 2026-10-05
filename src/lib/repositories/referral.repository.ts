// src/lib/repositories/referral.repository.ts
// REFERRAL-01 — Refer & Earn. Data layer only (RULE 3).
//
// Tables: public.referral_codes, public.referrals — created by
// src/db/sql/028_referral01_referrals.sql. Both have RLS enabled with
// no policy, so callers must pass a createServiceRoleClient() instance.

import { BaseRepository } from './base.repository';
import { SupabaseClientType, DatabaseRecord } from './types';

export type ReferralStatus = 'signed_up' | 'rewarded';

export interface ReferralCodeRecord extends DatabaseRecord {
  id: string;
  user_id: string;
  code: string;
}

export interface ReferralRecord extends DatabaseRecord {
  id: string;
  referrer_user_id: string;
  referred_user_id: string;
  referral_code: string;
  status: ReferralStatus;
  friend_coupon_id: string | null;
  referrer_coupon_id: string | null;
  rewarded_booking_id: string | null;
  rewarded_at: string | null;
}

const POSTGRES_UNIQUE_VIOLATION = '23505';

export class ReferralCodeRepository extends BaseRepository<ReferralCodeRecord> {
  constructor(supabase: SupabaseClientType) {
    super(supabase, { tableName: 'referral_codes', softDelete: false });
  }

  async getByUserId(userId: string): Promise<ReferralCodeRecord | null> {
    const { data, error } = await this.supabase
      .from('referral_codes')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('[referrals] getByUserId failed', error);
      throw error;
    }
    return (data as ReferralCodeRecord) ?? null;
  }

  // Case-insensitive, matches referral_codes_code_unique (upper(code)).
  async getByCode(code: string): Promise<ReferralCodeRecord | null> {
    const { data, error } = await this.supabase
      .from('referral_codes')
      .select('*')
      .ilike('code', code.trim())
      .maybeSingle();

    if (error) {
      console.error('[referrals] getByCode failed', error);
      throw error;
    }
    return (data as ReferralCodeRecord) ?? null;
  }

  // Returns null (instead of throwing) when the unique index rejects
  // the insert, so the caller can retry with a fresh code or re-read.
  async tryCreate(
    userId: string,
    code: string
  ): Promise<ReferralCodeRecord | null> {
    const { data, error } = await this.supabase
      .from('referral_codes')
      .insert({ user_id: userId, code })
      .select()
      .single();

    if (error) {
      if (error.code === POSTGRES_UNIQUE_VIOLATION) return null;
      console.error('[referrals] tryCreate code failed', error);
      throw error;
    }
    return data as ReferralCodeRecord;
  }
}

export class ReferralRepository extends BaseRepository<ReferralRecord> {
  constructor(supabase: SupabaseClientType) {
    super(supabase, { tableName: 'referrals', softDelete: false });
  }

  async getByReferredUserId(userId: string): Promise<ReferralRecord | null> {
    const { data, error } = await this.supabase
      .from('referrals')
      .select('*')
      .eq('referred_user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('[referrals] getByReferredUserId failed', error);
      throw error;
    }
    return (data as ReferralRecord) ?? null;
  }

  // Returns null when this friend was already referred (unique index
  // on referred_user_id) — never creates a second referrer for them.
  async tryCreate(input: {
    referrer_user_id: string;
    referred_user_id: string;
    referral_code: string;
  }): Promise<ReferralRecord | null> {
    const { data, error } = await this.supabase
      .from('referrals')
      .insert(input)
      .select()
      .single();

    if (error) {
      if (error.code === POSTGRES_UNIQUE_VIOLATION) return null;
      console.error('[referrals] tryCreate referral failed', error);
      throw error;
    }
    return data as ReferralRecord;
  }

  async setFriendCoupon(id: string, couponId: string): Promise<void> {
    const { error } = await this.supabase
      .from('referrals')
      .update({ friend_coupon_id: couponId })
      .eq('id', id);

    if (error) {
      console.error('[referrals] setFriendCoupon failed', error);
      throw error;
    }
  }

  // Atomic claim: flips signed_up -> rewarded in ONE statement, so two
  // concurrent webhooks can never both reward the same friend. Returns
  // null when the row was not in 'signed_up' (already rewarded).
  async claimReward(
    id: string,
    bookingId: string
  ): Promise<ReferralRecord | null> {
    const { data, error } = await this.supabase
      .from('referrals')
      .update({
        status: 'rewarded',
        rewarded_booking_id: bookingId,
        rewarded_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('status', 'signed_up')
      .select()
      .maybeSingle();

    if (error) {
      console.error('[referrals] claimReward failed', error);
      throw error;
    }
    return (data as ReferralRecord) ?? null;
  }

  async setReferrerCoupon(id: string, couponId: string): Promise<void> {
    const { error } = await this.supabase
      .from('referrals')
      .update({ referrer_coupon_id: couponId })
      .eq('id', id);

    if (error) {
      console.error('[referrals] setReferrerCoupon failed', error);
      throw error;
    }
  }

  // Undo of claimReward — used only when issuing the reward coupon
  // failed right after the claim, so the NEXT paid booking can retry.
  async revertClaim(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('referrals')
      .update({
        status: 'signed_up',
        rewarded_booking_id: null,
        rewarded_at: null,
      })
      .eq('id', id);

    if (error) {
      console.error('[referrals] revertClaim failed', error);
      throw error;
    }
  }

  async countByReferrer(
    referrerUserId: string
  ): Promise<{ total: number; rewarded: number }> {
    const { data, error } = await this.supabase
      .from('referrals')
      .select('status')
      .eq('referrer_user_id', referrerUserId);

    if (error) {
      console.error('[referrals] countByReferrer failed', error);
      throw error;
    }

    const rows = (data ?? []) as { status: ReferralStatus }[];
    return {
      total: rows.length,
      rewarded: rows.filter((r) => r.status === 'rewarded').length,
    };
  }
}
