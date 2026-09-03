// ROOT PATH: src/app/sitemap.ts
//
// SEO_AUDIT.md §3.1 — no sitemap existed anywhere in the repo.
//
// Only includes URLs that are actually public today (confirmed against
// middleware.ts PUBLIC_ROUTES in SEO_AUDIT.md §1):
// - static marketing pages
// - hotel detail pages, filtered to status === 'active' (the exact
//   HOTEL_STATUS_VALUES contract — see hotel.repository.ts) via the
//   same getPublishedHotels() the public /hotels listing page uses, so
//   the sitemap can never list a hotel the listing page itself hides.
// - destination detail pages, via the same getAllPublicDestinations()
//   the public /destinations listing page uses. NOTE: that repository
//   method applies no status filter (confirmed — see
//   DestinationRepository.getAllDestinations); the sitemap deliberately
//   mirrors that rather than inventing a stricter filter here, so the
//   sitemap always matches what /destinations actually renders. If a
//   destination status/visibility contract gets added later, both
//   should be updated together.
//
// Packages are NOT included: there is no public /packages/[id] detail
// route in this repository today (confirmed — only
// src/app/packages/[id]/book/page.tsx exists, which is a transactional,
// non-indexable route). Only the /packages listing page is included.
// See SEO_AUDIT.md for this finding — a packages detail page is a
// product/content decision outside this SEO change's scope, not
// something to add silently here.
//
// Pagination: fetched with a single high-limit page rather than
// sharded sitemaps. Fine at current inventory volume; Phase 9's own
// notes call out sitemap sharding as a later concern once hotel/
// destination counts justify it — revisit this file when they do.

import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/seo/site';
import { getPublishedHotels } from '@/app/actions/hotel.actions';
import { getAllPublicDestinations } from '@/app/actions/destination.actions';

const SITEMAP_FETCH_LIMIT = 5000;

function toLastModified(value: string | Date | undefined): Date | undefined {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${siteUrl}/hotels`, changeFrequency: 'daily', priority: 0.9 },
    {
      url: `${siteUrl}/destinations`,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    { url: `${siteUrl}/packages`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${siteUrl}/about`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${siteUrl}/contact`, changeFrequency: 'monthly', priority: 0.3 },
    {
      url: `${siteUrl}/list-your-property`,
      changeFrequency: 'monthly',
      priority: 0.4,
    },
  ];

  let hotelRoutes: MetadataRoute.Sitemap = [];
  try {
    const { data: hotels } = await getPublishedHotels(1, SITEMAP_FETCH_LIMIT);
    hotelRoutes = hotels.map((hotel) => ({
      url: `${siteUrl}/hotels/${hotel.slug}`,
      lastModified: toLastModified(hotel.updated_at),
      changeFrequency: 'weekly',
      priority: 0.7,
    }));
  } catch {
    // A sitemap request must still return the static routes even if
    // the DB read fails (e.g. transient outage) — a 500 here would
    // pull the whole sitemap out of rotation, not just the hotel URLs.
    hotelRoutes = [];
  }

  let destinationRoutes: MetadataRoute.Sitemap = [];
  try {
    const { data: destinations } = await getAllPublicDestinations(
      1,
      SITEMAP_FETCH_LIMIT
    );
    destinationRoutes = destinations.map((destination) => ({
      url: `${siteUrl}/destinations/${destination.slug}`,
      lastModified: toLastModified(destination.updated_at),
      changeFrequency: 'weekly',
      priority: 0.6,
    }));
  } catch {
    destinationRoutes = [];
  }

  return [...staticRoutes, ...hotelRoutes, ...destinationRoutes];
}

