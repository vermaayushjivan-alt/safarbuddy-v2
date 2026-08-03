"use client";

import { Suspense, useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { loginAction, googleLoginAction, type AuthActionState } from "@/actions/auth";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { TextField } from "@/components/auth/TextField";
import { PasswordField } from "@/components/auth/PasswordField";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { Alert } from "@/components/auth/Alert";

const initialState: AuthActionState = {};

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFormSkeleton />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginFormSkeleton() {
  return (
    <AuthLayout
      eyebrow="Welcome back"
      title="Log in to SafarBuddy"
      subtitle="Book flights, hotels and holiday packages in seconds."
    >
      <div className="space-y-5" aria-hidden="true">
        <div className="h-[68px] animate-pulse rounded-xl bg-neutral-100" />
        <div className="h-[68px] animate-pulse rounded-xl bg-neutral-100" />
        <div className="h-10 animate-pulse rounded-xl bg-neutral-100" />
      </div>
    </AuthLayout>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? "";
  const oauthError = searchParams.get("error");

  const [state, formAction, isPending] = useActionState(
    loginAction,
    initialState
  );

  return (
    <AuthLayout
      eyebrow="Welcome back"
      title="Log in to SafarBuddy"
      subtitle="Book flights, hotels and holiday packages in seconds."
      footer={
        <>
          New to SafarBuddy?{" "}
          <Link
            href="/register"
            className="font-medium text-teal-700 hover:underline"
          >
            Create an account
          </Link>
        </>
      }
    >
      <form action={formAction} className="space-y-5" noValidate>
        <input type="hidden" name="redirectTo" value={redirectTo} />

        {(state.error || oauthError) && (
          <Alert variant="error">{state.error ?? oauthError}</Alert>
        )}

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
          autoComplete="current-password"
          required
          error={state.fieldErrors?.password?.[0]}
          rightSlot={
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-teal-700 hover:underline"
            >
              Forgot password?
            </Link>
          }
        />

        <label className="flex select-none items-center gap-2 text-sm text-neutral-600">
          <input
            type="checkbox"
            name="rememberMe"
            className="h-4 w-4 rounded border-neutral-300 text-teal-700 focus:ring-teal-600/30"
          />
          Remember me
        </label>

        <SubmitButton
          pending={isPending}
          label="Log in"
          pendingLabel="Logging in..."
        />
      </form>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-neutral-200" />
        <span className="text-xs text-neutral-400">or</span>
        <div className="h-px flex-1 bg-neutral-200" />
      </div>

      <form action={googleLoginAction}>
        <input type="hidden" name="redirectTo" value={redirectTo} />
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-neutral-300 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
        >
          <GoogleIcon />
          Continue with Google
        </button>
      </form>
    </AuthLayout>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.85.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.95v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.95A9 9 0 0 0 0 9c0 1.45.35 2.83.95 4.05l3.02-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .95 4.95l3.02 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}
