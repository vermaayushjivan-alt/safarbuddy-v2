/**
 * Error Boundary Page
 * 
 * WHY IT EXISTS:
 * - Handle runtime errors gracefully
 * - Provide recovery options
 * - Prevent white screen of death
 * 
 * RESPONSIBILITY:
 * - Display error message
 * - Provide retry functionality
 * - Log errors for debugging
 * 
 * SERVER/CLIENT: Client Component (required for error boundaries)
 * 
 * USED BY: Next.js when an error occurs in any route segment
 */

'use client';

import { useEffect } from 'react';
import { APP } from '@/lib/config/constants';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Log error to console in development
    // In production, this would send to error tracking service
    console.error('Application error:', error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="text-center">
        {/* Error Icon */}
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[rgb(var(--color-destructive-light))]">
          <svg
            className="h-8 w-8 text-[rgb(var(--color-destructive))]"
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
        
        {/* Title */}
        <h1 className="mt-4 text-2xl font-semibold text-[rgb(var(--color-text-primary))]">
          Something went wrong
        </h1>
        
        {/* Description */}
        <p className="mt-2 text-[rgb(var(--color-text-secondary))]">
          We encountered an unexpected error. Please try again.
        </p>
        
        {/* Error Details (development only) */}
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-4 rounded-lg bg-[rgb(var(--color-muted))] p-4 text-left text-sm">
            <summary className="cursor-pointer font-medium text-[rgb(var(--color-text-primary))]">
              Error details
            </summary>
            <pre className="mt-2 overflow-auto whitespace-pre-wrap text-xs text-[rgb(var(--color-destructive))]">
              {error.message}
              {error.digest && `\n\nDigest: ${error.digest}`}
            </pre>
          </details>
        )}
        
        {/* Actions */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center rounded-lg bg-[rgb(var(--color-primary))] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[rgb(var(--color-primary-hover))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--color-primary))] focus:ring-offset-2"
          >
            Try again
          </button>
          
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-lg border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] px-6 py-3 text-sm font-medium text-[rgb(var(--color-text-primary))] transition-colors hover:bg-[rgb(var(--color-muted))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--color-primary))] focus:ring-offset-2"
          >
            Go home
          </a>
        </div>
        
        {/* Support */}
        <p className="mt-8 text-sm text-[rgb(var(--color-text-muted))]">
          If this problem persists,{' '}
          <a
            href={`mailto:${APP.SUPPORT_EMAIL}`}
            className="text-[rgb(var(--color-secondary))] hover:underline"
          >
            contact support
          </a>
        </p>
      </div>
    </main>
  );
}
