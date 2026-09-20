// ROOT PATH: src/app/offers/page.tsx
import type { Metadata } from "next";
import Navbar from "@/components/home/Navbar";
import Footer from "@/components/home/Footer";
import { OfferGrid } from "@/components/public/OfferGrid";
import { getActiveOffers } from "@/app/actions/offer.actions";
import { SITE_NAME } from "@/lib/seo/site";

// OFFER-HOTELS-01 — target of "View all offers" on the homepage (that
// button used to have no link at all). Public, no auth; must stay in
// PUBLIC_ROUTES in middleware.ts.

export const metadata: Metadata = {
  title: `Offers & Deals | ${SITE_NAME}`,
  description: `Current hotel offers and deals on ${SITE_NAME}.`,
  alternates: { canonical: "/offers" },
};

// Offers are edited in the admin panel and must show up without a redeploy.
export const dynamic = "force-dynamic";

export default async function OffersPage() {
  const offers = await getActiveOffers(50);

  return (
    <main className="bg-cream">
      <Navbar />

      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-8">
          <span className="font-heading text-[13px] font-semibold uppercase tracking-wide text-orange">
            Deals boarding now
          </span>
          <h1 className="mt-1 font-display text-3xl text-deep">
            Offers worth the detour
          </h1>
          <p className="mt-2 max-w-md text-[14px] text-ink/60">
            {offers.length} live offer{offers.length === 1 ? "" : "s"}.
          </p>
        </div>

        <OfferGrid offers={offers} />
      </section>

      <Footer />
    </main>
  );
}

