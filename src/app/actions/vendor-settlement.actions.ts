'use server';

// PAY-04 — Manual Settlement Tracking.
//
// Admin logs a manual payout to a vendor (bank/UPI transfer sent
// outside the app) as a "settlement", generating a receipt the vendor
// can see on their own dashboard. Due amount = sum of
// payments.vendor_payout_amount for the vendor's successful bookings,
// minus the sum of settlements already logged for them. See RULE 15
// audit in migration 013 / commission.ts for the full design reasoning.
//
// Schema defined inline here, matching vendor-payout.actions.ts's own
// convention (this repo has no src/lib/validations/ directory — see
// that file's header comment).

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/session';
import { requireVendorContext } from '@/lib/auth/vendor-context';
import { PaymentRepository } from '@/lib/repositories/payment.repository';
import { VendorRepository, type VendorRecord } from '@/lib/repositories/vendor.repository';
import {
  VendorSettlementRepository,
  type VendorSettlementRecord,
} from '@/lib/repositories/vendor-settlement.repository';
import { runAction, emptyToNull, type ActionResult } from '@/lib/actions/action-result';

export interface VendorDueSummary {
  vendor: VendorRecord;
  totalEarned: number;
  totalSettled: number;
  due: number;
}

async function buildDueSummary(
  vendor: VendorRecord,
  paymentRepo: PaymentRepository,
  settlementRepo: VendorSettlementRepository
): Promise<VendorDueSummary> {
  const [totalEarned, totalSettled] = await Promise.all([
    paymentRepo.getSuccessfulVendorPayoutTotal(vendor.id),
    settlementRepo.getTotalSettledForVendor(vendor.id),
  ]);

  return {
    vendor,
    totalEarned,
    totalSettled,
    due: Math.round((totalEarned - totalSettled) * 100) / 100,
  };
}

// --- Admin: due summary across all vendors ---
// Loops per-vendor rather than a single aggregate query — fine at the
// current/expected scale (tens of hotels, per RULE 15 note in migration
// 013). Revisit with a real SQL view if vendor count grows a lot.
export async function getAllVendorDueSummariesAdmin(
  page: number = 1,
  limit: number = 20
): Promise<{
  data: VendorDueSummary[];
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}> {
  await requireRole(['admin', 'super_admin']);

  const supabase = await createClient();
  const vendorRepo = new VendorRepository(supabase);
  const paymentRepo = new PaymentRepository(supabase);
  const settlementRepo = new VendorSettlementRepository(supabase);

  const vendorPage = await vendorRepo.getAllVendors(page, limit);

  const data = await Promise.all(
    vendorPage.data.map((vendor) => buildDueSummary(vendor, paymentRepo, settlementRepo))
  );

  return { ...vendorPage, data };
}

// --- Admin: one vendor's due summary + settlement history ---
export async function getVendorDueSummaryAdmin(vendorId: string): Promise<VendorDueSummary> {
  await requireRole(['admin', 'super_admin']);

  const supabase = await createClient();
  const vendorRepo = new VendorRepository(supabase);
  const paymentRepo = new PaymentRepository(supabase);
  const settlementRepo = new VendorSettlementRepository(supabase);

  const vendor = await vendorRepo.getVendorById(vendorId);

  if (!vendor) {
    throw new Error('Vendor not found.');
  }

  return buildDueSummary(vendor, paymentRepo, settlementRepo);
}

export async function getSettlementsByVendorAdmin(
  vendorId: string,
  page: number = 1,
  limit: number = 20
) {
  await requireRole(['admin', 'super_admin']);
  const supabase = await createClient();
  const repo = new VendorSettlementRepository(supabase);
  return repo.getSettlementsByVendorId(vendorId, page, limit);
}

// --- Admin: log a manual payout ---
const markSettlementPaidSchema = z.object({
  vendor_id: z.string().uuid(),
  amount: z.coerce.number().positive('Enter an amount greater than 0.'),
  reference_note: z.preprocess(emptyToNull, z.string().max(500).nullable().optional()),
  paid_at: z.preprocess(emptyToNull, z.string().nullable().optional()),
});

export type MarkSettlementPaidInput = z.infer<typeof markSettlementPaidSchema>;

export async function markSettlementPaidAdmin(
  input: MarkSettlementPaidInput
): Promise<ActionResult<VendorSettlementRecord>> {
  return runAction(async () => {
    const current = await requireRole(['admin', 'super_admin']);
    const parsed = markSettlementPaidSchema.parse(input);

    const supabase = await createClient();
    const vendorRepo = new VendorRepository(supabase);
    const paymentRepo = new PaymentRepository(supabase);
    const settlementRepo = new VendorSettlementRepository(supabase);

    const vendor = await vendorRepo.getVendorById(parsed.vendor_id);

    if (!vendor) {
      throw new Error('Vendor not found.');
    }

    // Guard against logging more than is actually owed — a fixed
    // 20%-commission due amount is the only source of truth here, so
    // an admin cannot accidentally record a payout larger than what
    // the vendor has actually earned.
    const summary = await buildDueSummary(vendor, paymentRepo, settlementRepo);

    if (parsed.amount > summary.due + 0.01) {
      throw new Error(
        `Amount exceeds what's due (₹${summary.due.toFixed(2)} pending for this vendor).`
      );
    }

    return settlementRepo.createSettlement({
      vendor_id: parsed.vendor_id,
      amount: parsed.amount,
      reference_note: parsed.reference_note ?? null,
      paid_at: parsed.paid_at ?? new Date().toISOString(),
      created_by: current.id,
    });
  });
}

// --- Vendor/hotel owner: their own receipt history ---
export async function getMyReceivedPayments(
  page: number = 1,
  limit: number = 20
): Promise<{
  data: VendorSettlementRecord[];
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}> {
  const { vendor } = await requireVendorContext();
  const supabase = await createClient();
  const repo = new VendorSettlementRepository(supabase);
  return repo.getSettlementsByVendorId(vendor.id, page, limit);
}
