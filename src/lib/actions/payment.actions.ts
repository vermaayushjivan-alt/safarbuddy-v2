// src/lib/actions/payment.actions.ts
// PAY-02 — Cashfree payment initiation using the approved PAY-01 payments schema.

"use server";

import { z } from "zod";
import { runAction, type ActionResult } from "@/lib/actions/action-result";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { getAuthUser, requireRole, resolvePublicUserId } from "@/lib/auth/session";
import { BookingRepository } from "@/lib/repositories/booking.repository";
import {
  PaymentRepository,
  PaymentRecord,
  PaymentStatus,
} from "@/lib/repositories/payment.repository";
import {
  createCashfreeOrder,
  getCashfreeOrderStatus,
  CashfreeOrderPayload,
} from "@/lib/cashfree/cashfree.client";
import { PAYMENT } from "@/lib/config/constants";

const PAYMENT_STATUSES = [
  "pending",
  "success",
  "failed",
  "cancelled",
  "refunded",
  "partially_refunded",
] as const;

const bookingIdSchema = z.object({
  bookingId: z.string().uuid("Invalid booking ID"),
});

const paymentIdSchema = z.object({
  id: z.string().uuid("Invalid payment ID"),
});

const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  status: z.enum(PAYMENT_STATUSES).optional(),
});

// Explicit, named, portable return type for createNewPayment. Exported
// Server Actions (initiatePayment / retryPayment below) must expose a
// type that TypeScript can name/reference directly across the Server
// Action boundary — using `Awaited<ReturnType<typeof createNewPayment>>`
// on an exported function whose signature wraps a *non-exported* helper
// is not portable and fails the Next.js build (TS2742-class error).
// This interface is the single source of truth for that shape; update
// it (not the inline object below) if the return shape ever changes.
export interface InitiatePaymentResult {
  paymentSessionId: string;
  gatewayOrderId: string;
  amount: number;
  currency: string;
}

async function createNewPayment(
  bookingId: string
): Promise<InitiatePaymentResult> {
  const authUser = await getAuthUser();

  if (!authUser) {
    throw new Error("UNAUTHENTICATED");
  }

  const { bookingId: validatedBookingId } =
    bookingIdSchema.parse({ bookingId });

  const supabase = await createClient();

  const bookingRepo = new BookingRepository(supabase);
  const paymentRepo = new PaymentRepository(supabase);

  // P0.2 fix (2026-08-28 session, see ULTRA_PRO_AUDIT.md Section 9):
  // resolve the real public.users.id first — every ownership check and
  // every id written to the payments row below must use THIS value,
  // not the raw Supabase Auth uid (authUser.id). Using authUser.id
  // directly here was the confirmed root cause of "Booking not found"
  // appearing on the payment page even for a booking that legitimately
  // belongs to the signed-in account, plus a payments.user_id data-
  // integrity bug (wrong id being written on every successful payment).
  const userRowId = await resolvePublicUserId(supabase, authUser.id);

  // These three reads are independent of one another (none needs another's
  // result — each only needs validatedBookingId or userRowId, which are
  // already known), so they run in parallel instead of one-after-another
  // to cut round-trip latency on this hot path. All three results are
  // still fully validated below, in the same order/behavior as before.
  const [booking, existingPayments, profileResult] = await Promise.all([
    bookingRepo.getBookingById(validatedBookingId),
    paymentRepo.getPaymentsByBookingId(validatedBookingId),
    supabase.from("users").select("phone").eq("id", userRowId).single(),
  ]);

  const { data: userProfile, error: profileError } = profileResult;

  if (!booking || booking.user_id !== userRowId) {
    throw new Error("Booking not found");
  }

  if (booking.status !== "pending") {
    throw new Error("Only pending bookings can be paid");
  }

  if (existingPayments.some((payment) => payment.status === "success")) {
    throw new Error("This booking has already been paid.");
  }

  if (
    profileError ||
    !userProfile ||
    typeof userProfile.phone !== "string" ||
    userProfile.phone.trim() === ""
  ) {
    throw new Error(
      "A valid phone number is required to make a payment. Please update your profile."
    );
  }

  const amount = Number(booking.price_snapshot);
  const currency = String(booking.currency || "INR").toUpperCase();

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Invalid booking amount");
  }

  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new Error("Invalid booking currency");
  }

  // GOLIVE-01: if an earlier order for this booking is still "pending" here
  // but Cashfree already reports it PAID, the success webhook has simply not
  // landed yet (or was lost). Opening a second order now would let the
  // customer pay twice, so stop and let the webhook / reconciliation confirm
  // the first payment. A failed or unreachable status lookup returns null
  // and does NOT block a legitimate retry.
  for (const earlier of existingPayments) {
    if (earlier.status !== "pending") continue;
    const earlierStatus = await getCashfreeOrderStatus(earlier.gateway_order_id);
    if (earlierStatus === "PAID") {
      console.warn(
        `[payments] retry blocked: order ${earlier.gateway_order_id} is PAID at Cashfree but payment ${earlier.id} is still pending`
      );
      // TODO: alerting — a PAID order with a pending local payment means a lost webhook.
      throw new Error(
        "Your payment was received and is being confirmed. Please check My Bookings in a minute instead of paying again."
      );
    }
  }

  const gatewayOrderId =
    `SF-${validatedBookingId.split("-")[0]}-${Date.now()}`;

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";

  const cashfreePayload: CashfreeOrderPayload = {
    order_id: gatewayOrderId,
    order_amount: amount,
    order_currency: currency,

    customer_details: {
      customer_id: authUser.id,
      customer_email: authUser.email ?? "",
      customer_phone: userProfile.phone.trim(),
    },

    order_meta: {
      return_url:
        `${siteUrl}/payment/success?order_id=${encodeURIComponent(
          gatewayOrderId
        )}&booking_id=${encodeURIComponent(booking.id)}`,

      notify_url:
        `${siteUrl}/api/public/cashfree/webhook`,
    },

    // GOLIVE-01: an abandoned order can no longer be paid later.
    order_expiry_time: new Date(
      Date.now() + PAYMENT.ORDER_EXPIRY_MINUTES * 60_000
    ).toISOString(),
  };

  // GOLIVE-01 (fixes Bug P3): the local payments row is written BEFORE the
  // Cashfree order exists. Before, the order was created first, so a failed
  // insert left a live Cashfree order with no local record — the webhook
  // then logged "No payment found" and returned 200, and the customer's
  // money was taken with nothing recorded. Now the worst case is a local
  // "pending" row with no Cashfree order, which is harmless.
  const paymentRow = await paymentRepo.createPayment({
    booking_id: booking.id,
    user_id: userRowId,

    gateway_order_id: gatewayOrderId,
    gateway_payment_id: null,
    payment_gateway: "cashfree",

    amount,
    currency_code: currency,

    status: "pending",

    gateway_payment_status: null,
    payment_method: null,
    failure_reason: null,

    initiated_at: new Date().toISOString(),
    completed_at: null,

    created_by: userRowId,
    updated_by: userRowId,
  } as Parameters<PaymentRepository["createPayment"]>[0]);

  let cashfreeOrder: Awaited<ReturnType<typeof createCashfreeOrder>>;

  try {
    cashfreeOrder = await createCashfreeOrder(cashfreePayload);
  } catch (orderError) {
    // The customer never received a payment_session_id, so this order can
    // never be paid — safe to close the local row as failed.
    try {
      await paymentRepo.updatePaymentStatus(paymentRow.id, {
        status: "failed",
        failure_reason: "Could not create the Cashfree payment order.",
        completed_at: new Date().toISOString(),
      });
    } catch (closeError) {
      // RULE 38: do not swallow silently.
      console.error(
        `[payments] could not mark payment ${paymentRow.id} (order ${gatewayOrderId}) as failed after order creation error`,
        closeError
      );
      // TODO: alerting — orphan pending payment row.
    }
    throw orderError;
  }

  return {
    paymentSessionId:
      cashfreeOrder.payment_session_id,

    gatewayOrderId,
    amount,
    currency,
  };
}

export async function initiatePayment(
  bookingId: string
): Promise<ActionResult<InitiatePaymentResult>> {
  return runAction(() =>
    createNewPayment(bookingId)
  );
}

export async function retryPayment(
  bookingId: string
): Promise<ActionResult<InitiatePaymentResult>> {
  return runAction(() =>
    createNewPayment(bookingId)
  );
}

export async function getMyPaymentForBooking(
  bookingId: string
): Promise<PaymentRecord | null> {
  const authUser = await getAuthUser();

  if (!authUser) {
    throw new Error("UNAUTHENTICATED");
  }

  const { bookingId: validatedBookingId } =
    bookingIdSchema.parse({ bookingId });

  const supabase = await createClient();

  // P0.2 fix — see resolvePublicUserId() JSDoc / ULTRA_PRO_AUDIT.md
  // Section 9 for why authUser.id cannot be compared to
  // booking.user_id directly.
  const userRowId = await resolvePublicUserId(supabase, authUser.id);

  const bookingRepo =
    new BookingRepository(supabase);

  const paymentRepo =
    new PaymentRepository(supabase);

  const booking =
    await bookingRepo.getBookingById(
      validatedBookingId
    );

  if (!booking || booking.user_id !== userRowId) {
    throw new Error("Booking not found");
  }

  return paymentRepo.getLatestPaymentForBooking(
    validatedBookingId
  );
}

export async function getMyBookingPayments(
  bookingId: string
): Promise<PaymentRecord[]> {
  const authUser = await getAuthUser();

  if (!authUser) {
    throw new Error("UNAUTHENTICATED");
  }

  const { bookingId: validatedBookingId } =
    bookingIdSchema.parse({ bookingId });

  const supabase = await createClient();

  // P0.2 fix — see resolvePublicUserId() JSDoc / ULTRA_PRO_AUDIT.md
  // Section 9 for why authUser.id cannot be compared to
  // booking.user_id directly.
  const userRowId = await resolvePublicUserId(supabase, authUser.id);

  const bookingRepo =
    new BookingRepository(supabase);

  const paymentRepo =
    new PaymentRepository(supabase);

  const booking =
    await bookingRepo.getBookingById(
      validatedBookingId
    );

  if (!booking || booking.user_id !== userRowId) {
    throw new Error("Booking not found");
  }

  return paymentRepo.getPaymentsByBookingId(
    validatedBookingId
  );
}

export async function getAllPaymentsAdmin(
  page: number = 1,
  limit: number = 20,
  status?: PaymentStatus
) {
  await requireRole(["admin", "super_admin"]);

  const parsed =
    paginationSchema.parse({
      page,
      limit,
      status,
    });

  const supabase = await createClient();

  const paymentRepo =
    new PaymentRepository(supabase);

  return paymentRepo.getAllPayments(
    parsed.page,
    parsed.limit,
    parsed.status
  );
}

export async function getPaymentByIdAdmin(
  id: string
): Promise<PaymentRecord | null> {
  await requireRole(["admin", "super_admin"]);

  const { id: validatedId } =
    paymentIdSchema.parse({ id });

  const supabase = await createClient();

  const paymentRepo =
    new PaymentRepository(supabase);

  return paymentRepo.getPaymentById(
    validatedId
  );
}

// -----------------------------------------------------------------------------
// PAY-05 — payment result-page outcome check.
//
// Root cause fixed here: /payment/success previously rendered a
// hardcoded "Payment Submitted Successfully" message for EVERY visit,
// regardless of what actually happened — Cashfree's hosted checkout
// sends the customer back to the ONE return_url configured at order
// creation for every outcome (success, failure, or a dropped/
// cancelled attempt), not different URLs per outcome. The page must
// check the real outcome itself; it never did.
//
// The webhook remains the ONLY thing that writes payment/booking
// status (unchanged rule — see webhook route's own header comment).
// This function is read-only: it checks the local DB first (the
// common case, since the webhook is usually faster than the
// customer's browser redirect), and falls back to asking Cashfree
// directly only when the DB still shows "pending" — this covers the
// (also common) race where the browser lands here before the
// webhook has landed. No public auth — this is the return_url a
// just-completed guest or customer lands on, session or not; the
// order_id/booking_id pair is the same unguessable-URL trust model
// already used by /booking-confirmation/[id].
// -----------------------------------------------------------------------------

export type PaymentResultOutcome = "success" | "failed" | "pending";

export async function getPaymentOutcomeForResult(
  orderId: string
): Promise<PaymentResultOutcome> {
  if (!orderId) return "pending";

  const supabase = createServiceRoleClient();
  const paymentRepo = new PaymentRepository(supabase);

  const payment = await paymentRepo.getPaymentByOrderId(orderId);

  if (!payment) {
    // No matching payment row at all — nothing to show as success.
    return "pending";
  }

  if (payment.status === "success") return "success";
  if (payment.status === "failed" || payment.status === "cancelled") {
    return "failed";
  }

  // Still "pending" in our DB — ask Cashfree directly rather than
  // showing a guess. order_status values: PAID, ACTIVE (awaiting
  // payment), EXPIRED, TERMINATED.
  const liveStatus = await getCashfreeOrderStatus(orderId);

  if (liveStatus === "PAID") return "success";
  if (liveStatus === "EXPIRED" || liveStatus === "TERMINATED") {
    return "failed";
  }

  // Genuinely still pending (ACTIVE) or the live check itself failed
  // (liveStatus null) — never default to "success" in either case.
  return "pending";
}
