"use client";

import { useEffect, useState } from "react";
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
  return `Valid till ${d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`;
}

// ... OfferCardSkeleton and EmptyOffers unchanged ...

export default function Offers() {
  const [loading, setLoading] = useState(true);
  const [offers, setOffers] = useState<OfferRecord[]>([]);

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
      {/* header unchanged */}

      {loading ? (
        /* skeleton block unchanged */
      ) : offers.length === 0 ? (
        <EmptyOffers />
      ) : (
        <div /* ...unchanged wrapper... */>
          {offers.map((o, i) => {
            const style = offerStyles[i % offerStyles.length];
            const Icon = style.icon;
            return (
              <div key={o.id} /* ...unchanged card classes... */>
                <div className={`relative flex h-32 flex-col justify-between bg-gradient-to-br ${style.banner} p-4`}>
                  <div className="flex items-center justify-between">
                    <span className="route-tag ...">
                      <Icon size={12} aria-hidden />
                      {style.tag.toUpperCase()}
                    </span>
                    <span className="rounded-full bg-orange px-2.5 py-1 text-[10px] font-semibold text-white shadow-sm">
                      {o.discount ?? style.tag}
                    </span>
                  </div>
                  <Icon size={40} className="self-end text-white/25" aria-hidden />
                </div>

                <div className="flex flex-1 flex-col justify-between p-5">
                  <div>
                    <h3 className="font-heading text-lg font-semibold text-deep">{o.title}</h3>
                    <p className="mt-1 text-[13px] leading-relaxed text-ink/60">{o.description}</p>
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

                  <button /* unchanged */>
                    Book now
                    <ArrowRight size={14} aria-hidden />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* footer button unchanged */}
    </section>
  );
}
