// src/lib/referrals/referral-config.ts
// REFERRAL-01 — Refer & Earn: single place for every tunable number.
//
// The owner chose "percentage discount coupon (e.g. 10% off)" for both
// sides. The exact percentages, rupee cap and validity below are
// STARTING DEFAULTS (not yet confirmed by the owner) — change them here
// only; nothing else in the codebase hard-codes them.

export const REFERRAL_CONFIG = {
  // Coupon the referrer receives after the friend's first paid booking.
  REFERRER_DISCOUNT_PERCENT: 10,
  REFERRER_MAX_DISCOUNT_INR: 1000,

  // Coupon the new friend receives right after signing up with a code.
  FRIEND_DISCOUNT_PERCENT: 10,
  FRIEND_MAX_DISCOUNT_INR: 1000,

  // Days a reward coupon stays valid after it is issued.
  COUPON_VALID_DAYS: 90,

  // Prefix on generated reward coupon codes (e.g. REF-K7M2QX).
  COUPON_CODE_PREFIX: 'REF',
} as const;
