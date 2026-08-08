// src/app/api/public/cashfree/webhook/route.ts
// PAY-01 Step 7 — Cashfree PG v3 Webhook Handler.
//
// Public endpoint — no session/auth required.
// Authentication is Cashfree webhook signature verification ONLY.
//
// Route is public because /api/public/ is in the middleware allowlist
// (AUTH-06 — middleware.ts frozen, untouched).
//
// Processing order (enforced):
//   1. Read raw body (required for signature verification)
//   2. Extract and validate headers
//   3. Verify HMAC-SHA256 signature
//   4. Parse JSON payload
//   5. Extract cf_order_id and payment_status
//   6. Look up payment row by cf_order_id
//   7. Idempotency check
//   8. Amount/currency verification
//   9. Update payment status
//   10. Confirm booking (SUCCESS only, after all guards pass)
//   11. Return HTTP 200
//
// Never expose Cashfree credentials, raw payload, or DB records in responses.
// Database errors return HTTP 500 so Cashfree retries the webhook.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyWebhookSignature } from '@/lib/cashfree/cashfree.client';
import { PaymentRepository } from '@/lib/repositories/payment.repository';
import { BookingRepository } from '@/lib/repositories/booking.repository';

// ---------------------------------------------------------------------------
// Cashfree payment_status → SafarBuddy application status mapping
// Per approved PAY-01 Decision C.
// ---------------------------------------------------------------------------

const CF_STATUS_MAP: Record<string, 'paid' | 'failed' | 'processing' | 'flagged'> = {
  SUCCESS: 'paid',
  FAILED: 'failed',
  USER_DROPPED: 'failed',
  CANCELLED: 'failed',
  PENDING: 'processing',
  FLAGGED: 'flagged',
};

// ---------------------------------------------------------------------------
// Minimal success response — never includes DB records or credentials.
// ---------------------------------------------------------------------------

function ok() {
  return NextResponse.json({ success: true }, { status: 200 });
}

function badRequest(reason: string) {
  // Reason is logged server-side only — not returned to caller.
  console.warn(`[Webhook] Bad request: ${reason}`);
  return NextResponse.json({ error: 'Bad request' }, { status: 400 });
}

function serverError() {
  return NextResponse.json({ error: 'Internal error' }, { status: 500 });
}

// ---------------------------------------------------------------------------
// POST /api/public/cashfree/webhook
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse> {
  // -------------------------------------------------------------------------
  // STEP 1 — Read raw body BEFORE any parsing.
  // Required for HMAC-SHA256 signature verification against the exact bytes
  // Cashfree signed.
  // -------------------------------------------------------------------------

  let rawBody: string;

  try {
    rawBody = await request.text();
  } catch {
    return badRequest('Failed to read request body');
  }

  // -------------------------------------------------------------------------
  // STEP 2 — Extract required headers.
  // x-webhook-timestamp and x-webhook-signature are both required.
  // Per approved PAY-01 Decision C specification.
  // -------------------------------------------------------------------------

  const timestamp = request.headers.get('x-webhook-timestamp');
  const signature = request.headers.get('x-webhook-signature');

  if (!timestamp || !signature) {
    return badRequest('Missing webhook headers');
  }

  // -------------------------------------------------------------------------
  // STEP 3 — Verify Cashfree signature BEFORE parsing payload.
  // Uses verifyWebhookSignature() from cashfree.client.ts — no HMAC
  // duplication here.
  // -------------------------------------------------------------------------

  const isValid = verifyWebhookSignature(timestamp, rawBody, signature);

  if (!isValid) {
    console.warn('[Webhook] Signature verification failed');
    return badRequest('Invalid signature');
  }

  // -------------------------------------------------------------------------
  // STEP 4 — Parse JSON payload only after signature is verified.
  // -------------------------------------------------------------------------

  let payload: Record<string, unknown>;

  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return badRequest('Invalid JSON payload');
  }

  // -------------------------------------------------------------------------
  // STEP 5 — Extract Cashfree order ID and payment status.
  // Field paths per approved PAY-01 Decision C:
  //   data.order.cf_order_id   — Cashfree-assigned order ID (lookup key)
  //   data.order.order_id      — merchant-supplied order ID (for logging)
  //   data.payment.payment_status
  //   data.payment.payment_amount
  //   data.payment.payment_currency
  //   data.payment.cf_payment_id
  //   data.payment.payment_method
  //   data.payment.payment_message
  // -------------------------------------------------------------------------

  const data = payload['data'] as Record<string, unknown> | undefined;
  const orderData = data?.['order'] as Record<string, unknown> | undefined;
  const paymentData = data?.['payment'] as Record<string, unknown> | undefined;

  if (!orderData || !paymentData) {
    // Valid signature but unexpected payload structure — unknown event type.
    // Return 200 so Cashfree does not retry unnecessarily.
    console.log('[Webhook] Unrecognised payload structure — ignoring');
    return ok();
  }

  const cfOrderId = orderData['cf_order_id'];
  const merchantOrderId = orderData['order_id'];
  const rawPaymentStatus = paymentData['payment_status'];
  const cfPaymentId = paymentData['cf_payment_id'];
  const webhookAmount = paymentData['payment_amount'];
  const webhookCurrency = paymentData['payment_currency'];
  const paymentMethod = paymentData['payment_method'];
  const paymentMessage = paymentData['payment_message'];

  if (typeof cfOrderId !== 'string' || !cfOrderId) {
    return badRequest('Missing cf_order_id in payload');
  }

  if (typeof rawPaymentStatus !== 'string' || !rawPaymentStatus) {
    return badRequest('Missing payment_status in payload');
  }

  // Log minimal identifiers server-side (never log credentials or secrets).
  console.log(
    `[Webhook] Received event — cf_order_id: ${cfOrderId}, ` +
    `merchant_order_id: ${merchantOrderId ?? 'unknown'}, ` +
    `payment_status: ${rawPaymentStatus}`
  );

  // -------------------------------------------------------------------------
  // STEP 6 — Map Cashfree status to application status.
  // Unknown statuses are handled safely without crashing.
  // -------------------------------------------------------------------------

  const applicationStatus = CF_STATUS_MAP[rawPaymentStatus];

  if (!applicationStatus) {
    // Valid signature, unrecognised status — do not crash.
    // Return 200 to prevent Cashfree retries on an event we cannot handle.
    console.log(
      `[Webhook] Unrecognised Cashfree payment_status: ${rawPaymentStatus} — ignoring`
    );
    return ok();
  }

  // -------------------------------------------------------------------------
  // STEP 7 — Create Supabase client and repositories.
  // Repositories are the persistence layer — no direct table queries here.
  // -------------------------------------------------------------------------

  let supabase: Awaited<ReturnType<typeof createClient>>;

  try {
    supabase = await createClient();
  } catch {
    console.error('[Webhook] Failed to create Supabase client');
    return serverError();
  }

  const paymentRepo = new PaymentRepository(supabase);
  const bookingRepo = new BookingRepository(supabase);

  // -------------------------------------------------------------------------
  // STEP 8 — Look up the payment row by cf_order_id.
  // getPaymentByOrderId() queries the payments table by the UNIQUE
  // cf_order_id column — this is the primary webhook lookup key.
  // The database is the source of truth for all identity fields.
  // -------------------------------------------------------------------------

  let payment: Awaited<ReturnType<typeof paymentRepo.getPaymentByOrderId>>;

  try {
    payment = await paymentRepo.getPaymentByOrderId(cfOrderId);
  } catch {
    console.error(`[Webhook] DB error looking up payment: ${cfOrderId}`);
    return serverError();
  }

  if (!payment) {
    // No payment row exists for this cf_order_id.
    // This can happen if the order was created in Cashfree but the DB
    // insert failed during initiation. Do not create a new payment here —
    // payment rows are created exclusively in payment.actions.ts.
    console.warn(
      `[Webhook] No payment found for cf_order_id: ${cfOrderId} — ignoring`
    );
    // Return 200 — this is a valid response. Cashfree should not retry
    // indefinitely for a payment that never persisted locally.
    return ok();
  }

  // -------------------------------------------------------------------------
  // STEP 9 — Idempotency guard.
  // If the payment row is already 'paid', do not update again.
  // This handles duplicate Cashfree webhook delivery.
  // -------------------------------------------------------------------------

  if (payment.status === 'paid') {
    console.log(
      `[Webhook] Payment ${payment.id} already paid — idempotent, returning 200`
    );
    return ok();
  }

  // -------------------------------------------------------------------------
  // STEP 10 — Amount and currency verification (SUCCESS events only).
  // The database payment row is the internal source of truth.
  // webhook amount/currency must match stored values.
  // If mismatch → flag the payment for admin review.
  // Mismatch is treated more seriously than a simple failure.
  // -------------------------------------------------------------------------

  if (applicationStatus === 'paid') {
    const storedAmount = Number(payment.amount);
    const storedCurrency = payment.currency;

    const receivedAmount =
      typeof webhookAmount === 'number'
        ? webhookAmount
        : typeof webhookAmount === 'string'
        ? Number(webhookAmount)
        : null;

    const receivedCurrency =
      typeof webhookCurrency === 'string' ? webhookCurrency : null;

    const amountMismatch =
      receivedAmount !== null &&
      Math.abs(receivedAmount - storedAmount) > 0.001;

    const currencyMismatch =
      receivedCurrency !== null &&
      receivedCurrency.toUpperCase() !== storedCurrency.toUpperCase();

    if (amountMismatch || currencyMismatch) {
      console.error(
        `[Webhook] Amount/currency mismatch for payment ${payment.id}. ` +
        `Stored: ${storedAmount} ${storedCurrency}. ` +
        `Received: ${receivedAmount} ${receivedCurrency}. ` +
        `Flagging for admin review.`
      );

      try {
        await paymentRepo.updatePaymentStatus(payment.id, {
          status: 'flagged',
          cf_payment_id:
            typeof cfPaymentId === 'string' ? cfPaymentId : null,
          cf_payment_status: rawPaymentStatus,
          failure_reason:
            'Amount or currency mismatch — flagged for admin review.',
          completed_at: null,
        });
      } catch {
        console.error(
          `[Webhook] Failed to flag payment ${payment.id}`
        );
        return serverError();
      }

      // Return 200 — event was valid and processed (flagged).
      return ok();
    }
  }

  // -------------------------------------------------------------------------
  // STEP 11 — Update payment status.
  // Only statuses supported by the existing PaymentRepository/schema are used.
  // completed_at is set for terminal states: paid and failed.
  // -------------------------------------------------------------------------

  const isTerminal =
    applicationStatus === 'paid' || applicationStatus === 'failed';

  try {
    await paymentRepo.updatePaymentStatus(payment.id, {
      status: applicationStatus,
      cf_payment_id:
        typeof cfPaymentId === 'string' ? cfPaymentId : undefined,
      cf_payment_status: rawPaymentStatus,
      failure_reason:
        applicationStatus === 'failed' || applicationStatus === 'flagged'
          ? typeof paymentMessage === 'string'
            ? paymentMessage
            : `Payment ${rawPaymentStatus}`
          : undefined,
      completed_at: isTerminal ? new Date().toISOString() : undefined,
      payment_method:
        typeof paymentMethod === 'string' ? paymentMethod : undefined,
    });
  } catch {
    console.error(
      `[Webhook] Failed to update payment status for ${payment.id}`
    );
    return serverError();
  }

  // -------------------------------------------------------------------------
  // STEP 12 — Confirm booking (SUCCESS ONLY).
  //
  // Conditions that must ALL be true before calling confirmBooking():
  //   ✅ Cashfree signature verified
  //   ✅ cf_order_id matches database payment row
  //   ✅ Amount and currency verified
  //   ✅ Payment not already paid (idempotency guard passed)
  //   ✅ Payment status updated to 'paid'
  //
  // BookingRepository.confirmBooking() is called only here — NEVER in
  // payment.actions.ts or anywhere else.
  //
  // Booking status guard:
  //   - 'pending'   → confirm (normal flow)
  //   - 'confirmed' → idempotent, do not fail
  //   - 'cancelled' → do not resurrect; log and continue
  //   - 'completed' → do not re-confirm; log and continue
  // -------------------------------------------------------------------------

  if (applicationStatus === 'paid') {
    let booking: Awaited<ReturnType<typeof bookingRepo.getBookingById>>;

    try {
      booking = await bookingRepo.getBookingById(payment.booking_id);
    } catch {
      console.error(
        `[Webhook] Failed to fetch booking ${payment.booking_id}`
      );
      // Payment is already marked paid. Return 500 so Cashfree retries
      // — on retry, idempotency guard will prevent double payment update,
      // and we get another chance to confirm the booking.
      return serverError();
    }

    if (!booking) {
      console.error(
        `[Webhook] Booking ${payment.booking_id} not found after payment update`
      );
      // Payment already marked paid — return 200 to stop retries.
      // Admin must investigate manually.
      return ok();
    }

    if (booking.status === 'pending') {
      try {
        await bookingRepo.confirmBooking(payment.booking_id);
        console.log(
          `[Webhook] Booking ${payment.booking_id} confirmed after payment ${payment.id}`
        );
      } catch {
        console.error(
          `[Webhook] Failed to confirm booking ${payment.booking_id}`
        );
        // Return 500 — Cashfree will retry; idempotency guard protects
        // against duplicate payment update on retry.
        return serverError();
      }
    } else if (booking.status === 'confirmed') {
      // Idempotent — booking already confirmed, likely from a prior
      // webhook delivery. No action needed.
      console.log(
        `[Webhook] Booking ${payment.booking_id} already confirmed — idempotent`
      );
    } else {
      // cancelled or completed — do not force confirmation.
      console.warn(
        `[Webhook] Booking ${payment.booking_id} is in status ` +
        `'${booking.status}' — cannot confirm. Payment marked paid. ` +
        `Admin review required.`
      );
    }
  }

  // -------------------------------------------------------------------------
  // STEP 13 — Return 200 for all successfully processed events.
  // This includes: paid, failed, processing, flagged.
  // Returning 200 prevents unnecessary Cashfree retries.
  // -------------------------------------------------------------------------

  return ok();
}
