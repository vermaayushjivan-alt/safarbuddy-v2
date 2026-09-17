'use server';

// COUPON-01 — Discount Coupons.
//
// Admin CRUD follows the same shape as vendor-settlement.actions.ts
// (schema defined inline, no src/lib/validations/ directory in this
// repo). The public/checkout validation path (validateCouponPublic,
// resolveCouponForBooking) always reads via createServiceRoleClient()
// rather than the session client — this must work identically for a
// guest checkout (no session at all, see BOOKING-03) and a signed-in
// customer, and coupons carries no per-row ownership for RLS to check
// against anyway (same reasoning as property-listing.actions.ts's
// self-service submission).
//
// Admin actions use createClient() (the session client), matching the
// existing convention in vendor-payout.actions.ts / vendor-settlement
// .actions.ts for tables with RLS enabled but no policy defined. That
// convention is followed here for consistency rather than re-decided
// in this milestone — see this session's CHANGELOG entry for the
// open question it shares with those two.

import { z } from 'zod';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/session';
import { CouponRepository, type CouponRecord, type CouponWithVendorName } from '@/lib/repositories/coupon.repository';
import { computeCouponDiscount } from '@/lib/coupons/coupon-discount';
import { runAction, emptyToNull, type ActionResult } from '@/lib/actions/action-result';

// -----------------------------------------------------------------------
// Admin CRUD
// -----------------------------------------------------------------------

const couponSchema = z.object({
  code: z.string().trim().min(3).max(40),
  description: z.preprocess(emptyToNull, z.string().max(500).nullable().optional()),
  discount_type: z.enum(['percentage', 'flat']),
  discount_value: z.coerce.number().positive('Enter a discount value greater than 0.'),
  max_discount_amount: z.preprocess(
    emptyToNull,
    z.coerce.number().positive().nullable().optional()
  ),
  min_booking_amount: z.preprocess(
    emptyToNull,
    z.coerce.number().positive().nullable().optional()
  ),
  scope: z.enum(['global', 'vendor']),
  vendor_id: z.preprocess(emptyToNull, z.string().uuid().nullable().optional()),
  valid_from: z.preprocess(emptyToNull, z.string().nullable().optional()),
  valid_until: z.preprocess(emptyToNull, z.string().nullable().optional()),
  is_active: z.coerce.boolean().default(true),
});

export type CouponInput = z.infer<typeof couponSchema>;

function assertScopeVendorPair(parsed: CouponInput) {
  if (parsed.scope === 'vendor' && !parsed.vendor_id) {
    throw new Error('Select a vendor for a vendor-scoped coupon.');
  }
  if (parsed.scope === 'global' && parsed.vendor_id) {
    throw new Error('A global coupon cannot have a vendor attached.');
  }
}

export async function createCouponAdmin(
  input: CouponInput
): Promise<ActionResult<CouponRecord>> {
  return runAction(async () => {
    const current = await requireRole(['admin', 'super_admin']);
    const parsed = couponSchema.parse(input);
    assertScopeVendorPair(parsed);

    const supabase = await createClient();
    const repo = new CouponRepository(supabase);

    const existing = await repo.getCouponByCode(parsed.code);
    if (existing) {
      throw new Error(`Coupon code "${parsed.code.toUpperCase()}" already exists.`);
    }

    return repo.createCoupon({
      code: parsed.code.toUpperCase(),
      description: parsed.description ?? null,
      discount_type: parsed.discount_type,
      discount_value: parsed.discount_value,
      max_discount_amount: parsed.max_discount_amount ?? null,
      min_booking_amount: parsed.min_booking_amount ?? null,
      scope: parsed.scope,
      vendor_id: parsed.vendor_id ?? null,
      valid_from: parsed.valid_from ?? null,
      valid_until: parsed.valid_until ?? null,
      is_active: parsed.is_active,
      created_by: current.id,
      updated_by: current.id,
    });
  });
}

export async function updateCouponAdmin(
  id: string,
  input: CouponInput
): Promise<ActionResult<CouponRecord>> {
  return runAction(async () => {
    const current = await requireRole(['admin', 'super_admin']);
    const parsed = couponSchema.parse(input);
    assertScopeVendorPair(parsed);

    const supabase = await createClient();
    const repo = new CouponRepository(supabase);

    const existing = await repo.getCouponByCode(parsed.code);
    if (existing && existing.id !== id) {
      throw new Error(`Coupon code "${parsed.code.toUpperCase()}" already exists.`);
    }

    return repo.updateCoupon(id, {
      code: parsed.code.toUpperCase(),
      description: parsed.description ?? null,
      discount_type: parsed.discount_type,
      discount_value: parsed.discount_value,
      max_discount_amount: parsed.max_discount_amount ?? null,
      min_booking_amount: parsed.min_booking_amount ?? null,
      scope: parsed.scope,
      vendor_id: parsed.vendor_id ?? null,
      valid_from: parsed.valid_from ?? null,
      valid_until: parsed.valid_until ?? null,
      is_active: parsed.is_active,
      updated_by: current.id,
    });
  });
}

export async function setCouponActiveAdmin(
  id: string,
  isActive: boolean
): Promise<ActionResult<CouponRecord>> {
  return runAction(async () => {
    const current = await requireRole(['admin', 'super_admin']);
    const supabase = await createClient();
    const repo = new CouponRepository(supabase);
    return repo.updateCoupon(id, { is_active: isActive, updated_by: current.id });
  });
}

export async function getCouponByIdAdmin(id: string): Promise<CouponRecord | null> {
  await requireRole(['admin', 'super_admin']);
  const supabase = await createClient();
  const repo = new CouponRepository(supabase);
  return repo.getCouponById(id);
}

export async function getAllCouponsAdmin(
  page: number = 1,
  limit: number = 20
): Promise<{
  data: (CouponWithVendorName & { usageCount: number })[];
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}> {
  await requireRole(['admin', 'super_admin']);
  const supabase = await createClient();
  const repo = new CouponRepository(supabase);

  const page_ = await repo.getAllCouponsAdmin(page, limit);
  const data = await Promise.all(
    page_.data.map(async (coupon) => ({
      ...coupon,
      usageCount: await repo.getUsageCount(coupon.id),
    }))
  );

  return { ...page_, data };
}

// -----------------------------------------------------------------------
// Checkout-facing validation
// -----------------------------------------------------------------------

export interface CouponValidationSuccess {
  valid: true;
  couponId: string;
  code: string;
  discountAmount: number;
}

export interface CouponValidationFailure {
  valid: false;
  reason: string;
}

export type CouponValidationResult = CouponValidationSuccess | CouponValidationFailure;

// Shared by validateCouponPublic (checkout preview) and
// booking.actions.ts's createBooking (the actual, authoritative
// discount applied to price_snapshot). Not a Server Action itself —
// a plain function, safe to import and call directly from another
// server module, so createBooking() never has to trust a
// client-supplied discount amount; it always re-derives this from
// scratch using its own server-resolved subtotal.
export async function resolveCouponForBooking(input: {
  code: string;
  vendorId: string | null;
  subtotal: number;
}): Promise<CouponValidationResult> {
  const code = input.code.trim();

  if (!code) {
    return { valid: false, reason: 'Enter a coupon code.' };
  }

  const supabase = createServiceRoleClient();
  const repo = new CouponRepository(supabase);
  const coupon = await repo.getCouponByCode(code);

  if (!coupon) {
    return { valid: false, reason: 'Invalid coupon code.' };
  }

  if (!coupon.is_active) {
    return { valid: false, reason: 'This coupon is no longer active.' };
  }

  const now = new Date();

  if (coupon.valid_from && new Date(coupon.valid_from) > now) {
    return { valid: false, reason: 'This coupon is not active yet.' };
  }

  if (coupon.valid_until && new Date(coupon.valid_until) < now) {
    return { valid: false, reason: 'This coupon has expired.' };
  }

  if (coupon.scope === 'vendor' && coupon.vendor_id !== input.vendorId) {
    return { valid: false, reason: 'This coupon is not valid for this hotel or package.' };
  }

  if (coupon.min_booking_amount != null && input.subtotal < coupon.min_booking_amount) {
    return {
      valid: false,
      reason: `This coupon needs a minimum booking amount of ₹${coupon.min_booking_amount}.`,
    };
  }

  const discountAmount = computeCouponDiscount(coupon, input.subtotal);

  return {
    valid: true,
    couponId: coupon.id,
    code: coupon.code,
    discountAmount,
  };
}

// Client-facing preview action for the checkout page's "Apply Coupon"
// button. IMPORTANT: subtotal here comes from the client (the price
// already displayed on the booking page), so this result is a preview
// only — createBooking() always recomputes the discount server-side
// against its own resolved price before actually charging anything, so
// a spoofed subtotal here can at most produce a misleading preview
// message, never an incorrect charge.
export async function validateCouponPublic(input: {
  code: string;
  vendorId: string | null;
  subtotal: number;
}): Promise<CouponValidationResult> {
  return resolveCouponForBooking(input);
}

