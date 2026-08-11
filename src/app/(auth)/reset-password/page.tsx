"use client";

import { useActionState } from "react";
import Link from "next/link";
import { resetPasswordAction, type AuthActionState } from "@/actions/auth";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { PasswordField } from "@/components/auth/PasswordField";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { Alert } from "@/components/auth/Alert";

const initialState: AuthActionState = {};

export default function ResetPasswordPage() {
  const [state, formAction, isPending] = useActionState(
    resetPasswordAction,
    initialState
  );

  return (
    <AuthLayout
      eyebrow="Reset password"
      title="Choose a new password"
      subtitle="Enter a new password for your SafarBuddy account."
      footer={
        !state.success && (
          <>
            Remembered it after all?{" "}
            <Link
              href="/login"
              className="font-medium text-[var(--color-sky)] hover:underline"
            >
              Log in
            </Link>
          </>
        )
      }
    >
      {state.success ? (
        <>
          <Alert variant="success">
            Your password has been updated. You can log in with your new
            password now.
          </Alert>
          <Link
            href="/login"
            className="mt-6 inline-block text-sm font-medium text-[var(--color-sky)] hover:underline"
          >
            Back to login
          </Link>
        </>
      ) : (
        <form action={formAction} className="space-y-5" noValidate>
          {state.error && <Alert variant="error">{state.error}</Alert>}

          <PasswordField
            id="password"
            name="password"
            label="New password"
            autoComplete="new-password"
            required
            error={state.fieldErrors?.password?.[0]}
          />

          <PasswordField
            id="confirmPassword"
            name="confirmPassword"
            label="Confirm new password"
            autoComplete="new-password"
            required
            error={state.fieldErrors?.confirmPassword?.[0]}
          />

          <SubmitButton
            pending={isPending}
            label="Update password"
            pendingLabel="Updating..."
          />
        </form>
      )}
    </AuthLayout>
  );
}
