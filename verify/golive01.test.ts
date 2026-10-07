import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---- in-memory "database" with atomic conditional updates ----
const db = {
  payment: null as any,
  booking: null as any,
  failConfirmOnce: false,
  sideEffects: 0,
  background: [] as Promise<unknown>[],
  sigOk: true,
};
const tick = () => Promise.resolve();

vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/server', () => ({ createServiceRoleClient: () => ({}) }));
vi.mock('@/lib/cashfree/cashfree.client', () => ({ verifyWebhookSignature: () => db.sigOk }));
vi.mock('@/lib/payments/post-payment', () => ({
  runPostConfirmationSideEffects: async () => { db.sideEffects++; },
}));
vi.mock('next/server', async (orig) => {
  const real: any = await orig();
  return { ...real, after: (fn: () => Promise<void>) => { db.background.push(fn()); } };
});
vi.mock('@/lib/repositories/payment.repository', () => ({
  PaymentRepository: class {
    async getPaymentByOrderId(id: string) { await tick(); return db.payment && db.payment.gateway_order_id === id ? { ...db.payment } : null; }
    async transitionPaymentStatus(id: string, from: string[], data: any) {
      await tick(); // let other requests interleave BEFORE the atomic check+set
      if (!db.payment || db.payment.id !== id || !from.includes(db.payment.status)) return null;
      db.payment = { ...db.payment, ...Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)) };
      return { ...db.payment };
    }
  },
}));
vi.mock('@/lib/repositories/booking.repository', () => ({
  BookingRepository: class {
    async confirmBookingIfPending(id: string) {
      await tick();
      if (db.failConfirmOnce) { db.failConfirmOnce = false; throw new Error('db blip'); }
      if (!db.booking || db.booking.id !== id || db.booking.status !== 'pending') return null;
      db.booking = { ...db.booking, status: 'confirmed' };
      return { ...db.booking };
    }
    async getBookingById(id: string) { await tick(); return db.booking && db.booking.id === id ? { ...db.booking } : null; }
  },
}));

import { POST } from '@/app/api/public/cashfree/webhook/route';

const ORDER = 'SF-abc-1';
function hook(status: string, opts: { amount?: number; cfId?: string } = {}) {
  const body = JSON.stringify({ data: {
    order: { order_id: ORDER },
    payment: { payment_status: status, cf_payment_id: opts.cfId ?? 'cf-1', payment_amount: opts.amount ?? 5000, payment_currency: 'INR', payment_group: 'upi', payment_message: 'msg' },
  } });
  return new NextRequest('http://localhost/api/public/cashfree/webhook', {
    method: 'POST', body, headers: { 'x-webhook-timestamp': '1', 'x-webhook-signature': 'sig' },
  });
}
const send = async (status: string, o?: any) => { const r = await POST(hook(status, o)); await Promise.all(db.background); return r.status; };

beforeEach(() => {
  db.payment = { id: 'p1', booking_id: 'b1', gateway_order_id: ORDER, amount: 5000, currency_code: 'INR', status: 'pending', gateway_payment_id: null };
  db.booking = { id: 'b1', status: 'pending' };
  db.failConfirmOnce = false; db.sideEffects = 0; db.background = []; db.sigOk = true;
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe('GOLIVE-02 webhook state machine', () => {
  it('P1: FAILED attempt then SUCCESS on the same order confirms the booking', async () => {
    expect(await send('FAILED', { cfId: 'cf-1' })).toBe(200);
    expect(db.payment.status).toBe('failed');
    expect(db.booking.status).toBe('pending');
    expect(await send('SUCCESS', { cfId: 'cf-2' })).toBe(200);
    expect(db.payment.status).toBe('success');
    expect(db.booking.status).toBe('confirmed');
    expect(db.sideEffects).toBe(1);
    expect(db.payment.platform_commission_amount).toBe(1000);
    expect(db.payment.vendor_payout_amount).toBe(4000);
  });

  it('P1: USER_DROPPED then SUCCESS also confirms', async () => {
    await send('USER_DROPPED');
    expect(db.payment.status).toBe('failed');
    await send('SUCCESS', { cfId: 'cf-2' });
    expect(db.booking.status).toBe('confirmed');
  });

  it('P2: confirm fails once -> 500; Cashfree retry heals the booking, side effects exactly once', async () => {
    db.failConfirmOnce = true;
    expect(await send('SUCCESS')).toBe(500);
    expect(db.payment.status).toBe('success');     // money recorded
    expect(db.booking.status).toBe('pending');     // booking not yet confirmed
    expect(await send('SUCCESS')).toBe(200);       // retry
    expect(db.booking.status).toBe('confirmed');
    expect(db.sideEffects).toBe(1);
  });

  it('duplicate SUCCESS webhooks send side effects only once', async () => {
    await send('SUCCESS'); await send('SUCCESS'); await send('SUCCESS');
    expect(db.sideEffects).toBe(1);
    expect(db.booking.status).toBe('confirmed');
  });

  it('RACE: two simultaneous SUCCESS webhooks -> one confirmation, one set of side effects', async () => {
    const [a, b] = await Promise.all([POST(hook('SUCCESS')), POST(hook('SUCCESS'))]);
    await Promise.all(db.background);
    expect([a.status, b.status]).toEqual([200, 200]);
    expect(db.booking.status).toBe('confirmed');
    expect(db.sideEffects).toBe(1);
  });

  it('RACE: a late FAILED can never overwrite a SUCCESS', async () => {
    await Promise.all([POST(hook('SUCCESS')), POST(hook('FAILED', { cfId: 'cf-0' }))]);
    await Promise.all(db.background);
    await send('FAILED', { cfId: 'cf-0' });
    expect(db.payment.status).toBe('success');
    expect(db.booking.status).toBe('confirmed');
  });

  it('amount mismatch is rejected: payment failed, booking NOT confirmed, no side effects', async () => {
    expect(await send('SUCCESS', { amount: 1 })).toBe(200);
    expect(db.payment.status).toBe('failed');
    expect(db.booking.status).toBe('pending');
    expect(db.sideEffects).toBe(0);
  });

  it('FLAGGED keeps the payment pending (not terminal); later SUCCESS confirms', async () => {
    await send('FLAGGED');
    expect(db.payment.status).toBe('pending');
    await send('SUCCESS');
    expect(db.booking.status).toBe('confirmed');
  });

  it('paid for a booking that was cancelled meanwhile: payment recorded, booking untouched, loud log', async () => {
    db.booking.status = 'cancelled';
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await send('SUCCESS')).toBe(200);
    expect(db.payment.status).toBe('success');
    expect(db.booking.status).toBe('cancelled');
    expect(db.sideEffects).toBe(0);
    expect(JSON.stringify(err.mock.calls)).toContain('REFUND OR MANUAL REVIEW NEEDED');
  });

  it('a second successful payment id on the same order is flagged as double payment', async () => {
    await send('SUCCESS', { cfId: 'cf-1' });
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    await send('SUCCESS', { cfId: 'cf-9' });
    expect(JSON.stringify(err.mock.calls)).toContain('customer paid twice');
    expect(db.sideEffects).toBe(1);
  });

  it('numeric cf_payment_id is stored', async () => {
    const body = JSON.stringify({ data: { order: { order_id: ORDER }, payment: { payment_status: 'SUCCESS', cf_payment_id: 12345, payment_amount: 5000, payment_currency: 'INR' } } });
    const r = await POST(new NextRequest('http://localhost/x', { method: 'POST', body, headers: { 'x-webhook-timestamp': '1', 'x-webhook-signature': 's' } }));
    await Promise.all(db.background);
    expect(r.status).toBe(200);
    expect(db.payment.gateway_payment_id).toBe('12345');
  });

  it('unknown order -> 200 (acknowledged); bad signature -> 400', async () => {
    db.payment.gateway_order_id = 'OTHER';
    expect(await send('SUCCESS')).toBe(200);
    db.sigOk = false;
    expect(await send('SUCCESS')).toBe(400);
  });
});
