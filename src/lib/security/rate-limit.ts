import 'server-only';

import { createHash } from 'node:crypto';
import { headers } from 'next/headers';
import { createServiceRoleClient } from '@/lib/supabase/server';

// GOLIVE-10 — rate limiting backed by public.check_rate_limit() (migration 039).
//
// Fail-open on purpose: if the limiter itself breaks (table missing, DB blip),
// customers must still be able to log in and book. The failure is logged
// (RULE 38). TODO: alerting (RULE 39) once Sentry exists (GOLIVE-18).

export const RATE_LIMITS = {
  AI_PER_IP_MINUTE: { limit: 8, windowSeconds: 60 },
  AI_PER_IP_DAY: { limit: 100, windowSeconds: 86_400 },
  AI_GLOBAL_DAY: { limit: 3_000, windowSeconds: 86_400 },
  LOGIN_PER_IP: { limit: 20, windowSeconds: 900 },
  LOGIN_PER_EMAIL: { limit: 8, windowSeconds: 900 },
  REGISTER_PER_IP: { limit: 5, windowSeconds: 3_600 },
  FORGOT_PER_IP: { limit: 5, windowSeconds: 3_600 },
  FORGOT_PER_EMAIL: { limit: 3, windowSeconds: 3_600 },
  BOOKING_PER_USER: { limit: 10, windowSeconds: 600 },
} as const;

export type RateLimitRule = { limit: number; windowSeconds: number };

export type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

/** Best-effort client IP. On Vercel the first x-forwarded-for entry is the client. */
export async function getClientIp(): Promise<string> {
  try {
    const h = await headers();
    const forwarded = h.get('x-forwarded-for')?.split(',')[0]?.trim();
    return forwarded || h.get('x-real-ip')?.trim() || 'unknown';
  } catch {
    return 'unknown';
  }
}

/** Hash identifiers (emails) so no personal data is stored in rate_limits. */
export function hashIdentifier(value: string): string {
  return createHash('sha256').update(value.trim().toLowerCase()).digest('hex').slice(0, 32);
}

export async function checkRateLimit(
  scope: string,
  identifier: string,
  rule: RateLimitRule
): Promise<RateLimitResult> {
  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase.rpc('check_rate_limit', {
      p_bucket: `${scope}:${identifier}`,
      p_limit: rule.limit,
      p_window_seconds: rule.windowSeconds,
    });

    if (error) throw error;

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) throw new Error('check_rate_limit returned no row');

    return {
      allowed: Boolean(row.out_allowed),
      retryAfterSeconds: Number(row.out_retry_after) || rule.windowSeconds,
    };
  } catch (err) {
    console.error('[rate-limit] check failed, allowing request', { scope, err });
    return { allowed: true, retryAfterSeconds: 0 };
  }
}

/** First rule that is exceeded wins; returns null when all pass. */
export async function firstExceeded(
  checks: Array<{ scope: string; identifier: string; rule: RateLimitRule }>
): Promise<RateLimitResult | null> {
  for (const c of checks) {
    const result = await checkRateLimit(c.scope, c.identifier, c.rule);
    if (!result.allowed) return result;
  }
  return null;
}

export function tooManyRequestsMessage(retryAfterSeconds: number, what = 'requests'): string {
  const minutes = Math.ceil(retryAfterSeconds / 60);
  const wait =
    retryAfterSeconds < 60 ? 'a minute' : minutes === 1 ? '1 minute' : `${minutes} minutes`;
  return `Too many ${what}. Please try again in ${wait}.`;
}
