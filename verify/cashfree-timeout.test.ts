import { describe, it, expect, vi, afterEach } from 'vitest';
vi.mock('server-only', () => ({}));
import { createCashfreeOrder } from '@/lib/cashfree/cashfree.client';

const payload = { order_id: 'o1', order_amount: 10, order_currency: 'INR',
  customer_details: { customer_id: 'c', customer_email: 'a@b.c', customer_phone: '9999999999' },
  order_meta: { return_url: 'x', notify_url: 'y' } };

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('GOLIVE-01 Cashfree client', () => {
  it('times out a hung request after 15s with a safe error', async () => {
    process.env.CASHFREE_APP_ID = 'id'; process.env.CASHFREE_SECRET_KEY = 'secret';
    vi.useFakeTimers();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', (_u: string, init: any) => new Promise((_res, rej) => {
      init.signal.addEventListener('abort', () => rej(new Error('aborted')));
    }));
    const p = createCashfreeOrder(payload as any);
    const assertion = expect(p).rejects.toThrow('Failed to create payment order. Please try again.');
    await vi.advanceTimersByTimeAsync(15_001);
    await assertion;
  });

  it('logs only code/type/message of an error body, never the whole body', async () => {
    process.env.CASHFREE_APP_ID = 'id'; process.env.CASHFREE_SECRET_KEY = 'secret';
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', async () => new Response(
      JSON.stringify({ code: 'authentication_failed', type: 'authentication_error', message: 'bad key', account_email: 'secret@x.com', merchant_id: 'M123' }),
      { status: 401 }));
    await expect(createCashfreeOrder(payload as any)).rejects.toThrow('Failed to create payment order.');
    const logged = JSON.stringify(err.mock.calls);
    expect(logged).toContain('authentication_failed');
    expect(logged).not.toContain('secret@x.com');
    expect(logged).not.toContain('M123');
  });
});
