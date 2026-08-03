/**
 * AuthLayout
 *
 * WHY IT EXISTS:
 * - Single shared shell for every auth screen (login, register, forgot password)
 * - Keeps branding, spacing, and card chrome consistent across AUTH-02
 *
 * RESPONSIBILITY:
 * - Render the SafarBuddy auth card (eyebrow, title, subtitle, footer)
 * - Provide a consistent, on-brand background using the site's design tokens
 *
 * SERVER/CLIENT: Either (no hooks, safe inside client pages)
 *
 * USED BY: login/page.tsx, register/page.tsx (and future auth screens)
 */

import Link from "next/link";
import type { ReactNode } from "react";

interface AuthLayoutProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthLayout({
  eyebrow,
  title,
  subtitle,
  children,
  footer,
}: AuthLayoutProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--color-cream)] px-4 py-12">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="focus-ring mb-8 flex items-center justify-center gap-2 rounded-lg font-heading text-lg font-semibold text-[var(--color-deep)]"
        >
          Safar<span className="text-[var(--color-orange)]">Buddy</span>
        </Link>

        <div className="rounded-2xl border border-[var(--color-mist)] bg-white p-8 shadow-sm shadow-[var(--color-ink)]/5">
          {eyebrow && (
            <p className="font-tag text-xs uppercase tracking-wider text-[var(--color-orange)]">
              {eyebrow}
            </p>
          )}
          <h1 className="mt-2 font-display text-2xl font-semibold text-[var(--color-ink)]">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-sm text-[var(--color-ink)]/60">
              {subtitle}
            </p>
          )}

          <div className="mt-6">{children}</div>
        </div>

        {footer && (
          <p className="mt-6 text-center text-sm text-[var(--color-ink)]/60">
            {footer}
          </p>
        )}
      </div>
    </main>
  );
}
