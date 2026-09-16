
// src/lib/payments/commission.ts
// PAY-04 — Manual Settlement Tracking.
//
// Fixed platform commission rate, explicit product decision (2026-09-17):
// 20% flat for every vendor/hotel, no per-vendor override. This is the
// ONLY place that rate is encoded — payments.platform_commission_amount
// and payments.vendor_payout_amount (see migration 013) are both
// computed by calling this function, once, at payment-success time.
//
// If a variable or per-vendor rate is ever needed, that is a new RULE 15
// audit (DEVELOPMENT_BIBLE.md), not a silent edit here.

export const PLATFORM_COMMISSION_RATE = 0.2;

export interface CommissionSplit {
  platformCommissionAmount: number;
  vendorPayoutAmount: number;
}

/**
 * Splits a successful payment amount into the platform's commission and
 * the amount owed to the vendor. Rounds to paise (2 decimal places) so
 * the two halves always sum back to the original amount.
 */
export function computeCommissionSplit(amount: number): CommissionSplit {
  const platformCommissionAmount =
    Math.round(amount * PLATFORM_COMMISSION_RATE * 100) / 100;

  const vendorPayoutAmount =
    Math.round((amount - platformCommissionAmount) * 100) / 100;

  return { platformCommissionAmount, vendorPayoutAmount };
}
