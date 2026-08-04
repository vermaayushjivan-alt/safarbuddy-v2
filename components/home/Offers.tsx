"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Plane, Building2, Bus, Umbrella, Clock, ArrowRight } from "lucide-react";
import { getActiveOffers } from "@/app/actions/offer.actions";
import type { OfferRecord } from "@/lib/repositories/offer.repository";

// Static UI-only styling — unchanged, cycled by index against live data
const offerStyles = [
  { tag: "Flights", icon: Plane, banner: "from-sky to-deep", code: "FLY500" },
  { tag: "Hotels", icon: Building2, banner: "from-orange to-orange-2", code: "STAY20" },
  { tag: "Bus", icon: Bus, banner: "from-deep to-deep-2", code: "BUS150" },
  { tag: "Holiday", icon: Umbrella, banner: "from-sky-light to-sky", code: "HOLI10K" },
  { tag: "Train", icon: Bus, banner: "from-deep-2 to-deep", code: "TRAIN75" },
];

function formatExpiry(endDate: string | null): string {
  if (!endDate) return "Limited time offer";
  const d = new Date(endDate);
  return `Valid till ${d.toLocaleDateString("en-IN", {
    day: "2-digit",
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
        <Umbrella size={20} aria-hidden />
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
  const [failedImages, setFailedImages] = useState<Set<string | number>>(new Set());

  useEffect(() => {
    let cancelled = false;

    getActiveOffers()
      .then((data) => {
        if (!cancelled) setOffers(data);
      })
      .catch(() => {
        if (!cancelled) setOffers([]);
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
        <button
          type="button"
          className="focus-ring hidden shrink-0 items-center gap-1.5 rounded-full border border-deep/15 bg-white px-4 py-2 font-heading text-[13px] font-semibold text-deep transition hover:border-deep/30 hover:bg-mist sm:flex"
        >
          View all offers
          <ArrowRight size={14} aria-hidden />
        </button>
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
            const style = offerStyles[i % offerStyles.length];
            const Icon = style.icon;
            const hasImage =
              Boolean(o.image && o.image.trim().length > 0) &&
              !failedImages.has(o.id);

            return (
              <div
                key={o.id}
                role="listitem"
                className="reveal ticket-notch hover-lift w-[280px] shrink-0 snap-start overflow-hidden rounded-2xl bg-white/90 shadow-[0_16px_30px_-18px_rgba(11,47,92,0.4)] backdrop-blur-sm hover:shadow-[0_24px_40px_-16px_rgba(11,47,92,0.45)] sm:w-[300px]"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div
                  className={`relative flex h-32 flex-col justify-between p-4 ${
                    hasImage ? "" : `bg-gradient-to-br ${style.banner}`
                  }`}
                >
                  {hasImage && (
                    <>
                      <Image
                        src={o.image as string}
                        alt={o.title}
                        fill
                        sizes="(max-width: 640px) 280px, 300px"
                        className="object-cover"
                        onError={() =>
                          setFailedImages((prev) => new Set(prev).add(o.id))
                        }
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-black/0" />
                    </>
                  )}

                  <div className="relative z-10 flex items-center justify-between">
                    <span className="route-tag inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-medium text-deep">
                      <Icon size={12} aria-hidden />
                      {style.tag.toUpperCase()}
                    </span>
                    <span className="rounded-full bg-orange px-2.5 py-1 text-[10px] font-semibold text-white shadow-sm">
                      {o.discount ?? style.tag}
                    </span>
                  </div>
                  <Icon
                    size={40}
                    className="relative z-10 self-end text-white/25"
                    aria-hidden
                  />
                </div>

                <div className="flex flex-1 flex-col justify-between p-5">
                  <div>
                    <h3 className="font-heading text-lg font-semibold text-deep">
                      {o.title}
                    </h3>
                    <p className="mt-1 text-[13px] leading-relaxed text-ink/60">
                      {o.description}
                    </p>
                  </div>

                  <div className="ticket-perf mt-4 space-y-2 pl-4">
                    <div className="flex items-center justify-between">
                      <span className="route-tag text-[12px] font-medium text-deep">
                        CODE: {style.code}
                      </span>
                    </div>
                    <p className="flex items-center gap-1.5 text-[11px] text-ink/45">
                      <Clock size={12} aria-hidden />
                      {formatExpiry(o.end_date)}
                    </p>
                  </div>

                  <button
                    type="button"
                    className="focus-ring mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl bg-deep py-2.5 font-heading text-[13px] font-semibold text-cream transition hover:bg-deep-2 active:scale-[0.98]"
                  >
                    Book now
                    <ArrowRight size={14} aria-hidden />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <button
        type="button"
        className="focus-ring mt-6 flex w-full items-center justify-center gap-1.5 rounded-full border border-deep/15 bg-white px-4 py-2.5 font-heading text-[13px] font-semibold text-deep sm:hidden"
      >
        View all offers
        <ArrowRight size={14} aria-hidden />
      </button>
    </section>
  );
}
