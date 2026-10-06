import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import Navbar from "@/components/home/Navbar";
import Footer from "@/components/home/Footer";
import { HotelGrid } from "@/components/public/HotelGrid";
import { SafeImage } from "@/components/public/SafeImage";
import { getDestinationBySlug } from "@/app/actions/destination.actions";
import { searchPublishedHotels } from "@/app/actions/hotel.actions";
import { absoluteUrl, SITE_NAME } from "@/lib/seo/site";

// PUBLIC-01 — public detail page for the AUTH-06 `/destinations`
// allowlist entry. Server component, no auth required. Only renders
// fields that already exist on DestinationRecord — nothing invented.

// SEO_AUDIT.md §3.2/§3.4 — same duplicate-metadata gap as hotels.
// NOTE: unlike getHotelBySlug, getDestinationBySlug does not filter by
// status (confirmed in destination.repository.ts — see SEO_AUDIT.md
// finding). This page has always rendered whatever destination.status
// value is on the record, so metadata generation mirrors that existing
// behavior rather than silently adding a stricter filter here.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  let destination = null;
  try {
    destination = await getDestinationBySlug(slug);
  } catch (error) {
    console.error("[destinations/[slug]] metadata lookup failed", error);
  }

  if (!destination) {
    return { title: `Destination not found | ${SITE_NAME}` };
  }

  const title = destination.state
    ? `${destination.name}, ${destination.state} — Travel Guide | ${SITE_NAME}`
    : `${destination.name} — Travel Guide | ${SITE_NAME}`;

  const rawDescription =
    destination.description?.trim() ||
    `Explore ${destination.name}${destination.state ? `, ${destination.state}` : ""} and find hotels nearby on ${SITE_NAME}.`;
  const description =
    rawDescription.length > 160
      ? `${rawDescription.slice(0, 157).trimEnd()}...`
      : rawDescription;

  const canonicalPath = `/destinations/${destination.slug}`;
  const heroImage = destination.banner || destination.thumbnail || undefined;

  return {
    title,
    description,
    alternates: { canonical: canonicalPath },
    openGraph: {
      title,
      description,
      url: absoluteUrl(canonicalPath),
      siteName: SITE_NAME,
      type: "website",
      images: heroImage ? [{ url: heroImage }] : undefined,
    },
    twitter: {
      card: heroImage ? "summary_large_image" : "summary",
      title,
      description,
      images: heroImage ? [{ url: heroImage }] : undefined,
    },
  };
}

export default async function DestinationDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  // Errors here are rethrown to the route's error.tsx, which now shows
  // the real message instead of a blank "Something went wrong".
  const destination = await getDestinationBySlug(slug);

  if (!destination) {
    notFound();
  }

  // LAUNCH-03 — this page used to be a dead end (no way to reach the
  // destination's hotels). Same city search the /hotels page uses
  // (hotels.city ilike destination name); never blocks the page if the
  // hotel lookup fails.
  const HOTELS_PREVIEW = 4;
  let hotels: Awaited<ReturnType<typeof searchPublishedHotels>>["data"] = [];
  let hotelsTotal = 0;
  try {
    const found = await searchPublishedHotels(destination.name, 1, HOTELS_PREVIEW);
    hotels = found.data;
    hotelsTotal = found.total;
  } catch (error) {
    console.error("[destinations/[slug]] hotel lookup failed", error);
  }
  const hotelsHref = `/hotels?city=${encodeURIComponent(destination.name)}`;

  const heroImage =
    destination.banner && destination.banner.trim().length > 0
      ? destination.banner
      : destination.thumbnail;
  const hasImage = Boolean(heroImage && heroImage.trim().length > 0);

  // SEO_AUDIT.md §3.3 — built only from fields confirmed on
  // DestinationRecord. "Place" (not a more specific TouristDestination
  // subtype) since only name/state/description/image are actually
  // stored — nothing more specific would be honest here.
  const placeJsonLd = {
    "@context": "https://schema.org",
    "@type": "Place",
    name: destination.name,
    description: destination.description ?? undefined,
    url: absoluteUrl(`/destinations/${destination.slug}`),
    image: hasImage ? heroImage : undefined,
    address: destination.state
      ? { "@type": "PostalAddress", addressRegion: destination.state }
      : undefined,
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
      {
        "@type": "ListItem",
        position: 2,
        name: "Destinations",
        item: absoluteUrl("/destinations"),
      },
      {
        "@type": "ListItem",
        position: 3,
        name: destination.name,
        item: absoluteUrl(`/destinations/${destination.slug}`),
      },
    ],
  };

  return (
    <main className="bg-cream">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(placeJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <Navbar />

      <section className="mx-auto max-w-5xl px-4 pb-24 pt-4 sm:px-6 sm:py-12 lg:pb-12">
        <div className="relative h-56 overflow-hidden rounded-2xl sm:h-96">
          <SafeImage
            src={heroImage}
            alt={destination.name}
            sizes="(max-width: 1024px) 100vw, 960px"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-black/0" />

          <div className="absolute bottom-4 left-4 right-4 text-white sm:bottom-5 sm:left-6 sm:right-6">
            <h1 className="font-display text-[28px] leading-tight sm:text-4xl">{destination.name}</h1>
            {destination.state && (
              <p className="mt-1 flex items-center gap-1.5 text-[13px] text-white/85 sm:text-[14px]">
                <MapPin size={14} aria-hidden />
                {destination.state}
              </p>
            )}
          </div>
        </div>

        {/* Primary action — thumb-friendly full-width button on phones */}
        <Link
          href={hotelsHref}
          className="focus-ring mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-orange px-6 py-3.5 font-heading text-[15px] font-semibold text-white shadow-[0_10px_24px_-10px_rgba(255,106,43,0.8)] transition active:scale-[0.98] sm:inline-flex sm:w-auto"
        >
          Hotels in {destination.name}
          <ArrowRight size={16} aria-hidden />
        </Link>

        <div className="mt-7 max-w-3xl sm:mt-8">
          <h2 className="font-heading text-[16px] font-semibold text-deep">
            About {destination.name}
          </h2>
          <p className="mt-2 whitespace-pre-line text-[14px] leading-relaxed text-ink/70">
            {destination.description ?? "No description available yet."}
          </p>
        </div>

        {/* Stays in this destination */}
        <div className="mt-9 sm:mt-10">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="font-heading text-[18px] font-semibold text-deep">
                Stays in {destination.name}
              </h2>
              {hotelsTotal > 0 && (
                <p className="mt-0.5 text-[13px] text-ink/55">
                  {hotelsTotal} hotel{hotelsTotal === 1 ? "" : "s"} available
                </p>
              )}
            </div>
            {hotelsTotal > HOTELS_PREVIEW && (
              <Link
                href={hotelsHref}
                className="focus-ring shrink-0 rounded-full py-2 font-heading text-[13px] font-semibold text-orange"
              >
                View all
              </Link>
            )}
          </div>

          <div className="mt-4">
            {hotels.length > 0 ? (
              <HotelGrid hotels={hotels} />
            ) : (
              <div className="rounded-2xl border border-dashed border-deep/15 bg-white px-5 py-10 text-center">
                <p className="font-heading text-[15px] font-semibold text-deep">
                  No hotels listed here yet
                </p>
                <p className="mx-auto mt-1 max-w-xs text-[13px] text-ink/55">
                  We&apos;re adding stays in {destination.name}. Meanwhile, explore all hotels.
                </p>
                <Link
                  href="/hotels"
                  className="focus-ring mt-4 inline-flex items-center gap-1.5 rounded-full bg-deep px-6 py-3 font-heading text-[14px] font-semibold text-cream"
                >
                  Browse all hotels
                  <ArrowRight size={15} aria-hidden />
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
