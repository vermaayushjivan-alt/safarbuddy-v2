// src/lib/referrals/referral-service.ts
// REFERRAL-01 — Refer & Earn business logic.
//
// Plain server module (not a Server Action) so it can be called from
// registerAction (signup) and from the Cashfree webhook route (first
// paid booking). Same placement precedent as src/lib/invoices/
// generate-invoice.ts: logic that is triggered from a route handler
// lives under src/lib, the repositories below stay data-only (RULE 3).
//
// Every function takes an already-created SERVICE-ROLE Supabase client:
// referral_codes / referrals / coupons have RLS enabled with no policy.

import type { SupabaseClient } from '@supabase/supabase-js';
import { randomInt } from 'crypto';
import { z } from 'zod';
import { resolvePublicUserId } from '@/lib/auth/session';
import {
  ReferralCodeRepository,
  ReferralRepository,
} from '@/lib/repositories/referral.repository';
import { CouponRepository } from '@/lib/repositories/coupon.repository';
import { REFERRAL_CONFIG } from '@/lib/referrals/referral-config';

// No 0/O/1/I/L — codes get read aloud and typed on phones.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function randomChars(length: number): string {
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return out;
}

const referralCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]{4,16}$/);

/** Returns the cleaned code, or null if it is empty/malformed. */
export function normalizeReferralCode(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const parsed = referralCodeSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

// -----------------------------------------------------------------------
// A user's own referral code (created lazily the first time it is needed)
// -----------------------------------------------------------------------

export async function ensureReferralCode(
  supabase: SupabaseClient,
  publicUserId: string
): Promise<string> {
  const repo = new ReferralCodeRepository(supabase);

  const existing = await repo.getByUserId(publicUserId);
  if (existing) return existing.code;

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const created = await repo.tryCreate(publicUserId, `SB${randomChars(6)}`);
    if (created) return created.code;

    // Insert refused by a unique index: either a code collision (retry)
    // or a parallel request already created this user's code (re-read).
    const raced = await repo.getByUserId(publicUserId);
    if (raced) return raced.code;
  }

  throw new Error('Could not generate a referral code. Please try again.');
}

// -----------------------------------------------------------------------
// Reward coupon issuing — an ordinary coupons row, personal + single use
// -----------------------------------------------------------------------

async function issueRewardCoupon(
  supabase: SupabaseClient,
  input: {
    ownerUserId: string;
    percent: number;
    maxDiscountInr: number;
    description: string;
  }
): Promise<string> {
  const repo = new CouponRepository(supabase);

  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + REFERRAL_CONFIG.COUPON_VALID_DAYS);

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const code = `${REFERRAL_CONFIG.COUPON_CODE_PREFIX}-${randomChars(6)}`;

    if (await repo.getCouponByCode(code)) continue;

    // Same field set createCouponAdmin() already writes in production,
    // plus the two REFERRAL-01 columns.
    const coupon = await repo.createCoupon({
      code,
      description: input.description,
      discount_type: 'percentage',
      discount_value: input.percent,
      max_discount_amount: input.maxDiscountInr,
      min_booking_amount: null,
      scope: 'global',
      vendor_id: null,
      valid_from: null,
      valid_until: validUntil.toISOString(),
      is_active: true,
      owner_user_id: input.ownerUserId,
      is_single_use: true,
      created_by: null,
      updated_by: null,
    });

    return coupon.id;
  }

  throw new Error('Could not generate a unique reward coupon code.');
}

// -----------------------------------------------------------------------
// Signup: link the new friend to the referrer and give the friend coupon
// -----------------------------------------------------------------------

export type RecordSignupResult =
  | { recorded: true }
  | { recorded: false; reason: string };

/**
 * Called right after a successful email signup that carried ?ref=CODE.
 * Never throws for "normal" rejections (unknown code, self-referral,
 * already referred) — it returns a reason instead. The caller must
 * still wrap it in try/catch: a referral problem must never block signup.
 */
export async function recordReferralSignup(
  supabase: SupabaseClient,
  input: { authUserId: string; code: string }
): Promise<RecordSignupResult> {
  const code = normalizeReferralCode(input.code);
  if (!code) return { recorded: false, reason: 'invalid_code' };

  const codeRepo = new ReferralCodeRepository(supabase);
  const referralRepo = new ReferralRepository(supabase);

  const owner = await codeRepo.getByCode(code);
  if (!owner) return { recorded: false, reason: 'unknown_code' };

  const referredUserId = await resolvePublicUserId(supabase, input.authUserId);

  if (owner.user_id === referredUserId) {
    return { recorded: false, reason: 'self_referral' };
  }

  const referral = await referralRepo.tryCreate({
    referrer_user_id: owner.user_id,
    referred_user_id: referredUserId,
    referral_code: owner.code,
  });

  if (!referral) return { recorded: false, reason: 'already_referred' };

  const friendCouponId = await issueRewardCoupon(supabase, {
    ownerUserId: referredUserId,
    percent: REFERRAL_CONFIG.FRIEND_DISCOUNT_PERCENT,
    maxDiscountInr: REFERRAL_CONFIG.FRIEND_MAX_DISCOUNT_INR,
    description: 'Welcome coupon — you joined SafarBuddy via a friend’s referral.',
  });

  await referralRepo.setFriendCoupon(referral.id, friendCouponId);

  return { recorded: true };
}

// -----------------------------------------------------------------------
// First paid booking: reward the referrer
// -----------------------------------------------------------------------

/**
 * Called from the Cashfree webhook right after a booking flips
 * pending -> confirmed. That block runs once per booking, and
 * claimReward() is an atomic signed_up -> rewarded flip, so the
 * referrer is rewarded for the friend's FIRST confirmed paid booking
 * only, even under duplicate/concurrent webhooks.
 *
 * Guest bookings (no customerId) can never be referral bookings.
 * Never throws — the payment and booking are already recorded; a
 * referral failure must not make Cashfree retry the webhook. Failures
 * are logged loudly (RULE 38/39).
 */
export async function grantReferralRewardForPaidBooking(
  supabase: SupabaseClient,
  booking: { id: string; customerId: string | null }
): Promise<void> {
  if (!booking.customerId) return;

  const referralRepo = new ReferralRepository(supabase);
  let claimedId: string | null = null;

  try {
    const referral = await referralRepo.getByReferredUserId(booking.customerId);
    if (!referral || referral.status !== 'signed_up') return;

    const claimed = await referralRepo.claimReward(referral.id, booking.id);
    if (!claimed) return; // another webhook got there first
    claimedId = claimed.id;

    const referrerCouponId = await issueRewardCoupon(supabase, {
      ownerUserId: claimed.referrer_user_id,
      percent: REFERRAL_CONFIG.REFERRER_DISCOUNT_PERCENT,
      maxDiscountInr: REFERRAL_CONFIG.REFERRER_MAX_DISCOUNT_INR,
      description: 'Referral reward — your friend completed their first booking.',
    });

    await referralRepo.setReferrerCoupon(claimed.id, referrerCouponId);
  } catch (error) {
    console.error(
      '[referrals] reward failed for booking',
      booking.id,
      error
    );

    // Coupon never got issued: release the claim so the friend's next
    // paid booking can retry, instead of silently losing the reward.
    if (claimedId) {
      try {
        await referralRepo.revertClaim(claimedId);
      } catch (revertError) {
        console.error(
          '[referrals] CRITICAL: could not revert claim',
          claimedId,
          revertError
        );
      }
    }
  }
}
