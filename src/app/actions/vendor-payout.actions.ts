'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/session';
import {
  VendorPayoutRepository,
  VendorPayoutDetailsRecord,
} from '@/lib/repositories/vendor-payout.repository';
import { runAction, emptyToNull, type ActionResult } from '@/lib/actions/action-result';

// --- VENDOR-02: Hotel Owner Payout KYC Capture ---
// Admin-managed, same as ADMIN-09 vendor CRUD — src/app/vendor/ currently
// has only a role-guard layout and no owner-facing page (see
// PROJECT_STATUS.md "Role-Based Dashboard Pages"), so self-service
// capture is out of scope here per RULE 11 (one milestone at a time).
// Cashfree beneficiary creation itself is not called from here yet — see
// cashfree-payouts.client.ts's inert-stub notes.
//
// Schema defined inline here, matching vendor.actions.ts's actual
// convention — this repo has no src/lib/validations/ directory despite
// PROJECT_STATUS.md's ADMIN-10 entry referencing one; that claim was not
// followed for consistency here (RULE 13 — don't build on an unconfirmed
// path).

// IFSC: 4 letters (bank code) + 0 + 6 alphanumeric (branch code) — the
// standard RBI format. UPI: handle@bank, loosely checked since providers
// vary widely.
const IFSC_PATTERN = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const UPI_PATTERN = /^[\w.+-]{2,256}@[a-zA-Z]{2,64}$/;

const vendorPayoutInputSchema = z
  .object({
    bank_account_number: z.preprocess(
      emptyToNull,
      z.string().min(4).max(34).nullable().optional()
    ),
    bank_ifsc: z.preprocess(
      emptyToNull,
      z
        .string()
        .regex(IFSC_PATTERN, 'Enter a valid IFSC code (e.g. HDFC0001234)')
        .nullable()
        .optional()
    ),
    upi_id: z.preprocess(
      emptyToNull,
      z
        .string()
        .regex(UPI_PATTERN, 'Enter a valid UPI ID (e.g. name@bank)')
        .nullable()
        .optional()
    ),
  })
  .refine(
    (data) => (data.bank_account_number && data.bank_ifsc) || data.upi_id,
    {
      message: 'Provide either a bank account number + IFSC, or a UPI ID.',
    }
  );

export type VendorPayoutInput = z.infer<typeof vendorPayoutInputSchema>;

export async function getVendorPayoutDetailsAdmin(
  vendorId: string
): Promise<VendorPayoutDetailsRecord | null> {
  await requireRole(['admin', 'super_admin']);
  const supabase = await createClient();
  const repo = new VendorPayoutRepository(supabase);
  return repo.getByVendorId(vendorId);
}

export async function upsertVendorPayoutDetailsAdmin(
  vendorId: string,
  input: VendorPayoutInput
): Promise<ActionResult<VendorPayoutDetailsRecord>> {
  return runAction(async () => {
    await requireRole(['admin', 'super_admin']);
    const parsed = vendorPayoutInputSchema.parse(input);
    const supabase = await createClient();
    const repo = new VendorPayoutRepository(supabase);
    return repo.upsertForVendor(vendorId, parsed);
  });
}

