// src/lib/cashfree/cashfree.client.ts
// PAY-01 — Cashfree Payment Gateway v3 REST client.
// Server-only. Never imported from client components.
// No Cashfree SDK — uses native fetch per approved PAY-01 Decision 1.
// All credentials read from environment variables — never hardcoded.

import 'server-only';
import { createHmac, timingSafeEqual } from 'crypto';

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

// GOLIVE-01: every Cashfree call gets a hard timeout. Without one, a hung
// connection ties up the serverless function until the platform kills it.
// Note for callers: a timeout on order CREATION does not prove Cashfree did
// not create the order. That is safe here because the customer only receives
// payment_session_id from our response, so an order we never answered about
// can never be paid.
const CASHFREE_TIMEOUT_MS = 15_000;

async function fetchWithTimeout(
  url: string,
  init: RequestInit
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CASHFREE_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
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
  // GOLIVE-01: ISO 8601 timestamp after which Cashfree refuses payment.
  order_expiry_time?: string;
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
    response = await fetchWithTimeout(`${baseUrl}/orders`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
  } catch (networkError) {
    // Network-level failure or timeout — do not expose raw error to caller.
    console.error('[Cashfree] Order creation request failed (network/timeout)', networkError);
    // TODO: alerting — repeated order-creation failures mean checkout is down.
    throw new Error(
      'Failed to create payment order. Please try again.'
    );
  }

  if (!response.ok) {
    // Non-2xx from Cashfree — never forward the raw body to the client.
    // GOLIVE-01: the old TEMP DEBUG line logged the WHOLE error body, which
    // can carry account-identifying details. Only the documented error
    // fields (code / type / message) are logged now — enough to diagnose a
    // 401 or a validation error (RULE 38) without leaking account data.
    let errorDetail: Record<string, unknown> = {};
    try {
      const parsed = (await response.json()) as Record<string, unknown>;
      errorDetail = {
        code: parsed['code'],
        type: parsed['type'],
        message: parsed['message'],
      };
    } catch {
      // Body was not JSON — status alone is logged below.
    }
    console.error(
      `[Cashfree] Order creation failed: HTTP ${response.status}`,
      errorDetail
    );
    // TODO: alerting — a non-2xx on order creation blocks every payment.
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

// ---------------------------------------------------------------------------
// getCashfreeOrderStatus
// GET /orders/{order_id} — used by the /payment/success landing page
// (PAY-05, this session) as a live fallback check. The webhook remains
// the ONLY thing that ever writes payment/booking status to the DB —
// this function is read-only and exists purely so the landing page can
// show the customer an accurate message even in the (common) case
// where their browser reaches the return_url before Cashfree's async
// webhook has landed.
// ---------------------------------------------------------------------------

// GOLIVE-03: the order as Cashfree sees it. The reconciliation job needs the
// amount and currency (not just the status) so it can verify a PAID order
// against our stored payment before confirming a booking.
export interface CashfreeOrderDetails {
  status: string;
  amount: number | null;
  currency: string | null;
}

export async function getCashfreeOrderDetails(
  orderId: string
): Promise<CashfreeOrderDetails | null> {
  const baseUrl = getCashfreeBaseUrl();
  const headers = getCashfreeHeaders();

  let response: Response;

  try {
    response = await fetchWithTimeout(
      `${baseUrl}/orders/${encodeURIComponent(orderId)}`,
      { method: 'GET', headers }
    );
  } catch (networkError) {
    console.error('[Cashfree] Order status fetch failed (network)', networkError);
    return null;
  }

  if (!response.ok) {
    console.error(
      `[Cashfree] Order status fetch failed: HTTP ${response.status}`
    );
    return null;
  }

  try {
    const body = (await response.json()) as Record<string, unknown>;
    const orderStatus = body['order_status'];
    if (typeof orderStatus !== 'string') return null;

    const rawAmount = body['order_amount'];
    const amount =
      typeof rawAmount === 'number'
        ? rawAmount
        : typeof rawAmount === 'string' && rawAmount !== ''
          ? Number(rawAmount)
          : null;
    const rawCurrency = body['order_currency'];

    return {
      status: orderStatus,
      amount: amount !== null && Number.isFinite(amount) ? amount : null,
      currency: typeof rawCurrency === 'string' ? rawCurrency : null,
    };
  } catch {
    return null;
  }
}

// Status only (existing callers). Same behaviour as before GOLIVE-03.
export async function getCashfreeOrderStatus(
  orderId: string
): Promise<string | null> {
  const details = await getCashfreeOrderDetails(orderId);
  return details ? details.status : null;
}

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
      timingSafeEqual(computedBuffer, receivedBuffer)
    );
  } catch {
    console.error('[Cashfree] Webhook signature verification error');
    return false;
  }
}

// ---------------------------------------------------------------------------
// GOLIVE-07 — Refunds
//
// POST /orders/{order_id}/refunds   body: { refund_amount, refund_id, refund_note }
// GET  /orders/{order_id}/refunds/{refund_id}
//
// `refund_id` is OUR id (stored in payment_refunds.refund_id before the call),
// so repeating a request for the same refund can never create a second one.
//
// A refund that Cashfree accepts is usually "PENDING" at first; the final
// state arrives by REFUND_STATUS_WEBHOOK (SUCCESS or CANCELLED) or by the
// sync job calling getCashfreeRefund.
// ---------------------------------------------------------------------------

export type CashfreeRefundState =
  | 'SUCCESS'
  | 'PENDING'
  | 'ONHOLD'
  | 'CANCELLED'
  | 'FAILED';

export interface CashfreeRefundDetails {
  cf_refund_id: string | null;
  refund_id: string | null;
  refund_status: string; // raw Cashfree value; see CashfreeRefundState
  status_description: string | null;
}

// "rejected": Cashfree answered and said no (4xx) — nothing was created.
// "unknown":  no answer / 5xx / 429 — the refund MAY exist at Cashfree.
//             Never treat unknown as failed; look it up by refund_id.
// "not_found": GET only — Cashfree has no such refund.
export type CashfreeRefundCallResult =
  | { ok: true; refund: CashfreeRefundDetails }
  | { ok: false; kind: 'rejected'; message: string }
  | { ok: false; kind: 'not_found' }
  | { ok: false; kind: 'unknown' };

function parseRefundBody(
  body: Record<string, unknown>
): CashfreeRefundDetails | null {
  const status = body['refund_status'];
  if (typeof status !== 'string' || !status) return null;

  const cf = body['cf_refund_id'];
  const rid = body['refund_id'];
  const desc = body['status_description'];

  return {
    cf_refund_id:
      typeof cf === 'string' && cf
        ? cf
        : typeof cf === 'number'
          ? String(cf)
          : null,
    refund_id: typeof rid === 'string' ? rid : null,
    refund_status: status,
    status_description: typeof desc === 'string' ? desc : null,
  };
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const parsed = (await response.json()) as Record<string, unknown>;
    // Only documented error fields; never the whole body (RULE 38 / GOLIVE-01).
    const message = parsed['message'];
    return typeof message === 'string' && message
      ? message
      : `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
}

export async function createCashfreeRefund(input: {
  orderId: string;
  refundId: string;
  amount: number;
  note: string;
}): Promise<CashfreeRefundCallResult> {
  const baseUrl = getCashfreeBaseUrl();
  const headers = getCashfreeHeaders();

  let response: Response;
  try {
    response = await fetchWithTimeout(
      `${baseUrl}/orders/${encodeURIComponent(input.orderId)}/refunds`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          refund_amount: input.amount,
          refund_id: input.refundId,
          refund_note: input.note.slice(0, 100),
        }),
      }
    );
  } catch (networkError) {
    console.error('[Cashfree] Refund request failed (network/timeout)', networkError);
    // TODO: alerting — refund outcome unknown.
    return { ok: false, kind: 'unknown' };
  }

  if (!response.ok) {
    const message = await readErrorMessage(response);
    console.error(`[Cashfree] Refund request failed: HTTP ${response.status}`, {
      refundId: input.refundId,
      message,
    });
    // 4xx (except 408 / 429) = Cashfree understood and refused: nothing created.
    const refused =
      response.status >= 400 &&
      response.status < 500 &&
      response.status !== 408 &&
      response.status !== 429;
    return refused
      ? { ok: false, kind: 'rejected', message }
      : { ok: false, kind: 'unknown' };
  }

  try {
    const refund = parseRefundBody(
      (await response.json()) as Record<string, unknown>
    );
    // 2xx but unreadable body: the refund exists, we just cannot read it.
    return refund ? { ok: true, refund } : { ok: false, kind: 'unknown' };
  } catch {
    return { ok: false, kind: 'unknown' };
  }
}

export async function getCashfreeRefund(input: {
  orderId: string;
  refundId: string;
}): Promise<CashfreeRefundCallResult> {
  const baseUrl = getCashfreeBaseUrl();
  const headers = getCashfreeHeaders();

  let response: Response;
  try {
    response = await fetchWithTimeout(
      `${baseUrl}/orders/${encodeURIComponent(input.orderId)}/refunds/${encodeURIComponent(input.refundId)}`,
      { method: 'GET', headers }
    );
  } catch (networkError) {
    console.error('[Cashfree] Refund fetch failed (network/timeout)', networkError);
    return { ok: false, kind: 'unknown' };
  }

  if (response.status === 404) return { ok: false, kind: 'not_found' };

  if (!response.ok) {
    console.error(`[Cashfree] Refund fetch failed: HTTP ${response.status}`);
    return { ok: false, kind: 'unknown' };
  }

  try {
    const refund = parseRefundBody(
      (await response.json()) as Record<string, unknown>
    );
    return refund ? { ok: true, refund } : { ok: false, kind: 'unknown' };
  } catch {
    return { ok: false, kind: 'unknown' };
  }
}
