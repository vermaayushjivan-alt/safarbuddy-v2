import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---- in-memory database ----
const db = {
  payments: [] as any[],
  bookings: [] as any[],
  cashfree: {} as Record<string, any>,   // order_id -> details | null
  sideEffects: 0,
  background: [] as Promise<unknown>[],
  failConfirm: false,
  healthDbError: false,
};
const tick = () => Promise.resolve();

vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: () => ({
    from: () => ({ select: () => ({ limit: async () => ({ data: [], error: db.healthDbError ? { message: 'down' } : null }) }) }),
  }),
}));
vi.mock('@/lib/cashfree/cashfree.client', () => ({
  getCashfreeOrderDetails: async (id: string) => (id in db.cashfree ? db.cashfree[id] : null),
}));
vi.mock('@/lib/payments/post-payment', () => ({ runPostConfirmationSideEffects: async () => { db.sideEffects++; } }));
vi.mock('next/server', async (orig) => {
  const real: any = await orig();
  return { ...real, after: (fn: () => Promise<void>) => { db.background.push(fn()); } };
});
vi.mock('@/lib/repositories/payment.repository', () => ({
  PaymentRepository: class {
    async getStalePendingPayments(olderIso: string, newerIso: string, limit: number) {
      await tick();
      return db.payments.filter(p => p.status === 'pending' && p.initiated_at < olderIso && p.initiated_at > newerIso).slice(0, limit).map(p => ({ ...p }));
    }
    async getRecentSuccessfulPayments(sinceIso: string, limit: number) {
      await tick();
      return db.payments.filter(p => p.status === 'success' && p.completed_at >= sinceIso).slice(0, limit).map(p => ({ ...p }));
    }
    async getPaymentByOrderId(id: string) { await tick(); const p = db.payments.find(x => x.gateway_order_id === id); return p ? { ...p } : null; }
    async transitionPaymentStatus(id: string, from: string[], data: any) {
      await tick();
      const i = db.payments.findIndex(p => p.id === id);
      if (i < 0 || !from.includes(db.payments[i].status)) return null;
      db.payments[i] = { ...db.payments[i], ...Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)) };
      return { ...db.payments[i] };
    }
  },
}));
vi.mock('@/lib/repositories/booking.repository', () => ({
  BookingRepository: class {
    async getPendingBookingIds(ids: string[]) { await tick(); return new Set(db.bookings.filter(b => ids.includes(b.id) && b.status === 'pending').map(b => b.id)); }
    async confirmBookingIfPending(id: string) {
      await tick();
      if (db.failConfirm) throw new Error('db blip');
      const i = db.bookings.findIndex(b => b.id === id);
      if (i < 0 || db.bookings[i].status !== 'pending') return null;
      db.bookings[i] = { ...db.bookings[i], status: 'confirmed' };
      return { ...db.bookings[i] };
    }
    async getBookingById(id: string) { await tick(); const b = db.bookings.find(x => x.id === id); return b ? { ...b } : null; }
  },
}));

import { reconcilePayments } from '@/lib/payments/reconcile';
import { GET as cron } from '@/app/api/public/cron/reconcile-payments/route';
import { GET as health } from '@/app/api/health/route';

const NOW = new Date('2026-10-07T12:00:00Z');
const minsAgo = (m: number) => new Date(NOW.getTime() - m * 60_000).toISOString();
const mkPay = (over: any = {}) => ({ id: 'p1', booking_id: 'b1', gateway_order_id: 'SF-1', amount: 5000, currency_code: 'INR',
  status: 'pending', gateway_payment_id: null, initiated_at: minsAgo(30), completed_at: null, ...over });

beforeEach(() => {
  db.payments = [mkPay()]; db.bookings = [{ id: 'b1', status: 'pending' }];
  db.cashfree = {}; db.sideEffects = 0; db.background = []; db.failConfirm = false; db.healthDbError = false;
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => { vi.restoreAllMocks(); delete process.env.CRON_SECRET; });
const run = async () => { const s = await reconcilePayments({} as any, NOW); await Promise.all(db.background); return s; };

describe('GOLIVE-03 reconcile job A (pending payments)', () => {
  it('lost webhook: Cashfree PAID -> payment success, booking confirmed, one set of side effects, commission set', async () => {
    db.cashfree['SF-1'] = { status: 'PAID', amount: 5000, currency: 'INR' };
    const s = await run();
    expect(s.recoveredPaid).toBe(1);
    expect(db.payments[0].status).toBe('success');
    expect(db.payments[0].platform_commission_amount).toBe(1000);
    expect(db.bookings[0].status).toBe('confirmed');
    expect(db.sideEffects).toBe(1);
  });

  it('is idempotent: running twice does not repeat side effects', async () => {
    db.cashfree['SF-1'] = { status: 'PAID', amount: 5000, currency: 'INR' };
    await run(); const s2 = await run();
    expect(db.sideEffects).toBe(1);
    expect(s2.pendingChecked).toBe(0);
  });

  it('PAID with a different amount is NOT confirmed', async () => {
    db.cashfree['SF-1'] = { status: 'PAID', amount: 1, currency: 'INR' };
    const s = await run();
    expect(s.amountMismatch).toBe(1);
    expect(db.payments[0].status).toBe('failed');
    expect(db.bookings[0].status).toBe('pending');
    expect(db.sideEffects).toBe(0);
  });

  it('EXPIRED and TERMINATED orders close the payment as failed, booking untouched', async () => {
    db.payments = [mkPay(), mkPay({ id: 'p2', gateway_order_id: 'SF-2', booking_id: 'b2' })];
    db.bookings = [{ id: 'b1', status: 'pending' }, { id: 'b2', status: 'pending' }];
    db.cashfree['SF-1'] = { status: 'EXPIRED', amount: 5000, currency: 'INR' };
    db.cashfree['SF-2'] = { status: 'TERMINATED', amount: 5000, currency: 'INR' };
    const s = await run();
    expect(s.closedExpired).toBe(2);
    expect(db.payments.map(p => p.status)).toEqual(['failed', 'failed']);
    expect(db.bookings.every(b => b.status === 'pending')).toBe(true);
  });

  it('ACTIVE order is left alone; unreachable Cashfree is left alone', async () => {
    db.payments = [mkPay(), mkPay({ id: 'p2', gateway_order_id: 'SF-2', booking_id: 'b2' })];
    db.cashfree['SF-1'] = { status: 'ACTIVE', amount: 5000, currency: 'INR' };
    // SF-2 not in map -> lookup returns null
    const s = await run();
    expect(s.stillActive).toBe(1);
    expect(s.lookupFailed).toBe(1);
    expect(db.payments.map(p => p.status)).toEqual(['pending', 'pending']);
  });

  it('ignores payments younger than 10 minutes and older than 3 days', async () => {
    db.payments = [mkPay({ initiated_at: minsAgo(3) }), mkPay({ id: 'p2', gateway_order_id: 'SF-2', initiated_at: minsAgo(60 * 24 * 4) })];
    db.cashfree['SF-1'] = { status: 'PAID', amount: 5000, currency: 'INR' };
    db.cashfree['SF-2'] = { status: 'PAID', amount: 5000, currency: 'INR' };
    const s = await run();
    expect(s.pendingChecked).toBe(0);
  });
});

describe('GOLIVE-03 reconcile job B (paid but booking pending)', () => {
  it('heals a successful payment whose booking is still pending', async () => {
    db.payments = [mkPay({ status: 'success', completed_at: minsAgo(60) })];
    const s = await run();
    expect(s.unconfirmedHealed).toBe(1);
    expect(db.bookings[0].status).toBe('confirmed');
    expect(db.sideEffects).toBe(1);
  });

  it('does nothing when the booking is already confirmed', async () => {
    db.payments = [mkPay({ status: 'success', completed_at: minsAgo(60) })];
    db.bookings = [{ id: 'b1', status: 'confirmed' }];
    const s = await run();
    expect(s.unconfirmedHealed).toBe(0);
    expect(db.sideEffects).toBe(0);
  });

  it('a database error is counted, not thrown, and later items still run', async () => {
    db.payments = [mkPay({ status: 'success', completed_at: minsAgo(60) })];
    db.failConfirm = true;
    const s = await run();
    expect(s.errors).toBe(1);
    expect(db.bookings[0].status).toBe('pending');
    db.failConfirm = false;
    const s2 = await run();
    expect(s2.unconfirmedHealed).toBe(1);
    expect(db.bookings[0].status).toBe('confirmed');
  });
});

describe('GOLIVE-03 cron route auth', () => {
  const req = (auth?: string) => new NextRequest('http://localhost/api/public/cron/reconcile-payments', { headers: auth ? { authorization: auth } : {} });

  it('switched OFF (503) when CRON_SECRET is not set', async () => {
    expect((await cron(req('Bearer anything'))).status).toBe(503);
  });
  it('401 without or with a wrong token', async () => {
    process.env.CRON_SECRET = 'a-very-long-secret-value';
    expect((await cron(req())).status).toBe(401);
    expect((await cron(req('Bearer wrong'))).status).toBe(401);
    expect((await cron(req('Bearer a-very-long-secret-valuX'))).status).toBe(401);
  });
  it('200 with a summary on the right token', async () => {
    process.env.CRON_SECRET = 'a-very-long-secret-value';
    const r = await cron(req('Bearer a-very-long-secret-value'));
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.success).toBe(true);
    expect(body.summary).toHaveProperty('recoveredPaid');
  });
});

describe('GOLIVE-03 health route', () => {
  it('200 ok:true when the database answers', async () => {
    const r = await health(); const b = await r.json();
    expect(r.status).toBe(200); expect(b.ok).toBe(true);
    expect(r.headers.get('cache-control')).toBe('no-store');
  });
  it('503 ok:false and no details when the database is down', async () => {
    db.healthDbError = true;
    const r = await health(); const b = await r.json();
    expect(r.status).toBe(503); expect(b).toEqual({ ok: false });
  });
});
