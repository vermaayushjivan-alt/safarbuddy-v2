'use server';

// GOLIVE-12 — customer account deletion (DPDP / Play Store requirement).
//
// Flow: re-authenticate -> anonymise public.users + invoice snapshots in one
// atomic SQL call (migration 040) -> soft-delete the Supabase Auth user ->
// sign out. Bookings/payments/invoices are KEPT (tax and accounting records),
// with the personal details removed.
//
// The Auth user is SOFT-deleted on purpose: a hard delete could cascade into
// public tables that reference it and wipe booking history.

import { z } from 'zod';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { getAuthUser, resolvePublicUserId } from '@/lib/auth/session';
import { runAction, type ActionResult } from '@/lib/actions/action-result';
import { checkRateLimit, tooManyRequestsMessage } from '@/lib/security/rate-limit';

const REAUTH_WINDOW_MS = 10 * 60 * 1000;

const inputSchema = z.object({
  confirmText: z.string().trim(),
  password: z.string().optional(),
});

const DB_ERROR_MESSAGES: Record<string, string> = {
  ACTIVE_BOOKING:
    'You have a pending or confirmed booking. Cancel it or wait until it is completed, then try again.',
  REFUND_PENDING:
    'A refund for one of your bookings is still being processed. Please try again once it is complete.',
  NOT_CUSTOMER_ACCOUNT:
    'This account has a hotel, vendor or staff role. Please contact support to close it.',
  USER_NOT_FOUND: 'We could not find your profile. Please contact support.',
};

function mapDbError(message: string): string | null {
  for (const code of Object.keys(DB_ERROR_MESSAGES)) {
    if (message.includes(code)) return DB_ERROR_MESSAGES[code];
  }
  return null;
}

/** True when the account can sign in with an email + password. */
export async function accountUsesPassword(): Promise<boolean> {
  const authUser = await getAuthUser();
  if (!authUser) return false;
  return (authUser.identities ?? []).some((i) => i.provider === 'email');
}

export async function deleteMyAccountAction(
  input: unknown
): Promise<ActionResult<{ deleted: true }>> {
  return runAction(async () => {
    const authUser = await getAuthUser();
    if (!authUser) throw new Error('UNAUTHENTICATED');

    // Slow down password guessing through this form.
    const limit = await checkRateLimit('delete-account', authUser.id, {
      limit: 5,
      windowSeconds: 900,
    });
    if (!limit.allowed) {
      throw new Error(tooManyRequestsMessage(limit.retryAfterSeconds, 'attempts'));
    }

    const parsed = inputSchema.parse(input);
    if (parsed.confirmText !== 'DELETE') {
      throw new Error('Type DELETE (in capital letters) to confirm.');
    }

    // ---- Re-authentication ------------------------------------------------
    const usesPassword = (authUser.identities ?? []).some((i) => i.provider === 'email');

    if (usesPassword) {
      if (!parsed.password) throw new Error('Enter your password to confirm.');
      if (!authUser.email) throw new Error('Your account has no email on file. Contact support.');

      // Separate, non-persisting client: this check must not touch the session cookies.
      const verifier = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
      );
      const { error: pwError } = await verifier.auth.signInWithPassword({
        email: authUser.email,
        password: parsed.password,
      });
      if (pwError) throw new Error('Incorrect password.');
    } else {
      // Google-only account: no password exists, so require a fresh sign-in.
      const lastSignIn = authUser.last_sign_in_at ? Date.parse(authUser.last_sign_in_at) : 0;
      if (!lastSignIn || Date.now() - lastSignIn > REAUTH_WINDOW_MS) {
        throw new Error(
          'For your security, please log out, sign in again with Google, and then delete your account within 10 minutes.'
        );
      }
    }

    // ---- Anonymise (atomic, blocks active bookings / pending refunds) -------
    const admin = createServiceRoleClient();
    const userRowId = await resolvePublicUserId(admin, authUser.id);

    const { error: rpcError } = await admin.rpc('anonymize_user_account', {
      p_user_id: userRowId,
    });
    if (rpcError) {
      const friendly = mapDbError(rpcError.message ?? '');
      if (friendly) throw new Error(friendly);
      console.error('[account-deletion] anonymize failed', rpcError);
      throw new Error('We could not delete your account right now. Please contact support.');
    }

    // ---- Remove the login (soft delete keeps the id for foreign keys) -------
    const { error: authDeleteError } = await admin.auth.admin.deleteUser(authUser.id, true);
    if (authDeleteError) {
      // Personal data is already gone. Make sure the login cannot be used.
      console.error('[account-deletion] auth soft-delete failed, banning instead', authDeleteError);
      const { error: banError } = await admin.auth.admin.updateUserById(authUser.id, {
        ban_duration: '876000h',
      });
      if (banError) {
        console.error('[account-deletion] ban fallback failed', banError);
        // TODO: alerting (RULE 39) — a deleted customer may still be able to log in.
      }
    }

    // ---- End this browser session -------------------------------------------
    try {
      const supabase = await createClient();
      await supabase.auth.signOut();
    } catch (err) {
      console.error('[account-deletion] signOut failed', err);
    }

    return { deleted: true as const };
  });
}
