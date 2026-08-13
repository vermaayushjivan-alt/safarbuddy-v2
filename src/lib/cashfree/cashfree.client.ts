// src/lib/cashfree/cashfree.client.ts
// PAY-01 — Cashfree Payment Gateway v3 REST client.
// Server-only. Never imported from client components.
// No Cashfree SDK — uses native fetch per approved PAY-01 Decision 1.
// All credentials read from environment variables — never hardcoded.

import 'server-only';
import { createHmac } from 'crypto';

// ---------------------------------------------------------------------------
// Environment helpers
// ---------------------------------------------------------------------------

function getCashfreeBaseUrl(): string {
  // P0 fix: this previously read CASHFREE_ENV, a server-only variable
  // that is not part of the validated env schema (src/lib/config/env.ts)
  // and not documented in .env.example. The client SDK
  // (PayNowButton.tsx) reads NEXT_PUBLIC_CASHFREE_ENV — the only one of
  // the two that is actually validated/documented — so an unset
  // CASHFREE_ENV silently created sandbox orders even when the client
  // checkout ran in production mode. Both sides now read the same
  // canonical, validated variable.
  const env = process.env.NEXT_PUBLIC_CASHFREE_ENV;
  if (env === 'production') {
    return 'https://api.cashfree.com/pg';
  }
  // Default to sandbox — fail safe per approved design.
  return 'https://sandbox.cashfree.com/pg';
}

function getCashfreeHeaders(): Record<string, string> {
  const appId = process.env.CASHFREE_APP_ID;
  const secretKey = process.env.CASHFREE_SECRET_KEY;

  if (!appId || !secretKey) {
    // Never expose which variable is missing in a user-facing message.
    // This is a server-side configuration error only.
    throw new Error(
      'Cashfree payment gateway is not configured. Contact support.'
    );
  }

  return {
    'x-client-id': appId,
    'x-client-secret': secretKey,
    'x-api-version': '2023-08-01',
    'Content-Type': 'application/json',
  };
}

// ---------------------------------------------------------------------------
// Cashfree order creation request shape
// ---------------------------------------------------------------------------

export interface CashfreeOrderPayload {
  order_id: string;
  order_amount: number;
  order_currency: string;
  customer_details: {
    customer_id: string;
    customer_email: string;
    customer_phone: string;
  };
  order_meta: {
    return_url: string;
    notify_url: string;
  };
}

// ---------------------------------------------------------------------------
// Cashfree order creation response — only the fields SafarBuddy stores.
// ---------------------------------------------------------------------------

export interface CashfreeOrderResult {
  cf_order_id: string;
  payment_session_id: string;
}

// ---------------------------------------------------------------------------
// createCashfreeOrder
// POST /orders — creates a Cashfree payment order and returns the fields
// required for payment session redirect. All other Cashfree response fields
// are intentionally discarded.
// ---------------------------------------------------------------------------

export async function createCashfreeOrder(
  payload: CashfreeOrderPayload
): Promise<CashfreeOrderResult> {
  const baseUrl = getCashfreeBaseUrl();
  const headers = getCashfreeHeaders();

  let response: Response;

  try {
    response = await fetch(`${baseUrl}/orders`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
  } catch (networkError) {
    // Network-level failure — do not expose raw error to caller.
    throw new Error(
      'Failed to create payment order. Please try again.'
    );
  }

  if (!response.ok) {
    // Non-2xx from Cashfree — do not forward raw Cashfree error body.
    // Log status server-side only.
    console.error(
      `[Cashfree] Order creation failed: HTTP ${response.status}`
    );
    throw new Error(
      'Failed to create payment order. Please try again.'
    );
  }

  let body: Record<string, unknown>;

  try {
    body = (await response.json()) as Record<string, unknown>;
  } catch {
    throw new Error(
      'Failed to create payment order. Please try again.'
    );
  }

  const cf_order_id = body['cf_order_id'];
  const payment_session_id = body['payment_session_id'];

  if (
    typeof cf_order_id !== 'string' ||
    !cf_order_id ||
    typeof payment_session_id !== 'string' ||
    !payment_session_id
  ) {
    console.error(
      '[Cashfree] Order response missing required fields',
      Object.keys(body)
    );
    throw new Error(
      'Failed to create payment order. Please try again.'
    );
  }

  return { cf_order_id, payment_session_id };
}

// ---------------------------------------------------------------------------
// verifyWebhookSignature
// Verifies Cashfree v3 webhook HMAC-SHA256 signature.
//
// Per approved PAY-01 Decision C:
//   signature = Base64(HMAC-SHA256(CASHFREE_SECRET_KEY, timestamp + rawBody))
//
// Caller must pass:
//   timestamp  — value of x-webhook-timestamp header
//   rawBody    — raw request body string (before JSON.parse)
//   signature  — value of x-webhook-signature header
//
// Returns true if signature is valid, false otherwise.
// Never throws on invalid signature — caller decides how to respond.
// ---------------------------------------------------------------------------

export function verifyWebhookSignature(
  timestamp: string,
  rawBody: string,
  signature: string
): boolean {
  const secretKey = process.env.CASHFREE_SECRET_KEY;

  if (!secretKey) {
    console.error('[Cashfree] CASHFREE_SECRET_KEY is not set');
    return false;
  }

  try {
    const message = timestamp + rawBody;
    const computed = createHmac('sha256', secretKey)
      .update(message)
      .digest('base64');

    // Constant-time comparison to prevent timing attacks.
    // Both strings must be the same length for timingSafeEqual.
    const computedBuffer = Buffer.from(computed, 'base64');
    const receivedBuffer = Buffer.from(signature, 'base64');

    if (computedBuffer.length !== receivedBuffer.length) {
      return false;
    }

    return (
      require('crypto').timingSafeEqual(computedBuffer, receivedBuffer)
    );
  } catch {
    console.error('[Cashfree] Webhook signature verification error');
    return false;
  }
}
