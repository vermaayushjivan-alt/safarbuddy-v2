// src/lib/actions/payment.actions.ts
// PAY-01 — Payment Server Actions.
//
// Architecture:
//   'use server'
//   → auth (getAuthUser / requireRole)
//   → Zod validation
//   → createClient()
//   → repositories
//   → business guards
//   → Cashfree API (via cashfree.client.ts)
//   → repository persistence
//   → return typed result
//
// Rules:
// - amount, currency, user_id, phone are NEVER accepted from the client.
// - All sensitive values are read server-side only.
// - BookingRepository is used read-only — never mutated here.
// - BookingRepository.confirmBooking() is called ONLY by the webhook handler
//   (PAY-01 Step 7), never here.
// - Retry creates a NEW payment row. Previous rows are never mutated.

'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getAuthUser, requireRole } from '@/lib/auth/session';
import { BookingRepository } from '@/lib/repositories/booking.repository';
import {
  PaymentRepository,
  PaymentRecord,
  PaymentStatus,
} from '@/lib/repositories/payment.repository';
import {
  createCashfreeOrder,
  CashfreeOrderPayload,
} from '@/lib/cashfree/cashfree.client';

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const bookingIdSchema = z.object({
  bookingId: z.string().uuid('Invalid booking ID'),
});

const paymentIdSchema = z.object({
  id: z.string().uuid('Invalid payment ID'),
});

const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  status: z
    .enum(['initiated', 'processing', 'paid', 'failed', 'flagged'])
    .optional(),
});

// ---------------------------------------------------------------------------
// Internal helper — shared by initiatePayment and retryPayment.
// Encapsulates the full payment creation flow so both actions
// remain identical in their security posture.
// ---------------------------------------------------------------------------

async function createNewPayment(bookingId: string): Promise<{
  paymentSessionId: string;
  cfOrderId: string;
  amount: number;
  currency: string;
}> {
  // 1. Authentication
  const authUser = await getAuthUser();
  if (!authUser) {
    throw new Error('UNAUTHENTICATED');
  }

  // 2. Validate input
  const { bookingId: validatedBookingId } = bookingIdSchema.parse({
    bookingId,
  });

  // 3. Supabase client
  const supabase = await createClient();

  // 4. Repositories
  const bookingRepo = new BookingRepository(supabase);
  const paymentRepo = new PaymentRepository(supabase);

  // 5. Fetch and verify booking ownership
  const booking = await bookingRepo.getBookingById(validatedBookingId);

  if (!booking || booking.user_id !== authUser.id) {
    // Do not reveal whether the booking exists for another user.
    throw new Error('Booking not found');
  }

  // 6. Booking status guard — only 'pending' is payable
  if (booking.status !== 'pending') {
    throw new Error('Only pending bookings can be paid');
  }

  // 7. Existing payment guard — block if already paid
  const existingPayments = await paymentRepo.getPaymentsByBookingId(
    validatedBookingId
  );

  const alreadyPaid = existingPayments.some((p) => p.status === 'paid');
  if (alreadyPaid) {
    throw new Error('This booking has already been paid.');
  }

  // 8. Retrieve phone server-side — never from client
  const { data: userProfile, error: profileError } = await supabase
    .from('users')
    .select('phone')
    .eq('id', authUser.id)
    .single();

  if (
    profileError ||
    !userProfile ||
    !userProfile.phone ||
    typeof userProfile.phone !== 'string' ||
    userProfile.phone.trim() === ''
  ) {
    throw new Error(
      'A valid phone number is required to make a payment. Please update your profile.'
    );
  }

  // 9. Amount and currency — server-side only from booking record
  const amount = booking.price_snapshot;
  const currency = booking.currency;

  // 10. Generate Cashfree order ID per approved format:
  //     SF-{first segment of bookingId}-{unix timestamp ms}
  //     Max 45 chars. Actual: SF-(8 chars)-(13 chars) = 25 chars ✅
  const cfOrderId = `SF-${validatedBookingId.split('-')[0]}-${Date.now()}`;

  // 11. Construct Cashfree order payload
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

  const cashfreePayload: CashfreeOrderPayload = {
    order_id: cfOrderId,
    order_amount: Number(amount),
    order_currency: currency,
    customer_details: {
      customer_id: authUser.id,
      customer_email: authUser.email ?? '',
      customer_phone: userProfile.phone.trim(),
    },
    order_meta: {
      return_url: `${siteUrl}/payment/success?order_id=${cfOrderId}`,
      notify_url: `${siteUrl}/api/public/cashfree/webhook`,
    },
  };

  // 12. Create Cashfree order — throws on failure
  const cashfreeOrder = await createCashfreeOrder(cashfreePayload);

  // 13. Persist payment row — status 'initiated'
  // amount stored as numeric string in DB via Drizzle/Supabase;
  // PaymentRecord.amount is typed as number but the underlying
  // Supabase insert accepts both number and string for numeric columns.
  await paymentRepo.createPayment({
    booking_id: booking.id,
    user_id: authUser.id,
    cf_order_id: cashfreeOrder.cf_order_id,
    payment_session_id: cashfreeOrder.payment_session_id,
    amount: Number(amount),
    currency: currency,
    status: 'initiated',
    created_by: authUser.id,
    updated_by: authUser.id,
  });

  // 14. Return only the fields the UI needs — no raw Cashfree response
  return {
    paymentSessionId: cashfreeOrder.payment_session_id,
    cfOrderId: cashfreeOrder.cf_order_id,
    amount: Number(amount),
    currency: currency,
  };
}

// ---------------------------------------------------------------------------
// Customer actions
// ---------------------------------------------------------------------------

/**
 * Initiate a payment for a booking.
 * Called on the customer payment initiation page.
 * Creates a Cashfree order and a payment row with status 'initiated'.
 */
export async function initiatePayment(bookingId: string): Promise<{
  paymentSessionId: string;
  cfOrderId: string;
  amount: number;
  currency: string;
}> {
  return createNewPayment(bookingId);
}

/**
 * Retry a failed/abandoned payment for a booking.
 * Always creates a NEW Cashfree order and a NEW payment row.
 * Previous payment rows are never mutated.
 * Blocked if the booking is already paid.
 */
export async function retryPayment(bookingId: string): Promise<{
  paymentSessionId: string;
  cfOrderId: string;
  amount: number;
  currency: string;
}> {
  return createNewPayment(bookingId);
}

/**
 * Get the latest payment for the authenticated customer's booking.
 * Ownership verified: customer can only view their own booking's payment.
 */
export async function getMyPaymentForBooking(
  bookingId: string
): Promise<PaymentRecord | null> {
  const authUser = await getAuthUser();
  if (!authUser) {
    throw new Error('UNAUTHENTICATED');
  }

  const { bookingId: validatedBookingId } = bookingIdSchema.parse({
    bookingId,
  });

  const supabase = await createClient();
  const bookingRepo = new BookingRepository(supabase);
  const paymentRepo = new PaymentRepository(supabase);

  const booking = await bookingRepo.getBookingById(validatedBookingId);

  if (!booking || booking.user_id !== authUser.id) {
    throw new Error('Booking not found');
  }

  return paymentRepo.getLatestPaymentForBooking(validatedBookingId);
}

/**
 * Get all payment attempts for the authenticated customer's booking.
 * Ownership verified: customer can only view their own booking's payments.
 */
export async function getMyBookingPayments(
  bookingId: string
): Promise<PaymentRecord[]> {
  const authUser = await getAuthUser();
  if (!authUser) {
    throw new Error('UNAUTHENTICATED');
  }

  const { bookingId: validatedBookingId } = bookingIdSchema.parse({
    bookingId,
  });

  const supabase = await createClient();
  const bookingRepo = new BookingRepository(supabase);
  const paymentRepo = new PaymentRepository(supabase);

  const booking = await bookingRepo.getBookingById(validatedBookingId);

  if (!booking || booking.user_id !== authUser.id) {
    throw new Error('Booking not found');
  }

  return paymentRepo.getPaymentsByBookingId(validatedBookingId);
}

// ---------------------------------------------------------------------------
// Admin actions
// ---------------------------------------------------------------------------

/**
 * Paginated list of all payments — admin only.
 * Optional status filter.
 */
export async function getAllPaymentsAdmin(
  page: number = 1,
  limit: number = 20,
  status?: PaymentStatus
) {
  await requireRole(['admin', 'super_admin']);

  const parsed = paginationSchema.parse({ page, limit, status });

  const supabase = await createClient();
  const paymentRepo = new PaymentRepository(supabase);

  return paymentRepo.getAllPayments(parsed.page, parsed.limit, parsed.status);
}

/**
 * Single payment detail by ID — admin only.
 */
export async function getPaymentByIdAdmin(
  id: string
): Promise<PaymentRecord | null> {
  await requireRole(['admin', 'super_admin']);

  const { id: validatedId } = paymentIdSchema.parse({ id });

  const supabase = await createClient();
  const paymentRepo = new PaymentRepository(supabase);

  return paymentRepo.getPaymentById(validatedId);
}
