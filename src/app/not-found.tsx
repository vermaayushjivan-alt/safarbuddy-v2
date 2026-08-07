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
    <main className="flex min-h-screen flex-col items-center justify-center bg-cream p-6">
      <div className="text-center">
        {/* 404 Icon/Number */}
        <div className="font-display text-8xl font-bold text-deep">
          404
        </div>

        {/* Title */}
        <h1 className="mt-4 font-heading text-2xl font-semibold text-ink">
          Page Not Found
        </h1>

        {/* Description */}
        <p className="mt-2 text-ink/60">
          Sorry, we couldn&apos;t find the page you&apos;re looking for.
        </p>

        {/* Action */}
        <Link
          href="/"
          className="focus-ring mt-6 inline-flex items-center justify-center rounded-lg bg-deep px-6 py-3 font-heading text-sm font-medium text-cream transition-colors hover:bg-deep-2"
        >
          Go back home
        </Link>

        {/* Support */}
        <p className="mt-8 text-sm text-ink/50">
          Need help?{' '}
          <a
            href={`mailto:${APP.SUPPORT_EMAIL}`}
            className="text-orange hover:underline"
          >
            Contact support
          </a>
        </p>
      </div>
    </main>
  );
}
