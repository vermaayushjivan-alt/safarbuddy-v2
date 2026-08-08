# SafarBuddy V2 — Changelog

## PAY-01 Step 6 — Payment Server Actions + Cashfree Client
**Date:** 2026-08-09

### Created
- `src/lib/cashfree/cashfree.client.ts` — Cashfree PG v3 REST client (server-only).
  - `getCashfreeBaseUrl()` — reads `CASHFREE_ENV`, returns sandbox or production base URL.
  - `getCashfreeHeaders()` — reads `CASHFREE_APP_ID` + `CASHFREE_SECRET_KEY`, returns v3 request headers.
  - `createCashfreeOrder(payload)` — POST `/orders` to Cashfree v3; returns `{ cf_order_id, payment_session_id }`.
  - `verifyWebhookSignature(timestamp, rawBody, signature)` — HMAC-SHA256 + Base64 verification helper for Step 7 webhook handler.
  - No Cashfree SDK installed; uses native `fetch` per PAY-01 Decision 1.
  - Credentials never exposed to client or error messages.

- `src/lib/actions/payment.actions.ts` — Payment Server Actions (`'use server'`).
  - `initiatePayment(bookingId)` — authenticated customer initiates payment for a pending booking. Verifies ownership, status, paid-guard, phone server-side, creates Cashfree order, persists `payments` row with `status: 'initiated'`.
  - `retryPayment(bookingId)` — authenticated customer retries a failed/abandoned payment. Always creates a NEW Cashfree order and NEW payment row. Previous rows unchanged.
  - `getMyPaymentForBooking(bookingId)` — returns latest payment for customer's own booking.
  - `getMyBookingPayments(bookingId)` — returns all payment attempts for customer's own booking.
  - `getAllPaymentsAdmin(page, limit, status?)` — `requireRole(['admin','super_admin'])`, paginated payment list.
  - `getPaymentByIdAdmin(id)` — `requireRole(['admin','super_admin'])`, single payment detail.
  - Amount, currency, user_id, phone always sourced server-side — never from client.
  - `BookingRepository.confirmBooking()` NOT called here — reserved for Step 7 webhook handler.

### Frozen files untouched
- `src/lib/repositories/payment.repository.ts` (PAY-01 Step 5)
- `src/lib/repositories/booking.repository.ts` (BOOKING-01)
- `src/lib/actions/booking.actions.ts` (BOOKING-01)
- `src/db/schema.ts` (PAY-01 Step 3)
- `src/db/sql/004_payment_schema.sql` (PAY-01 Step 2)
- `src/db/sql/003_booking01_schema.sql` (BOOKING-01)
- `middleware.ts` (AUTH-06)
- `src/lib/auth/session.ts` (AUTH-05)
- `.env` (PAY-01 Step 4)
- `package.json`

---

## PAY-01 Step 5 TypeScript Fix
**Date:** 2026-08-09

### Modified
- `src/lib/repositories/payment.repository.ts` — resolved `UpdatePaymentStatusData` cast error.
  Replaced force-cast `as Parameters<...>` with a genuinely typed `PaymentUpdateData` intermediate object.
  No `any` introduced. `BaseRepository` untouched.

---

## PAY-01 Steps 1–5
**Date:** 2026-08-09

- Step 1: Payment architecture design approved (decisions A–I).
- Step 2: `src/db/sql/004_payment_schema.sql` — `payments` table migration.
- Step 3: `src/db/schema.ts` — `payments` Drizzle definition + relations + types.
- Step 4: `.env` + `.env.example` — Cashfree environment variables.
- Step 5: `src/lib/repositories/payment.repository.ts` — `PaymentRepository`.

---

## BOOKING-01 — Hotel + Package Bookings
*(previously recorded — entry preserved)*

---

## Build Baseline Repair
**Date:** 2026-08-09

- Restored `userRoles` export in `src/db/schema.ts` after PAY-01 Step 3 regression.
- Fixed `src/db/schema.ts` parser error (line 270) — duplicate/malformed block removed.
- Confirmed `hotel.actions.ts` already used correct 4-argument `insertHotelImageRow()` — no change needed.
