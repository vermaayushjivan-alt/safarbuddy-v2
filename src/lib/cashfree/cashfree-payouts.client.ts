
// src/lib/cashfree/cashfree-payouts.client.ts
// VENDOR-02 — Cashfree Payouts beneficiary creation — INERT STUB.
//
// This is a DIFFERENT Cashfree product from cashfree.client.ts (Payment
// Gateway, PAY-01/02). Payouts uses its own credential pair and its own
// API base URL/contract, neither of which has been provided yet. Per
// RULE 13 (never invent an unverified API contract), this file does not
// call the real Cashfree Payouts API — it exists purely so
// vendor-payout.actions.ts has something to call, and so the eventual
// real implementation is a single-file change with no callers touched.
//
// When Payout credentials are available: implement the real
// beneficiary-creation POST call here (this function's signature/return
// type must not change without updating its one caller), add the new
// env vars to .env.example + serverEnvSchema (RULE 29), and nothing in
// vendor-payout.actions.ts needs to change.

import 'server-only';

export interface CreateCashfreeBeneficiaryInput {
  vendorId: string;
  bankAccountNumber: string | null;
  bankIfsc: string | null;
  upiId: string | null;
}

export type CreateCashfreeBeneficiaryResult =
  | { success: true; beneficiaryId: string }
  | { success: false; error: string };

export async function createCashfreeBeneficiary(
  _input: CreateCashfreeBeneficiaryInput
): Promise<CreateCashfreeBeneficiaryResult> {
  return {
    success: false,
    error:
      'Cashfree Payouts is not configured yet — Payout API credentials have not been added (separate from the Payment Gateway credentials used for PAY-01/02).',
  };
}
