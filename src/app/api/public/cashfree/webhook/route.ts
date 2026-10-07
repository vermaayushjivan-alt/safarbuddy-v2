// src/app/api/public/cashfree/webhook/route.ts
// PAY-02 — Cashfree webhook -> public.payments -> booking confirmation.
//
// GOLIVE-02 — rewritten as an explicit state machine. It fixes three
// defects that could leave a customer charged with an unconfirmed booking:
//
//   P1  Cashfree sends one webhook per payment ATTEMPT. FAILED / USER_DROPPED
//       followed by a SUCCESS on the same order used to be ignored, because
//       "failed" was treated as final. Now only SUCCESS and the refund states
//       are final; a later SUCCESS overrides failed / cancelled.
//   P2  The payment was written "success" first and the booking confirmed
//       second. If the confirm threw, Cashfree's retry hit the early
//       "already success" return and the booking stayed pending for ever.
//       Now every webhook for an already-successful payment re-runs the
//       (idempotent) booking confirmation, so a retry heals it.
//   RACE  Two concurrent webhooks could both pass a read-then-write check.
//       Status changes are now ONE conditional UPDATE (transitionPaymentStatus)
//       and the booking is confirmed by ONE conditional UPDATE
//       (confirmBookingIfPending); only the call that wins runs side effects.
//
// Emails, invoice PDF and referral reward moved to
// src/lib/payments/post-payment.ts and run AFTER the 200 response via
// next/server `after()`, so Cashfree is not kept waiting on SMTP / PDF.
//
// DELIBERATELY NOT DONE: a strict x-webhook-timestamp freshness window.
// Cashfree's retry behaviour (does a retry carry a fresh timestamp?) is not
// confirmed, and a wrong window would reject legitimate retries after an
// outage. Replay is harmless here anyway: signature + amount check +
// idempotent transitions. Revisit once confirmed against Cashfree docs.

import { after, NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { verifyWebhookSignature } from "@/lib/cashfree/cashfree.client";
import {
  PaymentRepository,
  type PaymentRecord,
  type PaymentStatus,
} from "@/lib/repositories/payment.repository";
import { BookingRepository } from "@/lib/repositories/booking.repository";
import { computeCommissionSplit } from "@/lib/payments/commission";
import { runPostConfirmationSideEffects } from "@/lib/payments/post-payment";
import type { SupabaseClientType } from "@/lib/repositories/types";

export const runtime = "nodejs";
// Confirming a booking is quick now; this only guards the DB work and the
// background side effects (after()) against the platform default.
export const maxDuration = 30;

const CF_STATUS_MAP: Record<
  string,
  "pending" | "success" | "failed" | "cancelled"
> = {
  SUCCESS: "success",
  PENDING: "pending",
  FAILED: "failed",
  USER_DROPPED: "failed",
  CANCELLED: "cancelled",
  // FLAGGED (fraud/manual review) has no dedicated terminal value in
  // the live `payments_status_check` constraint. Mapped to "pending"
  // (not terminal) so a later webhook resolving the review to
  // SUCCESS/FAILED can still update the row. The raw "FLAGGED" value
  // is preserved in `gateway_payment_status` for admin/audit visibility.
  FLAGGED: "pending",
};

// States from which a payment may still move to "success". A FAILED or
// CANCELLED attempt must NOT block a later successful attempt (P1).
const CAN_BECOME_SUCCESS: PaymentStatus[] = ["pending", "failed", "cancelled"];

function ok() {
  return NextResponse.json({ success: true }, { status: 200 });
}

function badRequest(reason: string) {
  console.warn(`[Cashfree Webhook] ${reason}`);
  return NextResponse.json({ error: "Bad request" }, { status: 400 });
}

function serverError() {
  return NextResponse.json({ error: "Internal error" }, { status: 500 });
}

// Runs `fn` after the response has been sent. If after() is unavailable for
// any reason, falls back to running it inline so the work is never lost.
async function runAfterResponse(label: string, fn: () => Promise<void>) {
  const safe = async () => {
    try {
      await fn();
    } catch (error) {
      // RULE 38 — never swallow silently.
      console.error(`[Cashfree Webhook] background task failed: ${label}`, error);
      // TODO: alerting — post-payment side effects (email / invoice) failed.
    }
  };

  try {
    after(safe);
  } catch {
    await safe();
  }
}

// Idempotent: confirms the booking behind a SUCCESSFUL payment if (and only
// if) it is still pending, then schedules the one-time side effects.
//   - returns normally when the booking is confirmed (now or earlier) or
//     cannot be confirmed for a non-retryable reason (logged);
//   - THROWS on a database error, so the caller answers 500 and Cashfree
//     retries — and the retry works because this is safe to repeat (P2).
async function confirmBookingForSuccessfulPayment(
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
      `[Cashfree Webhook] payment ${payment.id} succeeded but booking ${payment.booking_id} was not found`
    );
    // TODO: alerting — money received for a missing booking.
    return;
  }

  if (booking.status !== "confirmed" && booking.status !== "completed") {
    console.error(
      `[Cashfree Webhook] payment ${payment.id} succeeded but booking ${booking.id} is "${booking.status}" — REFUND OR MANUAL REVIEW NEEDED`
    );
    // TODO: alerting — customer paid for a booking that is not payable (e.g. cancelled).
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let rawBody: string;

  try {
    rawBody = await request.text();
  } catch {
    return badRequest("Failed to read request body");
  }

  const timestamp = request.headers.get("x-webhook-timestamp");
  const signature = request.headers.get("x-webhook-signature");

  if (!timestamp || !signature) {
    return badRequest("Missing webhook headers");
  }

  if (!verifyWebhookSignature(timestamp, rawBody, signature)) {
    return badRequest("Invalid signature");
  }

  let payload: Record<string, unknown>;

  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return badRequest("Invalid JSON payload");
  }

  const data = payload.data as Record<string, unknown> | undefined;
  const order = data?.order as Record<string, unknown> | undefined;
  const paymentData = data?.payment as Record<string, unknown> | undefined;

  if (!order || !paymentData) {
    return ok();
  }

  const merchantOrderId = order.order_id;
  const rawStatus = paymentData.payment_status;
  const cfPaymentId = paymentData.cf_payment_id;
  const paymentAmount = paymentData.payment_amount;
  const paymentCurrency = paymentData.payment_currency;
  const paymentMethod = paymentData.payment_group;
  const paymentMessage = paymentData.payment_message;

  if (typeof merchantOrderId !== "string" || !merchantOrderId) {
    return badRequest("Missing order_id in payload");
  }

  if (typeof rawStatus !== "string" || !rawStatus) {
    return badRequest("Missing payment_status in payload");
  }

  const mappedStatus = CF_STATUS_MAP[rawStatus];

  if (!mappedStatus) {
    // Unknown Cashfree statuses are acknowledged but never acted upon.
    return ok();
  }

  // Cashfree may send cf_payment_id as a string or a number.
  const gatewayPaymentId =
    typeof cfPaymentId === "string" && cfPaymentId
      ? cfPaymentId
      : typeof cfPaymentId === "number"
        ? String(cfPaymentId)
        : null;

  let supabase: SupabaseClientType;

  try {
    // Webhooks have no user cookie. Service-role access is used only after
    // the Cashfree signature has been verified above.
    supabase = createServiceRoleClient();
  } catch {
    return serverError();
  }

  const paymentRepo = new PaymentRepository(supabase);

  let payment: PaymentRecord | null;

  try {
    payment = await paymentRepo.getPaymentByOrderId(merchantOrderId);
  } catch (error) {
    console.error("[Cashfree Webhook] Payment lookup failed", error);
    return serverError();
  }

  if (!payment) {
    console.error(
      `[Cashfree Webhook] No payment found for gateway_order_id=${merchantOrderId} (status ${rawStatus})`
    );
    // TODO: alerting — a webhook for an order we have no record of. Since
    // GOLIVE-01 the row is written before the order exists, so this should
    // not happen for orders created by this app.
    return ok();
  }

  // Refunded states are final and never touched by a payment webhook.
  if (payment.status === "refunded" || payment.status === "partially_refunded") {
    return ok();
  }

  try {
    // ---- Already successful: duplicate / retried webhook -----------------
    if (payment.status === "success") {
      if (
        mappedStatus === "success" &&
        gatewayPaymentId &&
        payment.gateway_payment_id &&
        gatewayPaymentId !== payment.gateway_payment_id
      ) {
        console.error(
          `[Cashfree Webhook] SECOND successful payment ${gatewayPaymentId} for order ${merchantOrderId} (first: ${payment.gateway_payment_id}) — customer paid twice, REFUND NEEDED`
        );
        // TODO: alerting — double payment on one order.
      }

      // Heal (P2): the booking may still be pending if an earlier webhook
      // wrote the payment but failed before confirming it. Safe to repeat.
      await confirmBookingForSuccessfulPayment(supabase, payment);
      return ok();
    }

    // ---- Not a success event ---------------------------------------------
    if (mappedStatus !== "success") {
      // failed / cancelled are only ever set from "pending", never from
      // another terminal-ish state, and never over a success.
      if (payment.status !== "pending") {
        return ok();
      }

      await paymentRepo.transitionPaymentStatus(payment.id, ["pending"], {
        status: mappedStatus,
        gateway_payment_id: gatewayPaymentId ?? undefined,
        gateway_payment_status: rawStatus,
        payment_method:
          typeof paymentMethod === "string" ? paymentMethod : undefined,
        failure_reason:
          mappedStatus === "failed" || mappedStatus === "cancelled"
            ? typeof paymentMessage === "string"
              ? paymentMessage
              : `Cashfree payment status: ${rawStatus}`
            : null,
        completed_at:
          mappedStatus === "failed" || mappedStatus === "cancelled"
            ? new Date().toISOString()
            : null,
      });

      return ok();
    }

    // ---- SUCCESS event on a payment that is not yet successful -----------
    const storedAmount = Number(payment.amount);
    const receivedAmount =
      typeof paymentAmount === "number"
        ? paymentAmount
        : typeof paymentAmount === "string"
          ? Number(paymentAmount)
          : null;
    const storedCurrency = String(payment.currency_code || "").toUpperCase();
    const receivedCurrency =
      typeof paymentCurrency === "string" ? paymentCurrency.toUpperCase() : null;

    const amountMismatch =
      receivedAmount === null ||
      !Number.isFinite(receivedAmount) ||
      Math.abs(receivedAmount - storedAmount) > 0.001;
    const currencyMismatch =
      receivedCurrency === null || receivedCurrency !== storedCurrency;

    if (amountMismatch || currencyMismatch) {
      console.error(
        `[Cashfree Webhook] Payment mismatch: payment=${payment.id}, ` +
          `stored=${storedAmount} ${storedCurrency}, ` +
          `received=${receivedAmount} ${receivedCurrency}`
      );
      // TODO: alerting — Cashfree reports a success for a different amount.

      await paymentRepo.transitionPaymentStatus(payment.id, CAN_BECOME_SUCCESS, {
        status: "failed",
        gateway_payment_id: gatewayPaymentId,
        gateway_payment_status: rawStatus,
        payment_method:
          typeof paymentMethod === "string" ? paymentMethod : null,
        failure_reason: "Amount or currency mismatch in Cashfree webhook.",
        completed_at: new Date().toISOString(),
      });

      return ok();
    }

    // PAY-04 — Manual Settlement Tracking. Commission split is computed
    // once, here, from the verified payment amount. Snapshot only: never
    // recalculated if the platform commission rate changes later.
    const commissionSplit = computeCommissionSplit(storedAmount);

    // Atomic claim: exactly one webhook flips the row to "success".
    const claimed = await paymentRepo.transitionPaymentStatus(
      payment.id,
      CAN_BECOME_SUCCESS,
      {
        status: "success",
        gateway_payment_id: gatewayPaymentId ?? undefined,
        gateway_payment_status: rawStatus,
        payment_method:
          typeof paymentMethod === "string" ? paymentMethod : undefined,
        failure_reason: null,
        completed_at: new Date().toISOString(),
        platform_commission_amount: commissionSplit.platformCommissionAmount,
        vendor_payout_amount: commissionSplit.vendorPayoutAmount,
      }
    );

    // Whether we won the claim or lost it to a concurrent webhook, the
    // payment is now "success". Run the idempotent confirmation either way
    // so the booking is never left pending (only one caller will run the
    // side effects; the other gets null from confirmBookingIfPending).
    const latest = claimed ?? (await paymentRepo.getPaymentByOrderId(merchantOrderId));

    if (!latest || latest.status !== "success") {
      console.error(
        `[Cashfree Webhook] success claim for payment ${payment.id} did not stick (status now ${latest?.status ?? "missing"})`
      );
      return serverError();
    }

    await confirmBookingForSuccessfulPayment(supabase, latest);

    return ok();
  } catch (error) {
    console.error(
      `[Cashfree Webhook] processing failed for order ${merchantOrderId}`,
      error
    );
    // TODO: alerting — webhook handler threw; Cashfree will retry.
    // 500 is safe: every step above is idempotent, so the retry resumes.
    return serverError();
  }
}
