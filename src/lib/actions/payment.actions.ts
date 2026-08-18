// src/lib/actions/payment.actions.ts
// PAY-02 — Cashfree payment initiation using the approved PAY-01 payments schema.

"use server";

import { z } from "zod";
import { runAction, type ActionResult } from "@/lib/actions/action-result";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser, requireRole } from "@/lib/auth/session";
import { BookingRepository } from "@/lib/repositories/booking.repository";
import {
  PaymentRepository,
  PaymentRecord,
  PaymentStatus,
} from "@/lib/repositories/payment.repository";
import {
  createCashfreeOrder,
  CashfreeOrderPayload,
} from "@/lib/cashfree/cashfree.client";

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

async function createNewPayment(bookingId: string): Promise<{
  paymentSessionId: string;
  gatewayOrderId: string;
  amount: number;
  currency: string;
}> {
  const authUser = await getAuthUser();

  if (!authUser) {
    throw new Error("UNAUTHENTICATED");
  }

  const { bookingId: validatedBookingId } =
    bookingIdSchema.parse({ bookingId });

  const supabase = await createClient();

  const bookingRepo = new BookingRepository(supabase);
  const paymentRepo = new PaymentRepository(supabase);

  const booking = await bookingRepo.getBookingById(validatedBookingId);

  if (!booking || booking.user_id !== authUser.id) {
    throw new Error("Booking not found");
  }

  if (booking.status !== "pending") {
    throw new Error("Only pending bookings can be paid");
  }

  const existingPayments =
    await paymentRepo.getPaymentsByBookingId(validatedBookingId);

  if (existingPayments.some((payment) => payment.status === "success")) {
    throw new Error("This booking has already been paid.");
  }

  const { data: userProfile, error: profileError } = await supabase
    .from("users")
    .select("phone")
    .eq("id", authUser.id)
    .single();

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
  };

  const cashfreeOrder =
    await createCashfreeOrder(cashfreePayload);

  await paymentRepo.createPayment({
    booking_id: booking.id,
    user_id: authUser.id,

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

    created_by: authUser.id,
    updated_by: authUser.id,
  } as Parameters<PaymentRepository["createPayment"]>[0]);

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
): Promise<
  ActionResult<
    Awaited<ReturnType<typeof createNewPayment>>
  >
> {
  return runAction(() =>
    createNewPayment(bookingId)
  );
}

export async function retryPayment(
  bookingId: string
): Promise<
  ActionResult<
    Awaited<ReturnType<typeof createNewPayment>>
  >
> {
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

  const bookingRepo =
    new BookingRepository(supabase);

  const paymentRepo =
    new PaymentRepository(supabase);

  const booking =
    await bookingRepo.getBookingById(
      validatedBookingId
    );

  if (!booking || booking.user_id !== authUser.id) {
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

  const bookingRepo =
    new BookingRepository(supabase);

  const paymentRepo =
    new PaymentRepository(supabase);

  const booking =
    await bookingRepo.getBookingById(
      validatedBookingId
    );

  if (!booking || booking.user_id !== authUser.id) {
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
