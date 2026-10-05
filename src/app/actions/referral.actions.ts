'use server';

// REFERRAL-01 — Refer & Earn: data for the signed-in user's /referral
// page. Read-only apart from lazily creating the user's own code.
// Identity always comes from the server session, never from client input.

import { getAuthUser, resolvePublicUserId } from '@/lib/auth/session';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { CouponRepository } from '@/lib/repositories/coupon.repository';
import { ReferralRepository } from '@/lib/repositories/referral.repository';
import { ensureReferralCode } from '@/lib/referrals/referral-service';
import { REFERRAL_CONFIG } from '@/lib/referrals/referral-config';

export interface MyReferralCoupon {
  code: string;
  discountPercent: number;
  maxDiscountAmount: number | null;
  validUntil: string | null;
  used: boolean;
  expired: boolean;
}

export interface MyReferralInfo {
  code: string;
  friendsJoined: number;
  friendsRewarded: number;
  coupons: MyReferralCoupon[];
  referrerPercent: number;
  friendPercent: number;
}

export async function getMyReferralInfo(): Promise<MyReferralInfo | null> {
  const authUser = await getAuthUser();
  if (!authUser) return null;

  const supabase = createServiceRoleClient();
  const userId = await resolvePublicUserId(supabase, authUser.id);

  const code = await ensureReferralCode(supabase, userId);

  const couponRepo = new CouponRepository(supabase);
  const [counts, owned] = await Promise.all([
    new ReferralRepository(supabase).countByReferrer(userId),
    couponRepo.getOwnedCoupons(userId),
  ]);

  const redeemedIds = await couponRepo.getRedeemedCouponIds(
    owned.map((c) => c.id)
  );

  const now = Date.now();

  const coupons: MyReferralCoupon[] = owned.map((c) => ({
    code: c.code,
    discountPercent: Number(c.discount_value),
    maxDiscountAmount:
      c.max_discount_amount != null ? Number(c.max_discount_amount) : null,
    validUntil: c.valid_until,
    used: redeemedIds.has(c.id),
    expired: c.valid_until ? new Date(c.valid_until).getTime() < now : false,
  }));

  return {
    code,
    friendsJoined: counts.total,
    friendsRewarded: counts.rewarded,
    coupons,
    referrerPercent: REFERRAL_CONFIG.REFERRER_DISCOUNT_PERCENT,
    friendPercent: REFERRAL_CONFIG.FRIEND_DISCOUNT_PERCENT,
  };
}
