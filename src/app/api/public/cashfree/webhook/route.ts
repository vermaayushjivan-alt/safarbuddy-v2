// src/app/api/public/cashfree/webhook/route.ts
// PAY-02 — Cashfree webhook -> public.payments -> booking confirmation.

import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { verifyWebhookSignature } from "@/lib/cashfree/cashfree.client";
import { PaymentRepository } from "@/lib/repositories/payment.repository";
import { BookingRepository } from "@/lib/repositories/booking.repository";

export const runtime = "nodejs";

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

function ok() {
  return NextResponse.json(
    { success: true },
    { status: 200 }
  );
}

function badRequest(reason: string) {
  console.warn(
    `[Cashfree Webhook] ${reason}`
  );

  return NextResponse.json(
    { error: "Bad request" },
    { status: 400 }
  );
}

function serverError() {
  return NextResponse.json(
    { error: "Internal error" },
    { status: 500 }
  );
}

export async function POST(
  request: NextRequest
): Promise<NextResponse> {
  let rawBody: string;

  try {
    rawBody = await request.text();
  } catch {
    return badRequest(
      "Failed to read request body"
    );
  }

  const timestamp =
    request.headers.get(
      "x-webhook-timestamp"
    );

  const signature =
    request.headers.get(
      "x-webhook-signature"
    );

  if (!timestamp || !signature) {
    return badRequest(
      "Missing webhook headers"
    );
  }

  if (
    !verifyWebhookSignature(
      timestamp,
      rawBody,
      signature
    )
  ) {
    return badRequest(
      "Invalid signature"
    );
  }

  let payload: Record<string, unknown>;

  try {
    payload = JSON.parse(rawBody) as Record<
      string,
      unknown
    >;
  } catch {
    return badRequest(
      "Invalid JSON payload"
    );
  }

  const data =
    payload.data as
      | Record<string, unknown>
      | undefined;

  const order =
    data?.order as
      | Record<string, unknown>
      | undefined;

  const paymentData =
    data?.payment as
      | Record<string, unknown>
      | undefined;

  if (!order || !paymentData) {
    return ok();
  }

  const merchantOrderId =
    order.order_id;

  const rawStatus =
    paymentData.payment_status;

  const cfPaymentId =
    paymentData.cf_payment_id;

  const paymentAmount =
    paymentData.payment_amount;

  const paymentCurrency =
    paymentData.payment_currency;

  const paymentMethod =
    paymentData.payment_group;

  const paymentMessage =
    paymentData.payment_message;

  if (
    typeof merchantOrderId !== "string" ||
    !merchantOrderId
  ) {
    return badRequest(
      "Missing order_id in payload"
    );
  }

  if (
    typeof rawStatus !== "string" ||
    !rawStatus
  ) {
    return badRequest(
      "Missing payment_status in payload"
    );
  }

  const mappedStatus =
    CF_STATUS_MAP[rawStatus];

  if (!mappedStatus) {
    // Unknown Cashfree statuses are acknowledged
    // but never acted upon.
    return ok();
  }

  let supabase;

  try {
    // Webhooks have no user cookie. Service-role
    // access is used only after the Cashfree
    // signature has been verified above.
    supabase =
      createServiceRoleClient();
  } catch {
    return serverError();
  }

  const paymentRepo =
    new PaymentRepository(
      supabase
    );

  const bookingRepo =
    new BookingRepository(
      supabase
    );

  let payment;

  try {
    payment =
      await paymentRepo.getPaymentByOrderId(
        merchantOrderId
      );
  } catch (error) {
    console.error(
      "[Cashfree Webhook] Payment lookup failed",
      error
    );

    return serverError();
  }

  if (!payment) {
    console.warn(
      `[Cashfree Webhook] No payment found for gateway_order_id=${merchantOrderId}`
    );

    return ok();
  }

  // Terminal payment states are idempotent.
  // A duplicate webhook must never downgrade
  // a success/failed/cancelled/refunded payment.
  // "pending" is intentionally NOT terminal — both the initial
  // pre-payment state and a Cashfree FLAGGED (manual review) result
  // map to "pending", and a later webhook must still be able to
  // resolve either one.
  if (
    payment.status === "success" ||
    payment.status === "failed" ||
    payment.status === "cancelled" ||
    payment.status === "refunded" ||
    payment.status === "partially_refunded"
  ) {
    return ok();
  }

  if (mappedStatus === "success") {
    const storedAmount =
      Number(payment.amount);

    const receivedAmount =
      typeof paymentAmount === "number"
        ? paymentAmount
        : typeof paymentAmount === "string"
          ? Number(paymentAmount)
          : null;

    const storedCurrency =
      String(
        payment.currency_code || ""
      ).toUpperCase();

    const receivedCurrency =
      typeof paymentCurrency === "string"
        ? paymentCurrency.toUpperCase()
        : null;

    const amountMismatch =
      receivedAmount === null ||
      !Number.isFinite(receivedAmount) ||
      Math.abs(
        receivedAmount -
          storedAmount
      ) > 0.001;

    const currencyMismatch =
      receivedCurrency === null ||
      receivedCurrency !==
        storedCurrency;

    if (
      amountMismatch ||
      currencyMismatch
    ) {
      console.error(
        `[Cashfree Webhook] Payment mismatch: payment=${payment.id}, ` +
          `stored=${storedAmount} ${storedCurrency}, ` +
          `received=${receivedAmount} ${receivedCurrency}`
      );

      try {
        await paymentRepo.updatePaymentStatus(
          payment.id,
          {
            status: "failed",

            gateway_payment_id:
              typeof cfPaymentId ===
              "string"
                ? cfPaymentId
                : null,

            gateway_payment_status:
              rawStatus,

            payment_method:
              typeof paymentMethod ===
              "string"
                ? paymentMethod
                : null,

            failure_reason:
              "Amount or currency mismatch in Cashfree webhook.",

            completed_at:
              new Date().toISOString(),
          }
        );
      } catch (error) {
        console.error(
          "[Cashfree Webhook] Failed to mark mismatch",
          error
        );

        return serverError();
      }

      return ok();
    }
  }

  try {
    await paymentRepo.updatePaymentStatus(
      payment.id,
      {
        status: mappedStatus,

        gateway_payment_id:
          typeof cfPaymentId ===
          "string"
            ? cfPaymentId
            : undefined,

        gateway_payment_status:
          rawStatus,

        payment_method:
          typeof paymentMethod ===
          "string"
            ? paymentMethod
            : undefined,

        failure_reason:
          mappedStatus === "failed" ||
          mappedStatus === "cancelled"
            ? typeof paymentMessage ===
              "string"
              ? paymentMessage
              : `Cashfree payment status: ${rawStatus}`
            : null,

        completed_at:
          mappedStatus === "success" ||
          mappedStatus === "failed" ||
          mappedStatus === "cancelled"
            ? new Date().toISOString()
            : null,
      }
    );
  } catch (error) {
    console.error(
      "[Cashfree Webhook] Payment update failed",
      error
    );

    return serverError();
  }

  if (mappedStatus === "success") {
    let booking;

    try {
      booking =
        await bookingRepo.getBookingById(
          payment.booking_id
        );
    } catch (error) {
      console.error(
        "[Cashfree Webhook] Booking lookup failed",
        error
      );

      return serverError();
    }

    if (!booking) {
      console.error(
        `[Cashfree Webhook] Booking ${payment.booking_id} not found`
      );

      return ok();
    }

    if (booking.status === "pending") {
      try {
        // ROOM-05: confirms the booking AND consumes ROOM-04 inventory
        // for every night of the stay, atomically, in a single Postgres
        // transaction. If the room has since sold out (e.g. a race with
        // another booking), this throws and the booking is deliberately
        // left "pending" even though the payment above is already
        // recorded as "success" — that mismatch needs a human
        // (refund/manual reassignment) rather than either silently
        // overbooking the room or silently discarding the payment.
        await bookingRepo.confirmBookingWithInventory(
          payment.booking_id
        );
      } catch (error) {
        console.error(
          `[Cashfree Webhook] Booking confirmation/inventory consumption failed ` +
            `for booking ${payment.booking_id} — payment ${payment.id} is ` +
            `recorded as successful but the booking was NOT confirmed. ` +
            `Needs manual review.`,
          error
        );

        // Acknowledge the webhook (200) rather than 500: the payment
        // itself was processed correctly and this is not a transient
        // failure Cashfree should retry — it's a room-availability
        // conflict that needs a human, not a retried webhook delivery.
        return ok();
      }
    }
  }

  return ok();
        }
