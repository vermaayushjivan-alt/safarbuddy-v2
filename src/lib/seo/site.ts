// ROOT PATH: src/lib/seo/site.ts
//
// Single source of truth for site-wide SEO constants: canonical site
// URL, site name, and the absolute-URL helper every generateMetadata()
// function and the sitemap/robots routes build on.
//
// getSiteUrl() intentionally mirrors the existing
// NEXT_PUBLIC_SITE_URL || NEXT_PUBLIC_APP_URL fallback already used in
// src/actions/auth.ts, src/app/actions/property-listing.actions.ts, and
// src/lib/actions/payment.actions.ts (RULE 3/6 — matching an existing
// convention rather than inventing a new one). Not refactoring those
// call sites to import this helper in this session — out of scope for
// an SEO change, kept here only as the new canonical implementation for
// SEO-specific code (sitemap, robots, metadata).

export function getSiteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'http://localhost:3000';

  // Metadata APIs (alternates.canonical, openGraph.url, sitemap entries)
  // all require an absolute URL with no trailing slash to compose
  // cleanly with path segments below.
  return raw.replace(/\/+$/, '');
}

export const SITE_NAME =
  process.env.NEXT_PUBLIC_APP_NAME || 'SafarBuddy';

export const SITE_DESCRIPTION =
  'Enterprise-grade travel platform for hotels, resorts, homestays, and tour packages';

// Real, existing contact data — sourced from src/data/home.ts
// footerContact, already rendered in the site footer today. Reused
// here for Organization JSON-LD rather than inventing new figures
// (RULE 11).
export const ORG_CONTACT = {
  email: 'vermaayushjivan@gmail.com',
  phone: '+91 7307493338',
  address:
    'FF Shop No. 6, Arohi Arcade, Munshipulia, Lucknow – 226016, Uttar Pradesh, India',
};

export function absoluteUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${getSiteUrl()}${cleanPath}`;
    }

