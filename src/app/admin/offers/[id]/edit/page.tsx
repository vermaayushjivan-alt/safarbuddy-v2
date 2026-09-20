// ROOT PATH: src/app/offers/[id]/page.tsx
import { cache } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Clock, BedDouble } from "lucide-react";
import Navbar from "@/components/home/Navbar";
import Footer from "@/components/home/Footer";
import { HotelGrid } from "@/components/public/HotelGrid";
import { formatValidTill } from "@/components/public/OfferGrid";
import { getActiveOfferWithHotels as fetchOfferWithHotels } from "@/app/actions/offer.actions";
import { SITE_NAME } from "@/lib/seo/site";

// OFFER-HOTELS-01 — where "Book now" on an offer card lands: the offer
// itself plus the hotels the admin attached to it. Each hotel card links to
// the normal /hotels/[slug] page (which already has the booking flow).
// Public, no auth; /offers/ must stay in middleware.ts's public prefixes.

// Offers/links are edited in the admin panel and must show up without a
// redeploy.
export const dynamic = "force-dynamic";

// generateMetadata and the page both need the same data — cache() makes
// that one lookup per request instead of two.
const getActiveOfferWithHotels = cache(fetchOfferWithHotels);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const result = await getActiveOfferWithHotels(id);

  if (!result) {
    return { title: `Offer not found | ${SITE_NAME}` };
  }

  return {
    title: `${result.offer.title} | ${SITE_NAME}`,
    description:
      result.offer.description ??
      `${result.offer.title} — hotels on ${SITE_NAME}.`,
    alternates: { canonical: `/offers/${result.offer.id}` },
  };
}

export default async function OfferDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getActiveOfferWithHotels(id);

  if (!result) {
    notFound();
  }

  const { offer, hotels } = result;
  const validTill = formatValidTill(offer.end_date);

  return (
    <main className="bg-cream">
      <Navbar />

      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="relative mb-10 overflow-hidden rounded-3xl bg-gradient-to-br from-deep to-deep-2 p-8 text-cream sm:p-10">
          {offer.banner_image ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={offer.banner_image}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-black/20" />
            </>
          ) : null}

          <div className="relative">
            {offer.discount && (
              <span className="inline-flex rounded-full bg-orange px-3 py-1 text-[11px] font-semibold text-white shadow-sm">
                {offer.discount}
              </span>
            )}
            <h1 className="mt-3 font-display text-3xl sm:text-4xl">
              {offer.title}
            </h1>
            {offer.description && (
              <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-cream/80">
                {offer.description}
              </p>
            )}
            {validTill && (
              <p className="mt-4 flex items-center gap-1.5 text-[12px] text-cream/70">
                <Clock size={13} aria-hidden />
                {validTill}
              </p>
            )}
          </div>
        </div>

        <div className="mb-6">
          <h2 className="font-display text-2xl text-deep">
            Hotels with this offer
          </h2>
          <p className="mt-1 text-[14px] text-ink/60">
            {hotels.length} hotel{hotels.length === 1 ? "" : "s"} available.
          </p>
        </div>

        {hotels.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-deep/15 bg-mist-2 px-6 py-16 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-mist text-deep">
              <BedDouble size={20} aria-hidden />
            </div>
            <p className="mt-4 font-heading text-[15px] font-semibold text-deep">
              No hotels linked to this offer yet
            </p>
            <p className="mt-1 max-w-xs text-[13px] text-ink/55">
              Browse all our stays in the meantime.
            </p>
            <Link
              href="/hotels"
              className="focus-ring mt-5 rounded-full bg-deep px-5 py-2.5 font-heading text-[13px] font-semibold text-cream transition hover:bg-deep-2"
            >
              Browse all hotels
            </Link>
          </div>
        ) : (
          <HotelGrid hotels={hotels} />
        )}

        <div className="mt-10">
          <Link
            href="/offers"
            className="focus-ring inline-flex rounded-full border border-deep/15 bg-white px-4 py-2 font-heading text-[13px] font-semibold text-deep transition hover:bg-mist"
          >
            ← All offers
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}
