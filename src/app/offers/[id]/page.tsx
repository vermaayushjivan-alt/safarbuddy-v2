import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, BedDouble, Clock, Tag } from "lucide-react";
import Navbar from "@/components/home/Navbar";
import Footer from "@/components/home/Footer";
import { HotelGrid } from "@/components/public/HotelGrid";
import { formatValidTill } from "@/components/public/OfferGrid";
import { getActiveOfferWithHotels } from "@/app/actions/offer.actions";
import { absoluteUrl, SITE_NAME } from "@/lib/seo/site";
import OfferMedia from "@/components/public/OfferMedia";
import { isVideoUrl } from "@/lib/utils/media";

// LAUNCH-03 — public detail page for /offers/[id]. Every "Book now" on the
// homepage Offers strip and on /offers already linked here, but the page
// never existed (404). Server component, no auth; /offers/ is allowlisted
// in middleware.ts. Mobile-first: single column, full-width tappable
// cards, no extra sticky bar (MobileBottomNav already owns the bottom edge
// on phones — see src/app/layout.tsx).

// Offers are edited in the admin panel and must show up without a redeploy.
export const dynamic = "force-dynamic";

// offers.id is a uuid. A malformed id would make Postgres throw (500), so
// anything that is not a uuid is a clean 404 instead.
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return { title: `Offer not found | ${SITE_NAME}` };
  }

  const result = await getActiveOfferWithHotels(id);
  if (!result) {
    return { title: `Offer not found | ${SITE_NAME}` };
  }

  const { offer } = result;
  const title = `${offer.title} | ${SITE_NAME}`;
  const raw =
    offer.description?.trim() ||
    `${offer.title}${offer.discount ? ` — ${offer.discount}` : ""}. Book eligible hotels on ${SITE_NAME}.`;
  const description =
    raw.length > 160 ? `${raw.slice(0, 157).trimEnd()}...` : raw;
  const path = `/offers/${offer.id}`;

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: absoluteUrl(path),
      siteName: SITE_NAME,
      type: "website",
      images:
        offer.banner_image && !isVideoUrl(offer.banner_image)
          ? [{ url: offer.banner_image }]
          : undefined,
    },
  };
}

export default async function OfferDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const result = await getActiveOfferWithHotels(id);
  if (!result) notFound();

  const { offer, hotels } = result;
  const validTill = formatValidTill(offer.end_date);
  const hasImage = Boolean(
    offer.banner_image && offer.banner_image.trim().length > 0
  );

  return (
    <main className="bg-cream">
      <Navbar />

      <section className="mx-auto max-w-5xl px-4 pb-24 pt-4 sm:px-6 sm:py-12 lg:pb-12">
        <Link
          href="/offers"
          className="focus-ring inline-flex items-center gap-1.5 rounded-full py-2 font-heading text-[13px] font-semibold text-deep/80"
        >
          <ArrowLeft size={15} aria-hidden />
          All offers
        </Link>

        {/* Banner */}
        <div className="relative mt-2 aspect-[16/10] overflow-hidden rounded-2xl sm:aspect-[21/9]">
          {hasImage && isVideoUrl(offer.banner_image) ? (
            <OfferMedia
              src={offer.banner_image as string}
              alt={offer.title}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : hasImage ? (
            <Image
              src={offer.banner_image as string}
              alt={offer.title}
              fill
              sizes="(max-width: 1024px) 100vw, 960px"
              className="object-cover"
              priority
            />
          ) : (
            <div
              className="absolute inset-0 bg-gradient-to-br from-sky to-deep"
              aria-hidden
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/0 to-black/0" />

          {offer.discount && (
            <span className="absolute left-3 top-3 inline-flex max-w-[80%] items-center gap-1.5 rounded-full bg-orange px-3 py-1.5 font-heading text-[12px] font-semibold text-white shadow-lg sm:left-4 sm:top-4 sm:text-[13px]">
              <Tag size={13} aria-hidden />
              <span className="truncate">{offer.discount}</span>
            </span>
          )}
        </div>

        {/* Title + meta */}
        <div className="mt-5 sm:mt-6">
          <h1 className="font-display text-[26px] leading-tight text-deep sm:text-4xl">
            {offer.title}
          </h1>

          {validTill && (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-mist px-3 py-1.5 text-[12px] font-medium text-deep">
              <Clock size={13} aria-hidden />
              {validTill}
            </p>
          )}

          {offer.description && (
            <p className="mt-4 max-w-3xl whitespace-pre-line text-[14px] leading-relaxed text-ink/70 sm:text-[15px]">
              {offer.description}
            </p>
          )}
        </div>

        {/* Eligible hotels */}
        <div id="offer-hotels" className="mt-8 scroll-mt-24 sm:mt-10">
          <h2 className="font-heading text-[18px] font-semibold text-deep">
            Hotels with this offer
          </h2>
          <p className="mt-1 text-[13px] text-ink/55">
            {hotels.length > 0
              ? `${hotels.length} hotel${hotels.length === 1 ? "" : "s"} available`
              : "Pick a stay to book with this deal."}
          </p>

          <div className="mt-4 sm:mt-5">
            {hotels.length > 0 ? (
              <HotelGrid hotels={hotels} />
            ) : (
              <div className="flex flex-col items-center rounded-2xl border border-dashed border-deep/15 bg-white px-5 py-12 text-center">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-mist text-deep">
                  <BedDouble size={20} aria-hidden />
                </div>
                <p className="mt-4 font-heading text-[15px] font-semibold text-deep">
                  Hotels for this offer are being added
                </p>
                <p className="mt-1 max-w-xs text-[13px] text-ink/55">
                  Meanwhile, browse all stays on {SITE_NAME}.
                </p>
                <Link
                  href="/hotels"
                  className="focus-ring mt-5 inline-flex items-center gap-1.5 rounded-full bg-deep px-6 py-3 font-heading text-[14px] font-semibold text-cream"
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
