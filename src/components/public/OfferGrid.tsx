
// ROOT PATH: src/components/public/OfferGrid.tsx
import Link from "next/link";
import { Tag, Clock, ArrowRight } from "lucide-react";
import type { OfferRecord } from "@/lib/repositories/offer.repository";

// OFFER-HOTELS-01 — card grid for the public /offers page ("View all
// offers" on the homepage). Server-renderable (no hooks). Mirrors the look
// of the homepage offer cards (src/components/home/Offers.tsx) and, like
// them, sends "Book now" to /offers/[id] where the offer's hotels are
// listed.

const FALLBACK_GRADIENTS = [
  "from-sky to-deep",
  "from-orange to-orange-2",
  "from-deep to-deep-2",
  "from-sky-light to-sky",
  "from-deep-2 to-deep",
];

export function formatValidTill(endDate: string | null): string | null {
  if (!endDate) return null;
  const d = new Date(endDate);
  if (Number.isNaN(d.getTime())) return null;
  return `Valid till ${d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })}`;
}

export function OfferGrid({ offers }: { offers: OfferRecord[] }) {
  if (offers.length === 0) {
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

  return (
    <div
      className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
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
            className="hover-lift flex flex-col overflow-hidden rounded-2xl bg-white shadow-[0_16px_30px_-18px_rgba(11,47,92,0.4)] hover:shadow-[0_24px_40px_-16px_rgba(11,47,92,0.45)]"
          >
            <div
              className={`relative flex h-36 flex-col justify-between overflow-hidden p-4 ${
                o.banner_image ? "" : `bg-gradient-to-br ${gradient}`
              }`}
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
                <h2 className="font-heading text-lg font-semibold text-deep">
                  {o.title}
                </h2>
                {o.description && (
                  <p className="mt-1 text-[13px] leading-relaxed text-ink/60">
                    {o.description}
                  </p>
                )}
              </div>

              {validTill && (
                <p className="mt-4 flex items-center gap-1.5 text-[11px] text-ink/45">
                  <Clock size={12} aria-hidden />
                  {validTill}
                </p>
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
  );
}
