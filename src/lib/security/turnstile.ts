import { headers } from 'next/headers';

// LAUNCH-02 — Cloudflare Turnstile server-side verification.
//
// RULE 30 (third-party integration status): Turnstile is ACTIVE once
// TURNSTILE_SECRET_KEY is set. If the secret is NOT configured, the check
// is gated OFF: it logs a warning and lets the request through, so a
// deploy that forgot the env var does not lock every visitor out of
// signup. If the secret IS set, a missing/invalid token is rejected
// (fail closed).
//
// Intentionally reads process.env at call time (not the module-level
// validated `env` object) so a Vercel env change takes effect on the
// next request after redeploy without touching other modules.

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export type CaptchaResult = { ok: true } | { ok: false; error: string };

export async function verifyCaptcha(
  token: string | null | undefined
): Promise<CaptchaResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  if (!secret) {
    console.warn(
      '[verifyCaptcha] TURNSTILE_SECRET_KEY is not set — CAPTCHA check skipped.'
    );
    return { ok: true };
  }

  if (!token) {
    return {
      ok: false,
      error: 'Please complete the security check and try again.',
    };
  }

  let ip: string | undefined;
  try {
    const h = await headers();
    ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined;
  } catch {
    ip = undefined;
  }

  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip) body.set('remoteip', ip);

    const res = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      cache: 'no-store',
    });
    const data = (await res.json()) as { success?: boolean };

    if (data.success) return { ok: true };

    return {
      ok: false,
      error: 'Security check failed. Please try again.',
    };
  } catch (err) {
    // RULE 38: never swallow silently. TODO: alerting (RULE 39).
    console.error('[verifyCaptcha] Turnstile verification request failed', err);
    return {
      ok: false,
      error: 'Could not verify the security check. Please try again.',
    };
  }
}
