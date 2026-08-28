'use server';

// P0 fix — PROFILE-01: minimal account/profile actions.
//
// This exists solely to close the confirmed payment blocker:orderPayment
// (src/lib/actions/payment.actions.ts) requires users.phone, but nothing
// in registration, Google OAuth, or the on_auth_user_created trigger ever
// sets it, and no page previously let a user set it themselves.
//
// Scope is intentionally minimal — read + update phone (and read-only
// display of email/full_name). No new tables, no new columns. Mirrors
// the existing runAction/ActionResult + direct-Supabase-client pattern
// used throughout src/app/actions/*.

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getAuthUser, resolvePublicUserId } from '@/lib/auth/session';
import { runAction, type ActionResult } from '@/lib/actions/action-result';

export interface MyProfile {
  email: string | null;
  phone: string | null;
  full_name: string | null;
}

export async function getMyProfile(): Promise<MyProfile | null> {
  const authUser = await getAuthUser();
  if (!authUser) return null;

  const supabase = await createClient();

  // P0.2 fix (2026-08-28 session, see ULTRA_PRO_AUDIT.md Section 9):
  // this used to query `.eq('id', authUser.id)` directly, assuming
  // public.users.id === the Supabase Auth uid. That assumption is
  // confirmed false for real accounts — the actual public.users.id is
  // a separate value, resolved via the `auth_user_id` column (see
  // resolvePublicUserId() for the full evidence trail). This was the
  // confirmed root cause of "/profile works for the seeded admin
  // account but not for a normal signed-up account."
  let userRowId: string;
  try {
    userRowId = await resolvePublicUserId(supabase, authUser.id);
  } catch {
    return null;
  }

  const { data, error } = await supabase
    .from('users')
    .select('email, phone, full_name')
    .eq('id', userRowId)
    .single();

  if (error || !data) return null;

  return data as MyProfile;
}

// users.phone is varchar(20) (src/db/schema.ts) — light sanity check only,
// no assumed format, since no phone validation convention exists
// elsewhere in the codebase to follow.
const updatePhoneSchema = z.object({
  phone: z
    .string()
    .trim()
    .min(7, 'Enter a valid phone number.')
    .max(20, 'Phone number is too long.')
    .regex(/^[0-9+()\-\s]+$/, 'Enter a valid phone number.'),
});

export async function updateMyPhoneAction(
  phone: string
): Promise<ActionResult<{ phone: string }>> {
  return runAction(async () => {
    const authUser = await getAuthUser();
    if (!authUser) {
      throw new Error('UNAUTHENTICATED');
    }

    const parsed = updatePhoneSchema.parse({ phone });

    const supabase = await createClient();

    // Same fix as getMyProfile() above — resolve the real
    // public.users.id via auth_user_id before updating.
    const userRowId = await resolvePublicUserId(supabase, authUser.id);

    const { error } = await supabase
      .from('users')
      .update({ phone: parsed.phone })
      .eq('id', userRowId);

    if (error) {
      throw new Error(`Failed to update phone number: ${error.message}`);
    }

    return { phone: parsed.phone };
  });
}
