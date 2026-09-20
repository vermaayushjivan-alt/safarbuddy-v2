"use client";

// ADMIN-08 follow-up — this section was previously a hardcoded static
// array, completely disconnected from /admin/offers (any offer
// created/edited/deleted there never showed up here). Now fetches
// real active offers via getActiveOffers() and renders the actual
// admin-managed image/title/description/discount/end_date.
//
// Design intentionally kept as close to the original as possible —
// same card shape, same top banner area, same ticket-perforation
// footer — per explicit instruction not to redesign the section, only
// to make it show the real uploaded image. Two things could not be
// kept as-is because they were never real data: the per-category
// tag+icon chip (Flights/Hotels/Bus/...) and the "CODE: XXXX" line —
// neither field exists on the `offers` table (title/image/description/
// discount/start_date/end_date/status only), so inventing a fake
// category or promo code here would just be new fabricated data in
// a different spot. Dropped both rather than fake them; everything
// else (banner height, card width, spacing, buttons) is unchanged.

import { useEffect, useState } from "react";
import Link from "next/link";
import { Tag, Clock, ArrowRight } from "lucide-react";
import { getActiveOffers } from "@/app/actions/offer.actions";
import type { OfferRecord } from "@/lib/repositories/offer.repository";

const FALLBACK_GRADIENTS = [
  "from-sky to-deep",
  "from-orange to-orange-2",
  "from-deep to-deep-2",
  "from-sky-light to-sky",
  "from-deep-2 to-deep",
];

function formatValidTill(endDate: string | null): string | null {
  if (!endDate) return null;
  const d = new Date(endDate);
  if (Number.isNaN(d.getTime())) return null;
  return `Valid till ${d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })}`;
}

function OfferCardSkeleton() {
  return (
    <div className="w-[280px] shrink-0 snap-start overflow-hidden rounded-2xl bg-white shadow-[0_16px_30px_-18px_rgba(11,47,92,0.4)] sm:w-[300px]">
      <div className="skeleton h-32 w-full" />
      <div className="space-y-3 p-5">
        <div className="skeleton h-3 w-16 rounded-full" />
        <div className="skeleton h-4 w-3/4 rounded-full" />
        <div className="skeleton h-3 w-full rounded-full" />
        <div className="skeleton h-9 w-full rounded-lg" />
      </div>
    </div>
  );
}

function EmptyOffers() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-deep/15 bg-mist-2 px-6 py-16 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-full bg-mist text-deep">
        <Tag size={20} aria-hidden />
      </div>
      <p className="mt-4 font-heading text-[15px] font-semibold text-deep">
        No offers live right now
      </p>
      <p className="mt-1 max-w-xs text-[13px] text-ink/55">
        Check back soon — new fare drops and deals land here every week.
      </p>
    </div>
  );
}

export default function Offers() {
  const [loading, setLoading] = useState(true);
  const [offers, setOffers] = useState<OfferRecord[]>([]);

  useEffect(() => {
    let cancelled = false;
    getActiveOffers()
      .then((rows) => {
        if (!cancelled) setOffers(rows);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="mx-auto max-w-7xl px-6 py-16">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <span className="font-heading text-[13px] font-semibold uppercase tracking-wide text-orange">
            Deals boarding now
          </span>
          <h2 className="mt-1 font-display text-3xl text-deep">
            Offers worth the detour
          </h2>
        </div>
        <Link
          href="/offers"
          className="focus-ring hidden shrink-0 items-center gap-1.5 rounded-full border border-deep/15 bg-white px-4 py-2 font-heading text-[13px] font-semibold text-deep transition hover:border-deep/30 hover:bg-mist sm:flex"
        >
          View all offers
          <ArrowRight size={14} aria-hidden />
        </Link>
      </div>

      {loading ? (
        <div
          className="flex gap-5 overflow-x-auto pb-2"
          aria-busy="true"
          aria-label="Loading offers"
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <OfferCardSkeleton key={i} />
          ))}
        </div>
      ) : offers.length === 0 ? (
        <EmptyOffers />
      ) : (
        <div
          className="flex snap-x snap-mandatory gap-5 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="list"
          aria-label="Current offers"
        >
          {offers.map((o, i) => {
            const validTill = formatValidTill(o.end_date);
            const gradient = FALLBACK_GRADIENTS[i % FALLBACK_GRADIENTS.length];

            return (
              <div
                key={o.id}
                role="listitem"
                className="reveal ticket-notch hover-lift w-[280px] shrink-0 snap-start overflow-hidden rounded-2xl bg-white/90 shadow-[0_16px_30px_-18px_rgba(11,47,92,0.4)] backdrop-blur-sm hover:shadow-[0_24px_40px_-16px_rgba(11,47,92,0.45)] sm:w-[300px]"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div
                  className={`relative flex h-32 flex-col justify-between overflow-hidden ${
                    o.banner_image ? "" : `bg-gradient-to-br ${gradient}`
                  } p-4`}
                >
                  {o.banner_image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={o.banner_image}
                      alt={o.title}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : (
                    <Tag
                      size={40}
                      className="absolute bottom-4 right-4 text-white/25"
                      aria-hidden
                    />
                  )}

                  {o.discount && (
                    <span className="route-tag relative ml-auto inline-flex items-center gap-1.5 rounded-full bg-orange px-2.5 py-1 text-[10px] font-semibold text-white shadow-sm">
                      {o.discount}
                    </span>
                  )}
                </div>

                <div className="flex flex-1 flex-col justify-between p-5">
                  <div>
                    <h3 className="font-heading text-lg font-semibold text-deep">
                      {o.title}
                    </h3>
                    {o.description && (
                      <p className="mt-1 text-[13px] leading-relaxed text-ink/60">
                        {o.description}
                      </p>
                    )}
                  </div>

                  {validTill && (
                    <div className="ticket-perf mt-4 space-y-2 pl-4">
                      <p className="flex items-center gap-1.5 text-[11px] text-ink/45">
                        <Clock size={12} aria-hidden />
                        {validTill}
                      </p>
                    </div>
                  )}

                  <Link
                    href={`/offers/${o.id}`}
                    className="focus-ring mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl bg-deep py-2.5 font-heading text-[13px] font-semibold text-cream transition hover:bg-deep-2 active:scale-[0.98]"
                  >
                    Book now
                    <ArrowRight size={14} aria-hidden />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Link
        href="/offers"
        className="focus-ring mt-6 flex w-full items-center justify-center gap-1.5 rounded-full border border-deep/15 bg-white px-4 py-2.5 font-heading text-[13px] font-semibold text-deep sm:hidden"
      >
        View all offers
        <ArrowRight size={14} aria-hidden />
      </Link>
    </section>
  );
}
