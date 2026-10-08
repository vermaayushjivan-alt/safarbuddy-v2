import { describe, it, expect } from 'vitest';
import {
  mapCashfreeRefundStatus,
  isValidRefundAmount,
  roundToPaise,
  buildRefundId,
} from '@/lib/payments/refund-status';

// GOLIVE-07a — pure helpers. (The SQL functions and Cashfree calls need a real
// Postgres / Cashfree sandbox; see CHANGELOG 2026-10-08 for the walkthrough.)
describe('GOLIVE-07 refund status mapping', () => {
  it('maps final Cashfree states', () => {
    expect(mapCashfreeRefundStatus('SUCCESS')).toBe('success');
    expect(mapCashfreeRefundStatus('success')).toBe('success');
    expect(mapCashfreeRefundStatus('CANCELLED')).toBe('cancelled');
    expect(mapCashfreeRefundStatus('FAILED')).toBe('cancelled');
  });
  it('never treats in-flight or unknown values as final', () => {
    for (const v of ['PENDING', 'ONHOLD', 'SOMETHING_NEW', '', null, undefined]) {
      expect(mapCashfreeRefundStatus(v as string | null | undefined)).toBe('pending');
    }
  });
});

describe('GOLIVE-07 refund amounts', () => {
  it('accepts positive amounts with at most 2 decimals', () => {
    for (const a of [1, 100, 100.5, 100.55, 0.01, 1499.99]) {
      expect(isValidRefundAmount(a)).toBe(true);
    }
  });
  it('rejects zero, negative, NaN, Infinity and 3+ decimals', () => {
    for (const a of [0, -5, NaN, Infinity, 100.555, 0.001]) {
      expect(isValidRefundAmount(a)).toBe(false);
    }
  });
  it('snaps float noise to whole paise', () => {
    expect(isValidRefundAmount(0.1 + 0.2)).toBe(true);
    expect(roundToPaise(0.1 + 0.2)).toBe(0.3);
    expect(roundToPaise(1499.99)).toBe(1499.99);
  });
});

describe('GOLIVE-07 refund id', () => {
  it('is rf_ + alphanumerics, capped in length', () => {
    expect(buildRefundId('ab-cd-12')).toBe('rf_abcd12');
    expect(buildRefundId('a'.repeat(50)).length).toBe(35);
  });
});
