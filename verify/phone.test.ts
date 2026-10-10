import { describe, expect, it } from 'vitest';
import { normalizePhone } from '@/lib/utils/phone';

describe('normalizePhone', () => {
  it('10 digits, no country code -> Indian, +91 added', () => {
    const n = normalizePhone('9876543210');
    expect(n).toEqual({ valid: true, stored: '+919876543210', gateway: '9876543210' });
  });
  it('accepts spaces, dashes and +91', () => {
    expect(normalizePhone('+91 98765-43210').stored).toBe('+919876543210');
    expect(normalizePhone('98765 43210').gateway).toBe('9876543210');
  });
  it('tolerates a leading 0 or 91 without +', () => {
    expect(normalizePhone('098765 43210').stored).toBe('+919876543210');
    expect(normalizePhone('919876543210').stored).toBe('+919876543210');
    expect(normalizePhone('0091 9876543210').stored).toBe('+919876543210');
  });
  it('other countries need + and a country code', () => {
    const n = normalizePhone('+44 7911 123456');
    expect(n).toEqual({ valid: true, stored: '+447911123456', gateway: '+447911123456' });
  });
  it('rejects bad numbers', () => {
    for (const bad of ['', '   ', '12345', '5876543210', 'abcdefghij', '98765432100', '98+76543210', '+91 12345 67890', '+0 123']) {
      expect(normalizePhone(bad).valid, bad).toBe(false);
    }
    expect(normalizePhone(null).valid).toBe(false);
    expect(normalizePhone(undefined).valid).toBe(false);
  });
});
