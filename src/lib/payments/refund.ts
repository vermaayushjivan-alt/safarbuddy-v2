// ROOT PATH: src/lib/payments/refund.ts
// GOLIVE-07 — refund service. Admin-initiated only (owner decision D4): no
// function here is ever called automatically with an amount; the cron only
// SYNCS refunds an admin already requested.
//
// Money safety (RULE 22):
//   * The refund row is written BEFORE Cashfree is called, with our own
//     refund_id, so a crash/timeout can never lead to a second refund.
//   * Over-refunding is blocked in SQL under a row lock (create_refund_request).
//   * Every state change goes through finalize_refund, which is idempotent:
//     webhook, sync job and the request path can race and only one applies.
//   * "I don't know" (timeout / 5xx) is NEVER treated as "failed": the row
//     stays pending and the sync job looks it up by refund_id.
//
// Callers must already have checked the admin role (see the server action).

import { randomUUID } from "crypto";
import {
  createCashfreeRefund,
  getCashfreeRefund,
} from "@/lib/cashfree/cashfree.client";
import { PaymentRepository } from "@/lib/repositories/payment.repository";
import { BookingRepository } from "@/lib/repositories/booking.repository";
import {
  PaymentRefundRepository,
  RefundRequestError,
  type PaymentRefundRecord,
} from "@/lib/repositories/payment-refund.repository";
import {
  buildRefundId,
  isValidRefundAmount,
  roundToPaise,
  mapCashfreeRefundStatus,
  type RefundStatus,
} from "@/lib/payments/refund-status";
import { notifyCustomerRefundProcessed } from "@/lib/notifications/refund-email";
import type { SupabaseClientType } from "@/lib/repositories/types";

// A refund request that Cashfree has no record of after this long never
// reached Cashfree (the POST was lost), so it is closed and the admin can retry.
export const REFUND_LOST_AFTER_MINUTES = 15;
// The sync job leaves brand-new refunds to the webhook for this long.
export const REFUND_SYNC_MIN_AGE_MINUTES = 2;
export const REFUND_SYNC_BATCH = 50;

export type RequestRefundOutcome =
  | "success" // Cashfree already reports it processed
  | "pending" // accepted by Cashfree, final result by webhook / sync
  | "rejected" // Cashfree refused; nothing was refunded
  | "unknown"; // no answer; may exist at Cashfree; sync job will resolve

export interface RequestRefundResult {
  outcome: RequestRefundOutcome;
  refund: PaymentRefundRecord;
  message?: string;
}

export async function requestRefund(
  supabase: SupabaseClientType,
  input: {
    paymentId: string;
    amount: number;
    reason: string;
    requestedBy: string | null;
  }
): Promise<RequestRefundResult> {
  if (!isValidRefundAmount(input.amount)) {
    throw new RefundRequestError("INVALID_AMOUNT");
  }

  const amount = roundToPaise(input.amount);

  const refundRepo = new PaymentRefundRepository(supabase);
  const paymentRepo = new PaymentRepository(supabase);

  const payment = await paymentRepo.getPaymentById(input.paymentId);
  if (!payment) throw new RefundRequestError("PAYMENT_NOT_FOUND");

  // 1. Reserve the amount (SQL, row-locked) and write the pending row.
  const row = await refundRepo.createRefundRequest({
    paymentId: input.paymentId,
    amount,
    reason: input.reason,
    requestedBy: input.requestedBy,
    refundId: buildRefundId(randomUUID()),
  });

  // 2. Ask Cashfree.
  const result = await createCashfreeRefund({
    orderId: payment.gateway_order_id,
    refundId: row.refund_id,
    amount: row.amount,
    note: input.reason,
  });

  if (!result.ok) {
    if (result.kind === "rejected") {
      const closed = await refundRepo.finalizeRefund({
        refundRowId: row.id,
        newStatus: "failed",
        cfRefundId: null,
        gatewayStatus: "REJECTED",
        message: result.message,
      });
      return {
        outcome: "rejected",
        refund: { ...row, status: closed.finalStatus, gateway_message: result.message },
        message: result.message,
      };
    }
    // unknown (or not_found, which POST never returns): leave it pending.
    return {
      outcome: "unknown",
      refund: row,
      message:
        "Cashfree did not confirm the refund. It will be checked automatically; do not retry.",
    };
  }

  return applyCashfreeRefundUpdate(supabase, row, {
    cfRefundId: result.refund.cf_refund_id,
    rawStatus: result.refund.refund_status,
    message: result.refund.status_description,
  });
}

// Shared by the request path, the webhook and the sync job.
export async function applyCashfreeRefundUpdate(
  supabase: SupabaseClientType,
  row: PaymentRefundRecord,
  update: {
    cfRefundId: string | null;
    rawStatus: string;
    message: string | null;
  }
): Promise<RequestRefundResult> {
  const refundRepo = new PaymentRefundRepository(supabase);
  const mapped: RefundStatus = mapCashfreeRefundStatus(update.rawStatus);

  if (mapped === "pending") {
    await refundRepo.attachCashfreeIds(row.id, update.cfRefundId, update.rawStatus);
    return {
      outcome: "pending",
      refund: {
        ...row,
        cf_refund_id: update.cfRefundId ?? row.cf_refund_id,
        gateway_status: update.rawStatus,
      },
    };
  }

  const done = await refundRepo.finalizeRefund({
    refundRowId: row.id,
    newStatus: mapped,
    cfRefundId: update.cfRefundId,
    gatewayStatus: update.rawStatus,
    message: update.message,
  });

  // GOLIVE-07b: tell the customer, once. `applied` is true only for the call
  // that really moved the refund to "success" (webhook/sync/request can race).
  // The email function never throws.
  if (done.applied && done.finalStatus === "success") {
    await notifyCustomerRefundProcessed(supabase, {
      bookingId: row.booking_id,
      amount: Number(row.amount),
      currencyCode: row.currency_code,
      refundId: row.refund_id,
    });
  }

  return {
    outcome: done.finalStatus === "success" ? "success" : "rejected",
    refund: {
      ...row,
      status: done.finalStatus,
      cf_refund_id: update.cfRefundId ?? row.cf_refund_id,
      gateway_status: update.rawStatus,
    },
    message: update.message ?? undefined,
  };
}

export interface RefundSyncSummary {
  checked: number;
  finalized: number;
  stillPending: number;
  lost: number;
  errors: number;
}

// Cron safety net: resolves refunds whose webhook never arrived, and refunds
// whose request timed out. Per-refund failures are counted and logged, never
// stop the run (RULE 38).
export async function syncPendingRefunds(
  supabase: SupabaseClientType,
  now: Date = new Date()
): Promise<RefundSyncSummary> {
  const summary: RefundSyncSummary = {
    checked: 0,
    finalized: 0,
    stillPending: 0,
    lost: 0,
    errors: 0,
  };

  try {
    const refundRepo = new PaymentRefundRepository(supabase);
    const paymentRepo = new PaymentRepository(supabase);

    const olderThan = new Date(
      now.getTime() - REFUND_SYNC_MIN_AGE_MINUTES * 60_000
    ).toISOString();
    const rows = await refundRepo.getPendingOlderThan(olderThan, REFUND_SYNC_BATCH);

    for (const row of rows) {
      summary.checked++;
      try {
        const payment = await paymentRepo.getPaymentById(row.payment_id);
        if (!payment) {
          summary.errors++;
          console.error(`[refund-sync] payment ${row.payment_id} missing for refund ${row.id}`);
          continue;
        }

        const found = await getCashfreeRefund({
          orderId: payment.gateway_order_id,
          refundId: row.refund_id,
        });

        if (found.ok) {
          const applied = await applyCashfreeRefundUpdate(supabase, row, {
            cfRefundId: found.refund.cf_refund_id,
            rawStatus: found.refund.refund_status,
            message: found.refund.status_description,
          });
          if (applied.outcome === "pending") summary.stillPending++;
          else summary.finalized++;
          continue;
        }

        if (found.kind === "not_found") {
          const ageMin = (now.getTime() - new Date(row.requested_at).getTime()) / 60_000;
          if (ageMin >= REFUND_LOST_AFTER_MINUTES) {
            await refundRepo.finalizeRefund({
              refundRowId: row.id,
              newStatus: "failed",
              cfRefundId: null,
              gatewayStatus: "NOT_FOUND",
              message: "Cashfree has no record of this refund request. Safe to retry.",
            });
            summary.lost++;
          } else {
            summary.stillPending++;
          }
          continue;
        }

        summary.stillPending++; // unknown: ask again next run
      } catch (error) {
        summary.errors++;
        console.error(`[refund-sync] failed for refund ${row.id}`, error);
        // TODO: alerting (GOLIVE-18).
      }
    }
  } catch (error) {
    summary.errors++;
    console.error("[refund-sync] run failed", error);
    // TODO: alerting (GOLIVE-18).
  }

  return summary;
}

// Marks a CANCELLED booking "refund due" when the customer actually paid, so
// the admin sees it. Never refunds anything by itself (D4). Never throws.
export async function flagRefundDueIfPaid(
  supabase: SupabaseClientType,
  bookingId: string
): Promise<boolean> {
  try {
    const payments = await new PaymentRepository(supabase).getPaymentsByBookingId(bookingId);
    const paid = payments.some(
      (p) => p.status === "success" || p.status === "partially_refunded"
    );
    if (!paid) return false;

    await new BookingRepository(supabase).markRefundDue(bookingId);
    return true;
  } catch (error) {
    console.error("[refunds] flagRefundDueIfPaid failed — MANUAL CHECK", {
      bookingId,
      error,
    });
    // TODO: alerting (GOLIVE-18). A missed flag hides a refund from the admin.
    return false;
  }
}

// REFUND_STATUS_WEBHOOK (already signature-verified by the route).
// Payload: data.refund { cf_refund_id, refund_id, refund_status, status_description }.
// Refunds we have no row for (a refund made by hand in the Cashfree dashboard,
// or an AUTO-REFUND for a failed payment) are logged and acknowledged — they
// never touch our payments or settlement figures.
// THROWS on a database error so the route answers 500 and Cashfree retries;
// every step is idempotent (finalize_refund), so a retry is safe.
export async function handleRefundWebhook(
  supabase: SupabaseClientType,
  refund: Record<string, unknown>
): Promise<void> {
  const refundId = refund["refund_id"];
  const rawStatus = refund["refund_status"];

  if (typeof refundId !== "string" || !refundId || typeof rawStatus !== "string") {
    console.warn("[refund-webhook] ignored: no refund_id/refund_status (auto-refund?)");
    return;
  }

  const refundRepo = new PaymentRefundRepository(supabase);
  const row = await refundRepo.getByRefundId(refundId);

  if (!row) {
    console.error(
      `[refund-webhook] refund ${refundId} is not in payment_refunds — NOT TRACKED (refund made outside the app?)`
    );
    // TODO: alerting — a refund we do not know about changed money.
    return;
  }

  const cf = refund["cf_refund_id"];
  const desc = refund["status_description"];

  await applyCashfreeRefundUpdate(supabase, row, {
    cfRefundId:
      typeof cf === "string" && cf ? cf : typeof cf === "number" ? String(cf) : null,
    rawStatus,
    message: typeof desc === "string" ? desc : null,
  });
}
