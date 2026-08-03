"use client";

import { useActionState } from "react";
import Link from "next/link";
import { forgotPasswordAction, type AuthActionState } from "@/actions/auth";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { TextField } from "@/components/auth/TextField";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { Alert } from "@/components/auth/Alert";

const initialState: AuthActionState = {};

export default function ForgotPasswordPage() {
  const [state, formAction, isPending] = useActionState(
    forgotPasswordAction,
    initialState
  );

  return (
    <AuthLayout
      eyebrow="Reset password"
      title="Reset your password"
      subtitle="Enter your email and we'll send you a reset link."
      footer={
        <>
          Remembered your password?{" "}
          <Link
            href="/login"
            className="font-medium text-[var(--color-sky)] hover:underline"
          >
            Log in
          </Link>
        </>
      }
    >
      {state.success ? (
        <Alert variant="success">
          If an account exists for that email, a reset link is on its way.
        </Alert>
      ) : (
        <form action={formAction} className="space-y-5" noValidate>
          {state.error && <Alert variant="error">{state.error}</Alert>}

          <TextField
            id="email"
            name="email"
            label="Email"
            type="email"
            autoComplete="email"
            required
            error={state.fieldErrors?.email?.[0]}
          />

          <SubmitButton
            pending={isPending}
            label="Send reset link"
            pendingLabel="Sending link..."
          />
        </form>
      )}
    </AuthLayout>
  );
}
