'use server';

// ROOT PATH: src/app/actions/refund-due.actions.ts
// GOLIVE-07b — list of bookings flagged refund_due (cancelled after payment).
// Read-only. Admin role check first; then service role because the refund
// table has no RLS policy.

import { requireRole } from '@/lib/auth/session';
import { createServiceRoleClient } from '@/lib/supabase/server';

export interface RefundDueRow {
  booking_id: string;
  booking_number: string;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  payment_id: string | null;
  currency_code: string;
  paid: number;
  refunded: number;
  pending_refund: number;
  remaining: number;
}

export async function getRefundDueBookingsAdmin(): Promise<RefundDueRow[]> {
  await requireRole(['admin', 'super_admin']);
  const supabase = createServiceRoleClient();

  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('id, booking_number, cancellation_reason, updated_at')
    .eq('refund_due', true)
    .is('deleted_at', null)
    .order('updated_at', { ascending: true })
    .limit(200);

  if (error) {
    console.error('[refund-due] bookings query failed', error);
    throw new Error('Could not load refunds due.');
  }
  if (!bookings || bookings.length === 0) return [];

  const ids = bookings.map((b) => b.id as string);

  const { data: payments, error: payError } = await supabase
    .from('payments')
    .select('id, booking_id, amount, currency_code, status, refunded_amount')
    .in('booking_id', ids)
    .in('status', ['success', 'partially_refunded']);

  if (payError) {
    console.error('[refund-due] payments query failed', payError);
    throw new Error('Could not load refunds due.');
  }

  const paymentIds = (payments ?? []).map((p) => p.id as string);
  const pendingByPayment = new Map<string, number>();
  if (paymentIds.length > 0) {
    const { data: pending, error: refError } = await supabase
      .from('payment_refunds')
      .select('payment_id, amount')
      .in('payment_id', paymentIds)
      .eq('status', 'pending');
    if (refError) {
      console.error('[refund-due] refunds query failed', refError);
      throw new Error('Could not load refunds due.');
    }
    for (const r of pending ?? []) {
      const key = r.payment_id as string;
      pendingByPayment.set(key, (pendingByPayment.get(key) ?? 0) + Number(r.amount));
    }
  }

  const rows: RefundDueRow[] = [];
  for (const b of bookings) {
    const bookingPayments = (payments ?? []).filter((p) => p.booking_id === b.id);
    if (bookingPayments.length === 0) {
      // Flagged but no refundable payment found: still show it, admin checks.
      rows.push({
        booking_id: b.id as string,
        booking_number: b.booking_number as string,
        cancelled_at: (b.updated_at as string) ?? null,
        cancellation_reason: (b.cancellation_reason as string) ?? null,
        payment_id: null,
        currency_code: 'INR',
        paid: 0,
        refunded: 0,
        pending_refund: 0,
        remaining: 0,
      });
      continue;
    }
    for (const p of bookingPayments) {
      const paid = Number(p.amount);
      const refunded = Number(p.refunded_amount ?? 0);
      const pending = pendingByPayment.get(p.id as string) ?? 0;
      rows.push({
        booking_id: b.id as string,
        booking_number: b.booking_number as string,
        cancelled_at: (b.updated_at as string) ?? null,
        cancellation_reason: (b.cancellation_reason as string) ?? null,
        payment_id: p.id as string,
        currency_code: (p.currency_code as string) ?? 'INR',
        paid,
        refunded,
        pending_refund: pending,
        remaining: Math.max(0, Math.round((paid - refunded - pending) * 100) / 100),
      });
    }
  }
  return rows;
}
