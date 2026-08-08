# SafarBuddy V2 — Changelog

## PAY-01 Step 7 — Cashfree Webhook
**Date:** 2026-08-09

### Created
- `src/app/api/public/cashfree/webhook/route.ts`
  - Cashfree PG v3 webhook endpoint (POST /api/public/cashfree/webhook).
  - Raw body read via `request.text()` before any parsing — required for HMAC integrity.
  - `x-webhook-timestamp` and `x-webhook-signature` headers extracted and validated.
  - Signature verified using `verifyWebhookSignature()` from `cashfree.client.ts` — no HMAC duplication.
  - JSON payload parsed only after signature verification.
  - Payment looked up by `cf_order_id` via `PaymentRepository.getPaymentByOrderId()`.
  - Idempotency: payments already in `paid` status are not processed again.
  - Amount/currency verification: mismatch flags payment for admin review (`flagged` status).
  - Payment status updated via `PaymentRepository.updatePaymentStatus()`.
  - Booking confirmed via `BookingRepository.confirmBooking()` on verified SUCCESS only.
  - Booking status guard: `pending` → confirmed; `confirmed` → idempotent; `cancelled`/`completed` → logged, not forced.
  - Failed payments (`FAILED`, `USER_DROPPED`, `CANCELLED`) update payment to `failed` without affecting booking.
  - Unknown Cashfree statuses and unrecognised payload structures return HTTP 200 safely.
  - Database errors return HTTP 500 to trigger Cashfree webhook retry.
  - No credentials, secrets, or database records returned in responses.

### Security
- Cashfree webhook signature verified before payload is parsed.
- Payment and booking identity derived exclusively from trusted database records.
- Amount and currency verified against stored payment row before marking paid.
- Duplicate webhook delivery is idempotent (paid guard).
- Booking confirmation only after all guards pass.
- Cashfree credentials remain server-only — never logged or returned.

### Frozen files untouched
- `src/lib/repositories/payment.repository.ts` (PAY-01 Step 5)
- `src/lib/repositories/booking.repository.ts` (BOOKING-01)
- `src/lib/actions/booking.actions.ts` (BOOKING-01)
- `src/lib/actions/payment.actions.ts` (PAY-01 Step 6)
- `src/lib/cashfree/cashfree.client.ts` (PAY-01 Step 6)
- `src/db/schema.ts` (PAY-01 Step 3)
- `src/db/sql/004_payment_schema.sql` (PAY-01 Step 2)
- `src/db/sql/003_booking01_schema.sql` (BOOKING-01)
- `src/lib/auth/session.ts` (AUTH-05)
- `middleware.ts` (AUTH-06)
- `.env` (PAY-01 Step 4)
- `package.json`

---

## PAY-01 Step 6 — Payment Server Actions + Cashfree Client
*(previously recorded — entry preserved)*

## PAY-01 Step 5 TypeScript Fix
*(previously recorded — entry preserved)*

## PAY-01 Steps 1–5
*(previously recorded — entry preserved)*

## Build Baseline Repair
*(previously recorded — entry preserved)*
