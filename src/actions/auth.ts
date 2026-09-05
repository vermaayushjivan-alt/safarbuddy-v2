"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";

/* -------------------------------------------------------------------------- */
/* Validation                                                                 */
/* -------------------------------------------------------------------------- */

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

const registerSchema = z
  .object({
    fullName: z.string().min(2, "Full name is too short."),
    email: z.string().email("Enter a valid email address."),
    password: z.string().min(6, "Password must be at least 6 characters."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

const forgotPasswordSchema = z.object({
  email: z.string().email("Enter a valid email address."),
});

const resetPasswordSchema = z
  .object({
    password: z.string().min(6, "Password must be at least 6 characters."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type AuthActionState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
};

/* -------------------------------------------------------------------------- */
/* Site URL                                                                   */
/* -------------------------------------------------------------------------- */

// P0 fix: NEXT_PUBLIC_SITE_URL is not part of the validated env schema
// (src/lib/config/env.ts) and is not documented in .env.example — if
// unset, the three redirect URLs below previously resolved to the
// literal string "undefined/auth/callback...", which Google/Supabase
// reject as an invalid redirect_uri. NEXT_PUBLIC_APP_URL is the
// canonical, validated variable (validated with a default in env.ts,
// documented in .env.example) — same fallback order already used by
// src/lib/actions/payment.actions.ts's siteUrl helper, reused here
// rather than inventing a new pattern.
function getSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000"
  );
}

/* -------------------------------------------------------------------------- */
/* Email / Password Login                                                     */
/* -------------------------------------------------------------------------- */

export async function loginAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { error: error.message };
  }

  const redirectTo = formData.get("redirectTo");

  if (typeof redirectTo === "string" && redirectTo) {
    redirect(redirectTo);
  }

  // P0.3 Step 4 — smart default redirect (2026-09-05 session, see
  // SESSION_HANDOFF.md). Only applies when the caller didn't already
  // ask for a specific page (e.g. via ?redirectTo=... from middleware
  // bouncing an unauthenticated visit) — that explicit request always
  // wins, unchanged, above.
  //
  // Scope note (Bible Rule 12 — stating the assumption rather than
  // guessing silently): there is no `has_logged_in_before` column or
  // similar on `users`/`vendors` to actually distinguish a hotel_owner's
  // FIRST login from a later one (adding one wasn't done here — Bible
  // Rule 7, no inventing schema), so this applies on every default-
  // landing login for a hotel_owner, not literally only the first. In
  // practice this is the only login that matters for that role: once
  // an owner reaches /hotel-owner they naturally navigate from there,
  // and a plain hotel_owner has no reason to land on the public
  // homepage instead of their own dashboard.
  let destination = "/";

  try {
    const current = await getCurrentUser();
    const roles = current?.roles ?? [];
    const isPlainOwner =
      roles.includes("hotel_owner") &&
      !roles.includes("admin") &&
      !roles.includes("super_admin");

    if (isPlainOwner) {
      destination = "/hotel-owner";
    }
  } catch {
    // Role lookup failing here must never block an otherwise-successful
    // login — same reasoning as every other best-effort catch in this
    // codebase (RULE 38: still worth knowing about, even though it
    // can't be allowed to fail the request).
    console.error(
      "[loginAction] role lookup for smart redirect failed; defaulting to /"
    );
  }

  redirect(destination);
}

/* -------------------------------------------------------------------------- */
/* Register                                                                   */
/* -------------------------------------------------------------------------- */

export async function registerAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const parsed = registerSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { fullName, email, password } = parsed.data;

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${getSiteUrl()}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  // public.users row is created by the `on_auth_user_created` Postgres
  // trigger (see src/db/sql/001_auth_sync_trigger.sql) — no manual insert
  // needed here, and doing one here would race the trigger.

  return { success: true };
}

/* -------------------------------------------------------------------------- */
/* Google Login                                                               */
/* -------------------------------------------------------------------------- */

export async function googleLoginAction(formData: FormData) {
  const redirectTo = formData.get("redirectTo");
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${getSiteUrl()}/auth/callback${
        typeof redirectTo === "string" && redirectTo
          ? `?redirectTo=${encodeURIComponent(redirectTo)}`
          : ""
      }`,
    },
  });

  if (error || !data.url) {
    redirect(
      `/login?error=${encodeURIComponent(
        error?.message ?? "Google sign-in failed."
      )}`
    );
  }

  redirect(data.url);
}

/* -------------------------------------------------------------------------- */
/* Forgot Password                                                            */
/* -------------------------------------------------------------------------- */

export async function forgotPasswordAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    {
      redirectTo: `${getSiteUrl()}/auth/callback?next=/reset-password`,
    }
  );

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

/* -------------------------------------------------------------------------- */
/* Reset Password                                                             */
/* -------------------------------------------------------------------------- */

// STABILIZATION fix: forgotPasswordAction sends users to
// /auth/callback?next=/reset-password after they click the emailed link.
// The callback route already exchanges the code for a session (see
// src/app/auth/callback/route.ts), so this action only needs to update
// the password on the now-authenticated session — it does not re-verify
// the reset token itself. No new auth architecture introduced; reuses
// the existing Supabase client + AuthActionState pattern used by every
// other action in this file.
export async function resetPasswordAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();

  // No active session means the reset link was missing, expired, or
  // already used — the callback route would not have reached this page
  // with a valid session in that case.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error:
        "This reset link has expired or was already used. Please request a new one.",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

/* -------------------------------------------------------------------------- */
/* Logout                                                                     */
/* -------------------------------------------------------------------------- */

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
