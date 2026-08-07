'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { APP } from '@/lib/config/constants';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-cream p-6">
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-orange/10">
          <svg
            className="h-8 w-8 text-orange"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        <h1 className="mt-4 font-heading text-2xl font-semibold text-ink">
          Something went wrong
        </h1>

        <p className="mt-2 text-ink/60">
          We encountered an unexpected error. Please try again.
        </p>

        {process.env.NODE_ENV === 'development' && (
          <details className="mt-4 rounded-lg bg-mist p-4 text-left text-sm">
            <summary className="cursor-pointer font-medium text-ink">
              Error details
            </summary>

            <pre className="mt-2 overflow-auto whitespace-pre-wrap text-xs text-orange">
              {error.message}
              {error.digest && `\n\nDigest: ${error.digest}`}
            </pre>
          </details>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={reset}
            className="focus-ring inline-flex items-center justify-center rounded-lg bg-deep px-6 py-3 font-heading text-sm font-medium text-cream transition-colors hover:bg-deep-2"
          >
            Try again
          </button>

          <Link
            href="/"
            className="focus-ring inline-flex items-center justify-center rounded-lg border border-deep/15 bg-white px-6 py-3 font-heading text-sm font-medium text-ink transition-colors hover:bg-mist"
          >
            Go home
          </Link>
        </div>

        <p className="mt-8 text-sm text-ink/50">
          If this problem persists,{' '}
          <a
            href={`mailto:${APP.SUPPORT_EMAIL}`}
            className="text-orange hover:underline"
          >
            contact support
          </a>
        </p>
      </div>
    </main>
  );
}
