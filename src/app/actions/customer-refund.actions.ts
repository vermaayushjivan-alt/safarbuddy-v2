'use server';

// GOLIVE-13b — lets a CUSTOMER see (a) an estimate before cancelling and
// (b) the refund status after. Read-only: nothing here refunds anything
// (owner decision D4: refunds stay admin-initiated).
//
// payment_refunds has no RLS policy (service-role only, RULE 24), so reads go
// through the service-role client AFTER an explicit ownership check.

import { z } from 'zod';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { getAuthUser, resolvePublicUserId } from '@/lib/auth/session';
import { BookingRepository } from '@/lib/repositories/booking.repository';
import { suggestRefund } from '@/lib/payments/cancellation-policy';
import { summarizeRefund, type RefundNote } from '@/lib/payments/refund-summary';
import { roundToPaise } from '@/lib/payments/refund-status';

const PAID_STATUSES = ['success', 'partially_refunded', 'refunded'];
const MAX_IDS = 50;

export interface CancellationEstimate {
  paidAmount: number; // rupees actually paid and not yet refunded
  percent: number; // 0 | 50 | 100
  amount: number; // estimated refund in rupees
  hoursBeforeStart: number | null;
}

type RefundSummaryMap = Record<string, RefundNote>;

/** Refund status for the customer's own bookings (keyed by booking id). */
export async function getMyRefundNotes(bookingIds: string[]): Promise<RefundSummaryMap> {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return {};

    const ids = z.array(z.string().uuid()).max(MAX_IDS).parse(bookingIds);
    if (ids.length === 0) return {};

    const admin = createServiceRoleClient();
    const userId = await resolvePublicUserId(admin, authUser.id);

    // Ownership: only bookings that belong to this customer.
    const { data: own, error: ownError } = await admin
      .from('bookings')
      .select('id, status, refund_due')
      .in('id', ids)
      .eq('customer_id', userId);
    if (ownError) throw ownError;
    if (!own || own.length === 0) return {};

    const ownIds = own.map((b) => b.id as string);

    const [paymentsRes, refundsRes] = await Promise.all([
      admin
        .from('payments')
        .select('booking_id, amount, refunded_amount, status')
        .in('booking_id', ownIds)
        .in('status', PAID_STATUSES),
      admin
        .from('payment_refunds')
        .select('booking_id, amount, status')
        .in('booking_id', ownIds)
        .eq('status', 'pending'),
    ]);
    if (paymentsRes.error) throw paymentsRes.error;
    if (refundsRes.error) throw refundsRes.error;

    const result: RefundSummaryMap = {};

    for (const booking of own) {
      const id = booking.id as string;
      const pays = (paymentsRes.data ?? []).filter((p) => p.booking_id === id);
      const pend = (refundsRes.data ?? []).filter((r) => r.booking_id === id);

      const note = summarizeRefund({
        paid: pays.reduce((s, p) => s + Number(p.amount ?? 0), 0),
        refunded: pays.reduce((s, p) => s + Number(p.refunded_amount ?? 0), 0),
        pending: pend.reduce((s, r) => s + Number(r.amount ?? 0), 0),
        refundDue: Boolean(booking.refund_due),
        cancelled: booking.status === 'cancelled',
      });

      if (note) result[id] = note;
    }

    return result;
  } catch (err) {
    // Display-only: never break the bookings page because of this.
    console.error('[customer-refund] getMyRefundNotes failed', err);
    return {};
  }
}

/** What the customer would roughly get back if they cancelled right now. */
export async function getCancellationEstimate(
  bookingId: string
): Promise<CancellationEstimate | null> {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return null;

    const id = z.string().uuid().parse(bookingId);

    // RLS-scoped read, same ownership pattern as cancelMyBooking().
    const supabase = await createClient();
    const admin = createServiceRoleClient();
    const userId = await resolvePublicUserId(admin, authUser.id);

    const booking = await new BookingRepository(supabase).getBookingById(id);
    if (!booking || booking.customer_id !== userId) return null;
    if (booking.status !== 'pending' && booking.status !== 'confirmed') return null;

    const { data: pays, error } = await admin
      .from('payments')
      .select('amount, refunded_amount')
      .eq('booking_id', id)
      .in('status', PAID_STATUSES);
    if (error) throw error;

    const refundable = roundToPaise(
      (pays ?? []).reduce(
        (s, p) => s + Number(p.amount ?? 0) - Number(p.refunded_amount ?? 0),
        0
      )
    );

    if (refundable <= 0) {
      return { paidAmount: 0, percent: 0, amount: 0, hoursBeforeStart: null };
    }

    const startDate =
      booking.booking_type === 'hotel' ? booking.check_in_date : booking.travel_date;

    const suggestion = suggestRefund({
      startDate: startDate ?? null,
      cancelledAt: null,
      refundable,
    });

    return {
      paidAmount: refundable,
      percent: suggestion.percent,
      amount: suggestion.amount,
      hoursBeforeStart: suggestion.hoursBeforeStart,
    };
  } catch (err) {
    console.error('[customer-refund] getCancellationEstimate failed', err);
    return null;
  }
}
