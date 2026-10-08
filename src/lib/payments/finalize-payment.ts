// ROOT PATH: src/lib/payments/finalize-payment.ts
// GOLIVE-03 — the "a payment is really successful" logic, shared by the
// Cashfree webhook (route.ts) and the reconciliation job (reconcile.ts).
//
// MOVED, NOT REWRITTEN: runAfterResponse, confirmBookingForSuccessfulPayment
// and the success-claim block are the GOLIVE-02 code that lived inside the
// webhook route, moved here so the cron job cannot drift from the webhook
// (RULE 1). Route files may not export helpers in Next.js, hence a lib file.
// Behaviour is unchanged; the GOLIVE-02 scenario tests still cover it.

import { after } from "next/server";
import {
  PaymentRepository,
  type PaymentRecord,
  type PaymentStatus,
} from "@/lib/repositories/payment.repository";
import { BookingRepository } from "@/lib/repositories/booking.repository";
import { computeCommissionSplit } from "@/lib/payments/commission";
import { runPostConfirmationSideEffects } from "@/lib/payments/post-payment";
import { flagRefundDueIfPaid } from "@/lib/payments/refund";
import type { SupabaseClientType } from "@/lib/repositories/types";

// States from which a payment may still move to "success". A FAILED or
// CANCELLED attempt must NOT block a later successful attempt (GOLIVE-02 P1).
export const CAN_BECOME_SUCCESS: PaymentStatus[] = ["pending", "failed", "cancelled"];

// True when the amount / currency Cashfree reports does not match what we
// stored when the order was created.
export function paymentAmountMismatch(
  payment: PaymentRecord,
  receivedAmount: number | null,
  receivedCurrency: string | null
): boolean {
  const storedAmount = Number(payment.amount);
  const storedCurrency = String(payment.currency_code || "").toUpperCase();
  const amountMismatch =
    receivedAmount === null ||
    !Number.isFinite(receivedAmount) ||
    Math.abs(receivedAmount - storedAmount) > 0.001;
  const currencyMismatch =
    receivedCurrency === null || receivedCurrency.toUpperCase() !== storedCurrency;
  return amountMismatch || currencyMismatch;
}

// Runs `fn` after the response has been sent. If after() is unavailable for
// any reason, falls back to running it inline so the work is never lost.
export async function runAfterResponse(label: string, fn: () => Promise<void>) {
  const safe = async () => {
    try {
      await fn();
    } catch (error) {
      // RULE 38 — never swallow silently.
      console.error(`[payments] background task failed: ${label}`, error);
      // TODO: alerting — post-payment side effects (email / invoice) failed.
    }
  };

  try {
    after(safe);
  } catch {
    await safe();
  }
}

// Atomic claim: exactly one caller flips the row to "success". Returns the
// payment as it now stands in the database (status "success"), or null if it
// could not be moved there. Whether this call won the claim or lost it to a
// concurrent webhook / cron run, the caller then runs the idempotent
// confirmBookingForSuccessfulPayment.
//
// PAY-04: the commission split is computed once, here, from the stored
// (verified) payment amount. Snapshot only — never recalculated later.
export async function claimPaymentSuccess(
  supabase: SupabaseClientType,
  payment: PaymentRecord,
  input: {
    gatewayPaymentId: string | null;
    rawStatus: string;
    paymentMethod?: string | null;
  }
): Promise<PaymentRecord | null> {
  const paymentRepo = new PaymentRepository(supabase);
  const commissionSplit = computeCommissionSplit(Number(payment.amount));

  const claimed = await paymentRepo.transitionPaymentStatus(
    payment.id,
    CAN_BECOME_SUCCESS,
    {
      status: "success",
      gateway_payment_id: input.gatewayPaymentId ?? undefined,
      gateway_payment_status: input.rawStatus,
      payment_method: input.paymentMethod ?? undefined,
      failure_reason: null,
      completed_at: new Date().toISOString(),
      platform_commission_amount: commissionSplit.platformCommissionAmount,
      vendor_payout_amount: commissionSplit.vendorPayoutAmount,
    }
  );

  const latest = claimed ?? (await paymentRepo.getPaymentByOrderId(payment.gateway_order_id));

  if (!latest || latest.status !== "success") {
    console.error(
      `[payments] success claim for payment ${payment.id} did not stick (status now ${latest?.status ?? "missing"})`
    );
    return null;
  }

  return latest;
}

// Idempotent: confirms the booking behind a SUCCESSFUL payment if (and only
// if) it is still pending, then schedules the one-time side effects.
//   - returns normally when the booking is confirmed (now or earlier) or
//     cannot be confirmed for a non-retryable reason (logged);
//   - THROWS on a database error, so the caller answers 500 (webhook) or
//     counts an error (cron) and the work is retried — safe to repeat (P2).
export async function confirmBookingForSuccessfulPayment(
  supabase: SupabaseClientType,
  payment: PaymentRecord
): Promise<void> {
  const bookingRepo = new BookingRepository(supabase);

  const confirmed = await bookingRepo.confirmBookingIfPending(payment.booking_id);

  if (confirmed) {
    await runAfterResponse(`post-payment side effects for booking ${confirmed.id}`, () =>
      runPostConfirmationSideEffects(supabase, payment, confirmed)
    );
    return;
  }

  // Not transitioned by this call. Either it was confirmed earlier (normal
  // duplicate / retry — nothing to do) or it is in a state that needs a human.
  const booking = await bookingRepo.getBookingById(payment.booking_id);

  if (!booking) {
    console.error(
      `[payments] payment ${payment.id} succeeded but booking ${payment.booking_id} was not found`
    );
    // TODO: alerting — money received for a missing booking.
    return;
  }

  if (booking.status !== "confirmed" && booking.status !== "completed") {
    console.error(
      `[payments] payment ${payment.id} succeeded but booking ${booking.id} is "${booking.status}" — REFUND OR MANUAL REVIEW NEEDED`
    );
    // TODO: alerting — customer paid for a booking that is not payable (e.g. cancelled).
    // GOLIVE-07: put it in the admin "refund due" list (never refunds by itself).
    await flagRefundDueIfPaid(supabase, booking.id);
  }
}
