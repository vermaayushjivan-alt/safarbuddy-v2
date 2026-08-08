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

const CF_STATUS_MAP: Record<
  string,
  'paid' | 'failed' | 'processing' | 'flagged'
> = {
  SUCCESS: 'paid',
  FAILED: 'failed',
  USER_DROPPED: 'failed',
  CANCELLED: 'failed',
  PENDING: 'processing',
  FLAGGED: 'flagged',
};

// ---------------------------------------------------------------------------
// Response helpers
// ---------------------------------------------------------------------------

function ok() {
  return NextResponse.json({ success: true }, { status: 200 });
}

function badRequest(reason: string) {
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
  // -------------------------------------------------------------------------

  let rawBody: string;

  try {
    rawBody = await request.text();
  } catch {
    return badRequest('Failed to read request body');
  }

  // -------------------------------------------------------------------------
  // STEP 2 — Extract required headers.
  // -------------------------------------------------------------------------

  const timestamp = request.headers.get('x-webhook-timestamp');
  const signature = request.headers.get('x-webhook-signature');

  if (!timestamp || !signature) {
    return badRequest('Missing webhook headers');
  }

  // -------------------------------------------------------------------------
  // STEP 3 — Verify Cashfree signature BEFORE parsing payload.
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
  // payment_method is intentionally NOT extracted here because
  // UpdatePaymentStatusData does not include that field.
  // -------------------------------------------------------------------------

  const data = payload['data'] as Record<string, unknown> | undefined;
  const orderData = data?.['order'] as Record<string, unknown> | undefined;
  const paymentData = data?.['payment'] as
    | Record<string, unknown>
    | undefined;

  if (!orderData || !paymentData) {
    console.log('[Webhook] Unrecognised payload structure — ignoring');
    return ok();
  }

  const cfOrderId = orderData['cf_order_id'];
  const merchantOrderId = orderData['order_id'];
  const rawPaymentStatus = paymentData['payment_status'];
  const cfPaymentId = paymentData['cf_payment_id'];
  const webhookAmount = paymentData['payment_amount'];
  const webhookCurrency = paymentData['payment_currency'];
  const paymentMessage = paymentData['payment_message'];

  if (typeof cfOrderId !== 'string' || !cfOrderId) {
    return badRequest('Missing cf_order_id in payload');
  }

  if (typeof rawPaymentStatus !== 'string' || !rawPaymentStatus) {
    return badRequest('Missing payment_status in payload');
  }

  console.log(
    `[Webhook] Received event — cf_order_id: ${cfOrderId}, ` +
      `merchant_order_id: ${merchantOrderId ?? 'unknown'}, ` +
      `payment_status: ${rawPaymentStatus}`
  );

  // -------------------------------------------------------------------------
  // STEP 6 — Map Cashfree status to application status.
  // -------------------------------------------------------------------------

  const applicationStatus = CF_STATUS_MAP[rawPaymentStatus];

  if (!applicationStatus) {
    console.log(
      `[Webhook] Unrecognised Cashfree payment_status: ${rawPaymentStatus} — ignoring`
    );
    return ok();
  }

  // -------------------------------------------------------------------------
  // STEP 7 — Create Supabase client and repositories.
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
  // STEP 8 — Look up payment row by cf_order_id.
  // -------------------------------------------------------------------------

  let payment: Awaited<ReturnType<typeof paymentRepo.getPaymentByOrderId>>;

  try {
    payment = await paymentRepo.getPaymentByOrderId(cfOrderId);
  } catch {
    console.error(`[Webhook] DB error looking up payment: ${cfOrderId}`);
    return serverError();
  }

  if (!payment) {
    console.warn(
      `[Webhook] No payment found for cf_order_id: ${cfOrderId} — ignoring`
    );
    return ok();
  }

  // -------------------------------------------------------------------------
  // STEP 9 — Idempotency guard.
  // -------------------------------------------------------------------------

  if (payment.status === 'paid') {
    console.log(
      `[Webhook] Payment ${payment.id} already paid — idempotent, returning 200`
    );
    return ok();
  }

  // -------------------------------------------------------------------------
  // STEP 10 — Amount and currency verification (SUCCESS events only).
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
        console.error(`[Webhook] Failed to flag payment ${payment.id}`);
        return serverError();
      }

      return ok();
    }
  }

  // -------------------------------------------------------------------------
  // STEP 11 — Update payment 
