import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const calls: string[] = [];
const state = {
  existing: [] as any[],
  cashfreeStatus: null as string | null,
  createPaymentFails: false,
  cashfreeOrderFails: false,
  lastPayload: null as any,
  updates: [] as any[],
};

vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { phone: '9999999999' }, error: null }) }) }) }),
  }),
  createServiceRoleClient: () => ({}),
}));
vi.mock('@/lib/auth/session', () => ({
  getAuthUser: async () => ({ id: 'auth-1', email: 'a@b.com' }),
  requireRole: async () => ({}),
  resolvePublicUserId: async () => 'user-1',
}));
vi.mock('@/lib/repositories/booking.repository', () => ({
  BookingRepository: class {
    async getBookingById() {
      return { id: '3f2b8c1e-4d5a-4b6c-8d7e-9a0b1c2d3e4f', user_id: 'user-1', status: 'pending', price_snapshot: 5000, currency: 'INR' };
    }
  },
}));
vi.mock('@/lib/repositories/payment.repository', () => ({
  PaymentRepository: class {
    async getPaymentsByBookingId() { return state.existing; }
    async createPayment(data: any) {
      calls.push('createPayment');
      if (state.createPaymentFails) throw new Error('db down');
      return { id: 'pay-1', ...data };
    }
    async updatePaymentStatus(id: string, data: any) { calls.push('updatePaymentStatus'); state.updates.push({ id, ...data }); return {}; }
  },
}));
vi.mock('@/lib/cashfree/cashfree.client', () => ({
  createCashfreeOrder: async (payload: any) => {
    calls.push('createCashfreeOrder');
    state.lastPayload = payload;
    if (state.cashfreeOrderFails) throw new Error('Failed to create payment order. Please try again.');
    return { cf_order_id: 'cf1', payment_session_id: 'sess-1' };
  },
  getCashfreeOrderStatus: async () => { calls.push('getCashfreeOrderStatus'); return state.cashfreeStatus; },
}));

import { initiatePayment } from '@/lib/actions/payment.actions';

const BID = '3f2b8c1e-4d5a-4b6c-8d7e-9a0b1c2d3e4f';

beforeEach(() => {
  calls.length = 0; state.existing = []; state.cashfreeStatus = null;
  state.createPaymentFails = false; state.cashfreeOrderFails = false; state.lastPayload = null; state.updates = [];
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe('GOLIVE-01 payment creation', () => {
  it('writes the local payments row BEFORE creating the Cashfree order', async () => {
    const r = await initiatePayment(BID);
    expect(r.success).toBe(true);
    expect(calls).toEqual(['createPayment', 'createCashfreeOrder']);
  });

  it('sends order_expiry_time about 30 minutes ahead', async () => {
    await initiatePayment(BID);
    const diffMin = (new Date(state.lastPayload.order_expiry_time).getTime() - Date.now()) / 60000;
    expect(diffMin).toBeGreaterThan(29);
    expect(diffMin).toBeLessThan(31);
  });

  it('if the DB insert fails, NO Cashfree order is created (no orphan)', async () => {
    state.createPaymentFails = true;
    const r = await initiatePayment(BID);
    expect(r.success).toBe(false);
    expect(calls).toEqual(['createPayment']);
  });

  it('if Cashfree fails, the local row is closed as failed and the error is returned', async () => {
    state.cashfreeOrderFails = true;
    const r = await initiatePayment(BID);
    expect(r.success).toBe(false);
    expect(calls).toEqual(['createPayment', 'createCashfreeOrder', 'updatePaymentStatus']);
    expect(state.updates[0]).toMatchObject({ id: 'pay-1', status: 'failed' });
    expect(state.updates[0].completed_at).toBeTruthy();
  });

  it('refuses a second order when the earlier pending one is already PAID at Cashfree', async () => {
    state.existing = [{ id: 'old', status: 'pending', gateway_order_id: 'SF-old' }];
    state.cashfreeStatus = 'PAID';
    const r = await initiatePayment(BID);
    expect(r.success).toBe(false);
    expect(calls).toEqual(['getCashfreeOrderStatus']);
  });

  it('allows a retry when the earlier pending order is ACTIVE or the lookup failed', async () => {
    state.existing = [{ id: 'old', status: 'pending', gateway_order_id: 'SF-old' }];
    for (const st of ['ACTIVE', null]) {
      calls.length = 0; state.cashfreeStatus = st;
      const r = await initiatePayment(BID);
      expect(r.success).toBe(true);
      expect(calls).toContain('createCashfreeOrder');
    }
  });
});
