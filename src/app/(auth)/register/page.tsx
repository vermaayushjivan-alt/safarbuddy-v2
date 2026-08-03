"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  registerAction,
  googleLoginAction,
  type AuthActionState,
} from "@/actions/auth";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { TextField } from "@/components/auth/TextField";
import { PasswordField } from "@/components/auth/PasswordField";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { Alert } from "@/components/auth/Alert";

const initialState: AuthActionState = {};

export default function RegisterPage() {
  const [state, formAction, isPending] = useActionState(
    registerAction,
    initialState
  );

  if (state.success) {
    return (
      <AuthLayout
        eyebrow="Almost there"
        title="Check your inbox"
        subtitle="One more step before you can start booking."
      >
        <Alert variant="success">
          We&apos;ve sent a confirmation link to your email. Verify your
          address to finish creating your account.
        </Alert>
        <Link
          href="/login"
          className="mt-6 inline-block text-sm font-medium text-[var(--color-sky)] hover:underline"
        >
          Back to login
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      eyebrow="Join SafarBuddy"
      title="Create your account"
      subtitle="Join SafarBuddy and start planning your next trip."
      footer={
        <>
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-[var(--color-sky)] hover:underline"
          >
            Log in
          </Link>
        </>
      }
    >
      <form action={formAction} className="space-y-5" noValidate>
        {state.error && <Alert variant="error">{state.error}</Alert>}

        <TextField
          id="fullName"
          name="fullName"
          label="Full name"
          autoComplete="name"
          required
          error={state.fieldErrors?.fullName?.[0]}
        />

        <TextField
          id="email"
          name="email"
          label="Email"
          type="email"
          autoComplete="email"
          required
          error={state.fieldErrors?.email?.[0]}
        />

        <PasswordField
          id="password"
          name="password"
          label="Password"
          autoComplete="new-password"
          required
          error={state.fieldErrors?.password?.[0]}
        />

        <PasswordField
          id="confirmPassword"
          name="confirmPassword"
          label="Confirm password"
          autoComplete="new-password"
          required
          error={state.fieldErrors?.confirmPassword?.[0]}
        />

        <SubmitButton
          pending={isPending}
          label="Create account"
          pendingLabel="Creating account..."
        />
      </form>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-[var(--color-mist)]" />
        <span className="text-xs text-[var(--color-ink)]/35">or</span>
        <div className="h-px flex-1 bg-[var(--color-mist)]" />
      </div>

      <form action={googleLoginAction}>
        <button
          type="submit"
          className="w-full rounded-xl border border-[var(--color-mist)] py-2.5 text-sm font-medium text-[var(--color-ink)] transition hover:bg-[var(--color-mist-2)]"
        >
          Continue with Google
        </button>
      </form>
    </AuthLayout>
  );
}
