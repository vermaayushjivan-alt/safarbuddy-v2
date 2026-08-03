"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { loginAction, googleLoginAction, type AuthActionState } from "@/actions/auth";

const initialState: AuthActionState = {};

export default function LoginPage() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? "";
  const oauthError = searchParams.get("error");

  const [state, formAction, isPending] = useActionState(
    loginAction,
    initialState
  );

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-neutral-900">
          Log in to SafarBuddy
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Welcome back — book your next trip in seconds.
        </p>

        {(state.error || oauthError) && (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {state.error ?? oauthError}
          </p>
        )}

        <form action={formAction} className="mt-6 space-y-4">
          <input type="hidden" name="redirectTo" value={redirectTo} />

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-neutral-700"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
            />
            {state.fieldErrors?.email && (
              <p className="mt-1 text-xs text-red-600">
                {state.fieldErrors.email[0]}
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-neutral-700"
              >
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-neutral-500 hover:text-neutral-900"
              >
                Forgot password?
              </Link>
            </div>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
            />
            {state.fieldErrors?.password && (
              <p className="mt-1 text-xs text-red-600">
                {state.fieldErrors.password[0]}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-lg bg-neutral-900 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-60"
          >
            {isPending ? "Logging in..." : "Log in"}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-neutral-200" />
          <span className="text-xs text-neutral-400">or</span>
          <div className="h-px flex-1 bg-neutral-200" />
        </div>

        <form action={googleLoginAction}>
          <input type="hidden" name="redirectTo" value={redirectTo} />
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-neutral-300 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
          >
            <GoogleIcon />
            Continue with Google
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-neutral-500">
          New to SafarBuddy?{" "}
          <Link
            href="/register"
            className="font-medium text-neutral-900 hover:underline"
          >
            Create an account
          </Link>
        </p>
      </div>
    </main>
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
