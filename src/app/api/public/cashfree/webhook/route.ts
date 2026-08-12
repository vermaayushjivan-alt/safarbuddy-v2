// src/app/api/public/cashfree/webhook/route.ts
// PAY-02 — Cashfree webhook -> public.payments -> bookings confirmation.

import { NextRequest, NextResponse } from 'next/server';
import {
  createServiceRoleClient,
} from '@/lib/supabase/server';
import { verifyWebhookSignature } from '@/lib/cashfree/cashfree.client';
import { PaymentRepository } from '@/lib/repositories/payment.repository';
import { BookingRepository } from '@/lib/repositories/booking.repository';

export const runtime = 'nodejs';

const CF_STATUS_MAP: Record<string, 'success' | 'failed' | 'pending' | 'cancelled'> = {
  SUCCESS: 'success',
  FAILED: 'failed',
  USER_DROPPED: 'failed',
  FLAGGED: 'failed',
  PENDING: 'pending',
  CANCELLED: 'cancelled',
};

function ok() {
  return NextResponse.json({ success: true }, { status: 200 });
}

function badRequest(reason: string) {
  console.warn(`[Cashfree Webhook] ${reason}`);
  return NextResponse.json({ error: 'Bad request' }, { status: 400 });
}

function serverError() {
  return NextResponse.json({ error: 'Internal error' }, { status: 500 });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return badRequest('Failed to read request body');
  }

  const timestamp = request.headers.get('x-webhook-timestamp');
  const signature = request.headers.get('x-webhook-signature');

  if (!timestamp || !signature) {
    return badRequest('Missing webhook headers');
  }

  if (!verifyWebhookSignature(timestamp, rawBody, signature)) {
    return badRequest('Invalid signature');
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return badRequest('Invalid JSON payload');
  }

  const data = payload.data as Record<string, unknown> | undefined;
  const order = data?.order as Record<string, unknown> | undefined;
  const paymentData = data?.payment as Record<string, unknown> | undefined;

  if (!order || !paymentData) {
    return ok();
  }

  // Cashfree sends both merchant order_id and Cashfree's cf_order_id.
  // SafarBuddy stores the merchant order_id in payments.gateway_order_id.
  const merchantOrderId = order.order_id;
  const cfOrderId = order.cf_order_id;
  const rawStatus = paymentData.payment_status;
  const cfPaymentId = paymentData.cf_payment_id;
  const paymentAmount = paymentData.payment_amount;
  const paymentCurrency = paymentData.payment_currency;
  const paymentMethod = paymentData.payment_group;
  const paymentMessage = paymentData.payment_message;

  if (typeof merchantOrderId !== 'string' || !merchantOrderId) {
    // Older/manual payloads may only expose cf_order_id. We cannot safely
    // map that value to gateway_order_id without a matching stored row.
    return badRequest('Missing order_id in payload');
  }

  if (typeof rawStatus !== 'string' || !rawStatus) {
    return badRequest('Missing payment_status in payload');
  }

  const mappedStatus = CF_STATUS_MAP[rawStatus];
  if (!mappedStatus) {
    return ok();
  }

  let supabase;
  try {
    // Webhooks have no user cookie. Service-role access is required because
    // the payments RLS policy only permits the payment owner/admin to update.
    supabase = createServiceRoleClient();
  } catch {
    return serverError();
  }

  const paymentRepo = new PaymentRepository(supabase);
  const bookingRepo = new BookingRepository(supabase);

  let payment;
  try {
    payment = await paymentRepo.getPaymentByOrderId(merchantOrderId);
  } catch (error) {
    console.error('[Cashfree Webhook] Payment lookup failed', error);
    return serverError();
  }

  if (!payment) {
    console.warn(
      `[Cashfree Webhook] No payment found for gateway_order_id=${merchantOrderId}, cf_order_id=${String(cfOrderId ?? '')}`
    );
    return ok();
  }

  // Terminal states are idempotent. A later duplicate webhook must not
  // downgrade a successful payment.
  if (
    payment.status === 'success' ||
    payment.status === 'refunded' ||
    payment.status === 'partially_refunded'
  ) {
    return ok();
  }

  if (mappedStatus === 'success') {
    const storedAmount = Number(payment.amount);
    const receivedAmount =
      typeof paymentAmount === 'number'
        ? paymentAmount
        : typeof paymentAmount === 'string'
          ? Number(paymentAmount)
          : null;

    const storedCurrency = String(payment.currency_code || '').toUpperCase();
    const receivedCurrency =
      typeof paymentCurrency === 'string'
        ? paymentCurrency.toUpperCase()
        : null;

    const amountMismatch =
      receivedAmount !== null &&
      (!Number.isFinite(receivedAmount) ||
        Math.abs(receivedAmount - storedAmount) > 0.001);

    const currencyMismatch =
      receivedCurrency !== null && receivedCurrency !== storedCurrency;

    if (amountMismatch || currencyMismatch) {
      console.error(
        `[Cashfree Webhook] Payment mismatch: payment=${payment.id}, ` +
          `stored=${storedAmount} ${storedCurrency}, ` +
          `received=${receivedAmount} ${receivedCurrency}`
      );

      try {
        await paymentRepo.updatePaymentStatus(payment.id, {
          status: 'failed',
          gateway_payment_id:
            typeof cfPaymentId === 'string' ? cfPaymentId : null,
          payment_method:
            typeof paymentMethod === 'string' ? paymentMethod : null,
          failure_reason: 'Amount or currency mismatch in Cashfree webhook.',
          completed_at: new Date().toISOString(),
        });
      } catch (error) {
        console.error('[Cashfree Webhook] Failed to mark mismatch', error);
        return serverError();
      }

      return ok();
    }
  }

  try {
    await paymentRepo.updatePaymentStatus(payment.id, {
      status: mappedStatus,
      gateway_payment_id:
        typeof cfPaymentId === 'string' ? cfPaymentId : undefined,
      payment_method:
        typeof paymentMethod === 'string' ? paymentMethod : undefined,
      failure_reason:
        mappedStatus === 'failed'
          ? typeof paymentMessage === 'string'
            ? paymentMessage
            : `Cashfree payment status: ${rawStatus}`
          : null,
      completed_at:
        mappedStatus === 'success' ||
        mappedStatus === 'failed' ||
        mappedStatus === 'cancelled'
          ? new Date().toISOString()
          : null,
    });
  } catch (error) {
    console.error('[Cashfree Webhook] Payment update failed', error);
    return serverError();
  }

  if (mappedStatus === 'success') {
    let booking;
    try {
      booking = await bookingRepo.getBookingById(payment.booking_id);
    } catch (error) {
      console.error('[Cashfree Webhook] Booking lookup failed', error);
      return serverError();
    }

    if (!booking) {
      console.error(
        `[Cashfree Webhook] Booking ${payment.booking_id} not found`
      );
      return ok();
    }

    if (booking.status === 'pending') {
      try {
        await bookingRepo.confirmBooking(payment.booking_id);
      } catch (error) {
        console.error('[Cashfree Webhook] Booking confirmation failed', error);
        return serverError();
      }
    }
  }

  return ok();
}
