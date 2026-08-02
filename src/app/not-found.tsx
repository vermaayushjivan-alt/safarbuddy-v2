/**
 * 404 Not Found Page
 * 
 * WHY IT EXISTS:
 * - Handle routes that don't exist
 * - Provide user-friendly error page
 * 
 * RESPONSIBILITY:
 * - Display 404 error message
 * - Provide navigation options
 * 
 * SERVER/CLIENT: Server Component
 * 
 * USED BY: Next.js when route is not found
 */

import Link from 'next/link';
import { APP } from '@/lib/config/constants';

export default function NotFoundPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="text-center">
        {/* 404 Icon/Number */}
        <div className="text-8xl font-bold text-[rgb(var(--color-primary))]">
          404
        </div>
        
        {/* Title */}
        <h1 className="mt-4 text-2xl font-semibold text-[rgb(var(--color-text-primary))]">
          Page Not Found
        </h1>
        
        {/* Description */}
        <p className="mt-2 text-[rgb(var(--color-text-secondary))]">
          Sorry, we couldn&apos;t find the page you&apos;re looking for.
        </p>
        
        {/* Action */}
        <Link
          href="/"
          className="mt-6 inline-flex items-center justify-center rounded-lg bg-[rgb(var(--color-primary))] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[rgb(var(--color-primary-hover))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--color-primary))] focus:ring-offset-2"
        >
          Go back home
        </Link>
        
        {/* Support */}
        <p className="mt-8 text-sm text-[rgb(var(--color-text-muted))]">
          Need help?{' '}
          <a
            href={`mailto:${APP.SUPPORT_EMAIL}`}
            className="text-[rgb(var(--color-secondary))] hover:underline"
          >
            Contact support
          </a>
        </p>
      </div>
    </main>
  );
}
