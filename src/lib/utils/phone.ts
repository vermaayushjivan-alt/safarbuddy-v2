// ROOT PATH: src/lib/utils/phone.ts
// PHONE-01 — one place that understands phone numbers (pure, no imports).
//
// Customers should NOT have to type a country code. A number without one is
// treated as an Indian mobile: 10 digits starting 6-9 (a leading 0 or 91 is
// tolerated). To use another country, start with + and its code (+44 ...).
//
//   stored  : what we save in the database  -> "+919876543210"
//   gateway : what we send to Cashfree      -> "9876543210" (Indian)
//                                              "+447911123456" (international)

export interface NormalizedPhone {
  valid: boolean;
  stored: string;
  gateway: string;
}

const INVALID: NormalizedPhone = { valid: false, stored: '', gateway: '' };
const INDIAN_MOBILE = /^[6-9]\d{9}$/;

function indian(national: string): NormalizedPhone {
  return INDIAN_MOBILE.test(national)
    ? { valid: true, stored: `+91${national}`, gateway: national }
    : INVALID;
}

export function normalizePhone(raw: string | null | undefined): NormalizedPhone {
  const text = (raw ?? '').trim();
  if (!text) return INVALID;

  // only digits, spaces, dashes, dots, brackets, and a single leading +
  if (/[^0-9+()\-\s.]/.test(text)) return INVALID;
  if (text.indexOf('+', 1) !== -1) return INVALID;

  let hasPlus = text.startsWith('+');
  let digits = text.replace(/\D/g, '');

  // 0091... is the same as +91...
  if (!hasPlus && digits.startsWith('00')) {
    hasPlus = true;
    digits = digits.slice(2);
  }

  if (hasPlus) {
    if (digits.startsWith('91')) return indian(digits.slice(2));
    if (digits.length >= 8 && digits.length <= 15 && !digits.startsWith('0')) {
      return { valid: true, stored: `+${digits}`, gateway: `+${digits}` };
    }
    return INVALID;
  }

  // No country code typed: assume India.
  if (digits.length === 10) return indian(digits);
  if (digits.length === 11 && digits.startsWith('0')) return indian(digits.slice(1));
  if (digits.length === 12 && digits.startsWith('91')) return indian(digits.slice(2));

  return INVALID;
}

export const PHONE_HELP_TEXT =
  '10-digit mobile number. +91 is added automatically. For another country, start with + and the country code.';
