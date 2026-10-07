// ROOT PATH: src/lib/payments/reconcile.ts
// GOLIVE-03 — payment reconciliation: the safety net for a Cashfree webhook
// that never arrives, arrives broken, or arrives while our database is down.
//
// Run every few minutes by /api/public/cron/reconcile-payments. Two jobs:
//
//   A. "Pending" payments that are old enough to have had a webhook: ask
//      Cashfree what really happened to the order.
//        PAID                -> verify amount + currency, then do exactly
//                               what the webhook does (claim success, confirm
//                               the booking, send the one-time emails).
//        EXPIRED/TERMINATED  -> close the payment as failed (it can no
//                               longer be paid).
//        anything else       -> still payable, leave it alone.
//        lookup failed       -> leave it alone, try next run.
//   B. "Success" payments whose booking is still "pending" (the GOLIVE-02 P2
//      case: payment recorded, confirmation failed) -> run the idempotent
//      confirmation again.
//
// Safe to run concurrently with the webhook and with itself: every state
// change is a conditional UPDATE and the confirmation is idempotent, so the
// worst case is a harmless no-op. Individual failures are counted and
// logged, never allowed to stop the rest of the run (RULE 38).

import { PAYMENT } from "@/lib/config/constants";
import { getCashfreeOrderDetails } from "@/lib/cashfree/cashfree.client";
import { PaymentRepository } from "@/lib/repositories/payment.repository";
import { BookingRepository } from "@/lib/repositories/booking.repository";
import type { SupabaseClientType } from "@/lib/repositories/types";
import {
  CAN_BECOME_SUCCESS,
  claimPaymentSuccess,
  confirmBookingForSuccessfulPayment,
  paymentAmountMismatch,
} from "@/lib/payments/finalize-payment";

const MAX_PENDING_PER_RUN = 50;
const MAX_SUCCESS_PER_RUN = 200;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface ReconcileSummary {
  pendingChecked: number;
  recoveredPaid: number;
  closedExpired: number;
  stillActive: number;
  lookupFailed: number;
  amountMismatch: number;
  unconfirmedHealed: number;
  errors: number;
}

export async function reconcilePayments(
  supabase: SupabaseClientType,
  now: Date = new Date()
): Promise<ReconcileSummary> {
  const paymentRepo = new PaymentRepository(supabase);
  const bookingRepo = new BookingRepository(supabase);

  const summary: ReconcileSummary = {
    pendingChecked: 0,
    recoveredPaid: 0,
    closedExpired: 0,
    stillActive: 0,
    lookupFailed: 0,
    amountMismatch: 0,
    unconfirmedHealed: 0,
    errors: 0,
  };

  // ---- Job A: stale pending payments -----------------------------------
  try {
    const olderThan = new Date(
      now.getTime() - PAYMENT.RECONCILE_MIN_AGE_MINUTES * 60_000
    ).toISOString();
    const newerThan = new Date(
      now.getTime() - PAYMENT.RECONCILE_MAX_AGE_DAYS * DAY_MS
    ).toISOString();

    const stale = await paymentRepo.getStalePendingPayments(
      olderThan,
      newerThan,
      MAX_PENDING_PER_RUN
    );

    for (const payment of stale) {
      summary.pendingChecked++;

      try {
        const order = await getCashfreeOrderDetails(payment.gateway_order_id);

        if (!order) {
          summary.lookupFailed++;
          continue;
        }

        if (order.status === "PAID") {
          if (paymentAmountMismatch(payment, order.amount, order.currency)) {
            summary.amountMismatch++;
            console.error(
              `[reconcile] order ${payment.gateway_order_id} is PAID but amount/currency differ from payment ${payment.id} ` +
                `(stored ${payment.amount} ${payment.currency_code}, Cashfree ${order.amount} ${order.currency}) — NOT confirming`
            );
            // TODO: alerting — Cashfree says PAID for a different amount.
            await paymentRepo.transitionPaymentStatus(payment.id, CAN_BECOME_SUCCESS, {
              status: "failed",
              gateway_payment_status: "PAID",
              failure_reason: "Amount or currency mismatch found during reconciliation.",
              completed_at: now.toISOString(),
            });
            continue;
          }

          const latest = await claimPaymentSuccess(supabase, payment, {
            gatewayPaymentId: null, // the order lookup does not return it
            rawStatus: "PAID",
          });

          if (latest) {
            await confirmBookingForSuccessfulPayment(supabase, latest);
            summary.recoveredPaid++;
            console.error(
              `[reconcile] RECOVERED payment ${payment.id} (order ${payment.gateway_order_id}): Cashfree shows PAID but no webhook confirmed it`
            );
            // TODO: alerting — a webhook was lost; check Cashfree webhook delivery.
          }
          continue;
        }

        if (order.status === "EXPIRED" || order.status === "TERMINATED") {
          const closed = await paymentRepo.transitionPaymentStatus(payment.id, ["pending"], {
            status: "failed",
            gateway_payment_status: order.status,
            failure_reason: `Cashfree order ${order.status.toLowerCase()} without payment.`,
            completed_at: now.toISOString(),
          });
          if (closed) summary.closedExpired++;
          continue;
        }

        summary.stillActive++;
      } catch (error) {
        summary.errors++;
        console.error(
          `[reconcile] failed for payment ${payment.id} (order ${payment.gateway_order_id})`,
          error
        );
        // TODO: alerting — reconciliation error for a pending payment.
      }
    }
  } catch (error) {
    summary.errors++;
    console.error("[reconcile] job A (pending payments) failed", error);
    // TODO: alerting — reconciliation job A could not run.
  }

  // ---- Job B: successful payments whose booking is still pending -------
  try {
    const since = new Date(
      now.getTime() - PAYMENT.RECONCILE_SUCCESS_LOOKBACK_DAYS * DAY_MS
    ).toISOString();

    const recent = await paymentRepo.getRecentSuccessfulPayments(since, MAX_SUCCESS_PER_RUN);
    const pendingIds = await bookingRepo.getPendingBookingIds(
      recent.map((p) => p.booking_id)
    );

    for (const payment of recent) {
      if (!pendingIds.has(payment.booking_id)) continue;

      try {
        await confirmBookingForSuccessfulPayment(supabase, payment);
        summary.unconfirmedHealed++;
        console.error(
          `[reconcile] HEALED booking ${payment.booking_id}: payment ${payment.id} was successful but the booking was still pending`
        );
        // TODO: alerting — a paid booking was left unconfirmed; investigate why.
      } catch (error) {
        summary.errors++;
        console.error(
          `[reconcile] could not confirm booking ${payment.booking_id} for payment ${payment.id}`,
          error
        );
        // TODO: alerting — paid booking could not be confirmed.
      }
    }
  } catch (error) {
    summary.errors++;
    console.error("[reconcile] job B (unconfirmed bookings) failed", error);
    // TODO: alerting — reconciliation job B could not run.
  }

  return summary;
}
