"use client";

import { useActionState } from "react";
import Link from "next/link";
import { forgotPasswordAction, type AuthActionState } from "@/actions/auth";

const initialState: AuthActionState = {};

export default function ForgotPasswordPage() {
  const [state, formAction, isPending] = useActionState(
    forgotPasswordAction,
    initialState
  );

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-neutral-900">
          Reset your password
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Enter your email and we&apos;ll send you a reset link.
        </p>

        {state.success ? (
          <p className="mt-6 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
            If an account exists for that email, a reset link is on its way.
          </p>
        ) : (
          <form action={formAction} className="mt-6 space-y-4">
            {state.error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                {state.error}
              </p>
            )}

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

            <button
              type="submit"
              disabled={isPending}
              className="w-full rounded-lg bg-neutral-900 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-60"
            >
              {isPending ? "Sending link..." : "Send reset link"}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-neutral-500">
          Remembered your password?{" "}
          <Link
            href="/login"
            className="font-medium text-neutral-900 hover:underline"
          >
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
