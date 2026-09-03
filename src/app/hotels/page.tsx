// ROOT PATH: src/app/hotels/page.tsx
import Link from "next/link";
import type { Metadata } from "next";
import Navbar from "@/components/home/Navbar";
import Footer from "@/components/home/Footer";
import { HotelGrid } from "@/components/public/HotelGrid";
import { HotelSearchBar } from "@/components/public/HotelSearchBar";
import {
  getPublishedHotels,
  searchPublishedHotels,
} from "@/app/actions/hotel.actions";
import { SITE_NAME } from "@/lib/seo/site";

// SEO_AUDIT.md §3.2/§4 (Phase 4/11/16 principle) — this page already
// supports a real ?city= search (HOME-HOTEL-SEARCH-01), which is a
// genuine search-intent match ("hotels in Ayodhya" etc. from the
// master prompt's target queries) worth its own title. But every
// combination of page/checkin/checkout/guests must NOT be indexed —
// that's exactly the thin/duplicate-URL risk the master prompt's own
// Phase 4/16 rules warn against, so canonical always points at the
// clean city URL (or /hotels with no query at all) and only page 1
// with a city (or no query) is indexable.
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; city?: string }>;
}): Promise<Metadata> {
  const params = await searchParams;
  const page = Number(params.page ?? "1") || 1;
  const city = params.city?.trim();

  const title = city
    ? `Hotels in ${city} | ${SITE_NAME}`
    : `All Hotels | ${SITE_NAME}`;
  const description = city
    ? `Browse and book hotels in ${city} on ${SITE_NAME}. Compare rooms, prices, and availability.`
    : `Browse and book hotels across India on ${SITE_NAME}. Compare rooms, prices, and availability.`;

  const canonicalPath = city
    ? `/hotels?city=${encodeURIComponent(city)}`
    : "/hotels";

  return {
    title,
    description,
    alternates: { canonical: canonicalPath },
    // Page 1 of a city search (or the unfiltered list) is a real,
    // unique, useful page. Every other page is a paginated slice with
    // no independent search value — index the canonical URL instead.
    robots: page > 1 ? { index: false, follow: true } : undefined,
  };
}

// PUBLIC-01 — public listing page for the AUTH-06 `/hotels` allowlist
// entry. Server component, no auth required. Mirrors
// src/app/destinations/page.tsx exactly.
//
// HOME-HOTEL-SEARCH-01: now accepts city/checkin/checkout/guests from
// the homepage hero box (or this page's own search bar). city drives a
// real ilike search via searchPublishedHotels(); checkin/checkout/guests
// have no backing availability filter yet (ROOM-04 inventory is
// per-room, not queryable by date range at the hotel-list level — not
// invented here per RULE 7), so they are carried through as-is to each
// hotel's detail/booking link, per RULE 12 rather than silently dropped.

function buildQuery(params: Record<string, string | undefined>): string {
  const entries = Object.entries(params).filter(
    ([, v]) => v != null && v.length > 0
  ) as [string, string][];
  if (entries.length === 0) return "";
  return `?${new URLSearchParams(entries).toString()}`;
}

export default async function HotelsPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    city?: string;
    checkin?: string;
    checkout?: string;
    guests?: string;
  }>;
}) {
  const params = await searchParams;
  const page = Number(params.page ?? "1") || 1;
  const city = params.city ?? "";

  const { data: hotels, total, totalPages, hasNext, hasPrev } = city
    ? await searchPublishedHotels(city, page, 16)
    : await getPublishedHotels(page, 16);

  const stayQuery = buildQuery({
    checkin: params.checkin,
    checkout: params.checkout,
    guests: params.guests,
  });

  const pageQuery = (targetPage: number) =>
    buildQuery({
      page: String(targetPage),
      city: params.city,
      checkin: params.checkin,
      checkout: params.checkout,
      guests: params.guests,
    });

  return (
    <main className="bg-cream">
      <Navbar />

      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-8">
          <span className="font-heading text-[13px] font-semibold uppercase tracking-wide text-orange">
            Stays for every trip
          </span>
          <h1 className="mt-1 font-display text-3xl text-deep">
            {city ? `Hotels in ${city}` : "All Hotels"}
          </h1>
          <p className="mt-2 max-w-md text-[14px] text-ink/60">
            {total} hotel{total === 1 ? "" : "s"}
            {city ? " found" : " to explore"}.
          </p>
        </div>

        <HotelSearchBar
          initialCity={params.city ?? ""}
          initialCheckIn={params.checkin ?? ""}
          initialCheckOut={params.checkout ?? ""}
          initialGuests={params.guests ?? ""}
        />

        <div className="mt-8">
          <HotelGrid hotels={hotels} stayQuery={stayQuery} />
        </div>

        {totalPages > 1 && (
          <div className="mt-10 flex items-center justify-center gap-3">
            <Link
              href={`/hotels${pageQuery(page - 1)}`}
              aria-disabled={!hasPrev}
              className={`focus-ring rounded-full border border-deep/15 px-4 py-2 text-[13px] font-semibold text-deep ${
                hasPrev ? "hover:bg-mist" : "pointer-events-none opacity-40"
              }`}
            >
              Previous
            </Link>
            <span className="text-[13px] text-ink/60">
              Page {page} of {totalPages}
            </span>
            <Link
              href={`/hotels${pageQuery(page + 1)}`}
              aria-disabled={!hasNext}
              className={`focus-ring rounded-full border border-deep/15 px-4 py-2 text-[13px] font-semibold text-deep ${
                hasNext ? "hover:bg-mist" : "pointer-events-none opacity-40"
              }`}
            >
              Next
            </Link>
          </div>
        )}
      </section>

      <Footer />
    </main>
  );
}
