// src/lib/coupons/coupon-discount.ts
// COUPON-01 — Discount Coupons.
//
// Pure calculation only — no DB access here. Coupon lookup and
// eligibility checks (active, date window, scope, minimum amount) live
// in coupon.repository.ts / coupon.actions.ts, which call this once
// they already have a CouponRecord to apply.

export interface CouponForDiscount {
  discount_type: 'percentage' | 'flat';
  discount_value: number;
  max_discount_amount: number | null;
}

/**
 * Computes the rupee discount a coupon gives on a given subtotal.
 * Always leaves at least ₹1 payable — a coupon can never bring the
 * charged amount to ₹0 or below (Cashfree requires a positive order
 * amount, and a fully-free booking is a separate, unbuilt feature).
 */
export function computeCouponDiscount(
  coupon: CouponForDiscount,
  subtotal: number
): number {
  let discount =
    coupon.discount_type === 'percentage'
      ? subtotal * (coupon.discount_value / 100)
      : coupon.discount_value;

  if (coupon.max_discount_amount != null) {
    discount = Math.min(discount, coupon.max_discount_amount);
  }

  // Never let the discount reach or exceed the subtotal.
  discount = Math.min(discount, subtotal - 1);

  discount = Math.max(0, discount);

  return Math.round(discount * 100) / 100;
}

