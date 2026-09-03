// ROOT PATH: src/app/robots.ts
//
// SEO_AUDIT.md §3.1 — no robots policy existed anywhere in the repo.
//
// Disallow list below is derived directly from middleware.ts's
// PUBLIC_ROUTES allowlist and the (auth) route group — i.e. everything
// that is NOT public per the app's own auth boundary, not a guessed
// list. See SEO_AUDIT.md §1 for the confirmed route inventory this is
// built from.

import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/seo/site';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          // Auth flows — never useful to a crawler, and index-worthy
          // content never lives behind them.
          '/login',
          '/register',
          '/forgot-password',
          '/reset-password',
          '/auth/',

          // Authenticated dashboards / role-gated areas (confirmed via
          // middleware.ts + route-group naming, see SEO_AUDIT.md §1).
          '/admin/',
          '/dashboard/',
          '/hotel-owner/',
          '/travel-agent/',
          '/super-admin/',
          '/vendor/',
          '/profile',
          '/unauthorized',

          // Transactional / payment routes — no search intent, and
          // some carry booking-specific query params.
          '/payment/',
          '/hotels/*/book',
          '/packages/*/book',

          // Internal API surface.
          '/api/',
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}

