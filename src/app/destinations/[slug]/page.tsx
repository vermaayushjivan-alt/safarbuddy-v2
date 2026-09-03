import Image from "next/image";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MapPin } from "lucide-react";
import Navbar from "@/components/home/Navbar";
import Footer from "@/components/home/Footer";
import { getDestinationBySlug } from "@/app/actions/destination.actions";
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
  const destination = await getDestinationBySlug(slug);

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
  const destination = await getDestinationBySlug(slug);

  if (!destination) {
    notFound();
  }

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

      <section className="mx-auto max-w-5xl px-6 py-12">
        <div className="relative h-72 overflow-hidden rounded-2xl sm:h-96">
          {hasImage ? (
            <Image
              src={heroImage as string}
              alt={destination.name}
              fill
              sizes="(max-width: 1024px) 100vw, 960px"
              className="object-cover"
              priority
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-orange to-orange-2" aria-hidden />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/0 to-black/0" />

          <div className="absolute bottom-5 left-6 right-6 text-white">
            <h1 className="font-display text-3xl sm:text-4xl">{destination.name}</h1>
            {destination.state && (
              <p className="mt-1 flex items-center gap-1.5 text-[14px] text-white/85">
                <MapPin size={14} aria-hidden />
                {destination.state}
              </p>
            )}
          </div>
        </div>

        <div className="mt-8 max-w-3xl">
          <h2 className="font-heading text-[16px] font-semibold text-deep">
            About {destination.name}
          </h2>
          <p className="mt-2 whitespace-pre-line text-[14px] leading-relaxed text-ink/70">
            {destination.description ?? "No description available yet."}
          </p>
        </div>
      </section>

      <Footer />
    </main>
  );
}
