"use client";

// HOME-REDESIGN-02 / Phase 2, Step 01 — destinations as a phone-first,
// app-style section:
//   * phones (<sm): story-style round circles on top + a swipeable rail
//     of portrait "Where to go" cards below
//   * tablet/desktop (sm+): the same 2/4-column card grid as before
//
// Data is unchanged: getFeaturedDestinations() (real, admin-managed).
// REMOVED on purpose (HOMEPAGE_BIBLE §7 "No fake ratings/reviews/prices"):
// the old cards showed a made-up star rating, a made-up "Starting from
// ₹…" price and a made-up "… booked" count that were cycled from a
// hardcoded array — none of them exist on the destinations table.

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { MapPin, ArrowRight, Compass } from "lucide-react";
import { getFeaturedDestinations } from "@/app/actions/destination.actions";
import type { DestinationRecord } from "@/lib/repositories/destination.repository";

// Gradient fallbacks when a destination has no (or a broken) thumbnail.
const FALLBACK_GRADIENTS = [
  "from-orange to-orange-2",
  "from-sky to-deep",
  "from-deep-2 to-sky",
  "from-sky-light to-deep-2",
  "from-deep to-sky-light",
  "from-orange-2 to-deep",
  "from-deep to-deep-2",
  "from-sky to-orange",
];

const RAIL_CLASS =
  "-mx-6 flex snap-x snap-mandatory gap-3 overflow-x-auto px-6 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

function destinationHref(d: DestinationRecord): string {
  const slug = d.slug && d.slug.trim().length > 0 ? d.slug : String(d.id);
  return `/destinations/${slug}`;
}

// One image with its own "failed to load" state, so a single broken
// thumbnail falls back to its gradient without affecting the others.
function DestinationImage({
  destination,
  index,
  sizes,
  className = "",
}: {
  destination: DestinationRecord;
  index: number;
  sizes: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const hasImage =
    Boolean(destination.thumbnail && destination.thumbnail.trim().length > 0) &&
    !failed;

  if (hasImage) {
    return (
      <Image
        src={destination.thumbnail as string}
        alt={destination.name}
        fill
        sizes={sizes}
        className={`object-cover ${className}`}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div
      className={`absolute inset-0 bg-gradient-to-br ${
        FALLBACK_GRADIENTS[index % FALLBACK_GRADIENTS.length]
      } ${className}`}
      aria-hidden
    />
  );
}

function DestinationSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-[0_16px_30px_-18px_rgba(11,47,92,0.4)]">
      <div className="skeleton h-48 w-full" />
      <div className="space-y-3 p-5">
        <div className="skeleton h-4 w-2/3 rounded-full" />
        <div className="skeleton h-3 w-full rounded-full" />
        <div className="skeleton h-9 w-full rounded-lg" />
      </div>
    </div>
  );
}

function MobileSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading destinations" className="sm:hidden">
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex w-[72px] shrink-0 flex-col items-center gap-2">
            <div className="skeleton h-[72px] w-[72px] rounded-full" />
            <div className="skeleton h-2.5 w-12 rounded-full" />
          </div>
        ))}
      </div>
      <div className="mt-5 flex gap-3 overflow-hidden">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="skeleton aspect-[3/4] w-[150px] shrink-0 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

function EmptyDestinations() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-deep/15 bg-mist-2 px-6 py-16 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-full bg-mist text-deep">
        <Compass size={20} aria-hidden />
      </div>
      <p className="mt-4 font-heading text-[15px] font-semibold text-deep">
        No destinations to show
      </p>
      <p className="mt-1 max-w-xs text-[13px] text-ink/55">
        We&apos;re curating fresh destinations for you — check back shortly.
      </p>
    </div>
  );
}

export default function Destinations() {
  const [loading, setLoading] = useState(true);
  const [destinations, setDestinations] = useState<DestinationRecord[]>([]);

  useEffect(() => {
    let cancelled = false;

    getFeaturedDestinations()
      .then((data) => {
        if (!cancelled) setDestinations(data);
      })
      .catch(() => {
        if (!cancelled) setDestinations([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="bg-mist-2 py-10 sm:py-16">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-6 flex items-end justify-between gap-4 sm:mb-8">
          <div>
            <span className="font-heading text-[13px] font-semibold uppercase tracking-wide text-orange">
              Where to next
            </span>
            <h2 className="mt-1 font-display text-2xl text-deep sm:text-3xl">
              Popular destinations
            </h2>
            <p className="mt-2 max-w-md text-[14px] text-ink/60">
              Hand-picked places our travellers keep coming back to.
            </p>
          </div>

          <Link
            href="/destinations"
            className="focus-ring hidden shrink-0 items-center gap-1.5 rounded-full border border-deep/15 bg-white px-4 py-2 font-heading text-[13px] font-semibold text-deep transition hover:border-deep/30 hover:bg-mist sm:flex"
          >
            View all
            <ArrowRight size={14} aria-hidden />
          </Link>
        </div>

        {loading ? (
          <>
            <MobileSkeleton />
            <div
              className="hidden grid-cols-2 gap-6 sm:grid lg:grid-cols-4"
              aria-busy="true"
              aria-label="Loading destinations"
            >
              {Array.from({ length: 8 }).map((_, i) => (
                <DestinationSkeleton key={i} />
              ))}
            </div>
          </>
        ) : destinations.length === 0 ? (
          <EmptyDestinations />
        ) : (
          <>
            {/* ---------- Phones: story circles + portrait cards ---------- */}
            <div className="sm:hidden">
              <div className={RAIL_CLASS} role="list" aria-label="Destination shortcuts">
                {destinations.map((d, i) => (
                  <Link
                    key={d.id}
                    href={destinationHref(d)}
                    role="listitem"
                    className="focus-ring flex w-[72px] shrink-0 snap-start flex-col items-center gap-1.5 rounded-xl active:scale-95"
                  >
                    <span className="rounded-full bg-gradient-to-tr from-orange via-orange-2 to-sky p-[3px]">
                      <span className="block rounded-full bg-white p-[2px]">
                        <span className="relative block h-[62px] w-[62px] overflow-hidden rounded-full">
                          <DestinationImage destination={d} index={i} sizes="62px" />
                        </span>
                      </span>
                    </span>
                    <span className="w-full truncate text-center font-heading text-[11px] font-semibold text-deep">
                      {d.name}
                    </span>
                  </Link>
                ))}
              </div>

              <div
                className={`${RAIL_CLASS} mt-5`}
                role="list"
                aria-label="Where to go"
              >
                {destinations.map((d, i) => (
                  <Link
                    key={d.id}
                    href={destinationHref(d)}
                    role="listitem"
                    className="focus-ring relative block aspect-[3/4] w-[150px] shrink-0 snap-start overflow-hidden rounded-2xl shadow-[0_16px_30px_-18px_rgba(11,47,92,0.5)] active:scale-[0.98]"
                  >
                    <DestinationImage destination={d} index={i} sizes="150px" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/5 to-transparent" />
                    <div className="absolute inset-x-3 bottom-3 text-white">
                      <p className="font-heading text-[15px] font-semibold leading-tight">
                        {d.name}
                      </p>
                      {d.state && (
                        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-white/80">
                          <MapPin size={10} aria-hidden />
                          {d.state}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>

              <Link
                href="/destinations"
                className="focus-ring mt-5 flex w-full items-center justify-center gap-1.5 rounded-full border border-deep/15 bg-white px-4 py-2.5 font-heading text-[13px] font-semibold text-deep"
              >
                View all destinations
                <ArrowRight size={14} aria-hidden />
              </Link>
            </div>

            {/* ---------- Tablet / desktop: card grid ---------- */}
            <div
              className="hidden grid-cols-2 gap-6 sm:grid lg:grid-cols-4"
              role="list"
              aria-label="Popular destinations"
            >
              {destinations.map((d, i) => (
                <div
                  key={d.id}
                  role="listitem"
                  className="reveal hover-lift group overflow-hidden rounded-2xl bg-white/90 shadow-[0_16px_30px_-18px_rgba(11,47,92,0.4)] backdrop-blur-sm hover:shadow-[0_24px_40px_-16px_rgba(11,47,92,0.45)]"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div className="relative h-48 overflow-hidden">
                    <DestinationImage
                      destination={d}
                      index={i}
                      sizes="(max-width: 1024px) 50vw, 25vw"
                      className="transition-transform duration-500 ease-out group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/0 to-black/0" />

                    <div className="absolute bottom-3 left-4 right-4 text-white">
                      <p className="font-heading text-lg font-semibold leading-tight">
                        {d.name}
                      </p>
                      <p className="flex items-center gap-1 text-[12px] text-white/80">
                        <MapPin size={11} aria-hidden />
                        {d.state ?? "—"}
                      </p>
                    </div>
                  </div>

                  <div className="p-5">
                    <p className="line-clamp-3 text-[13px] leading-relaxed text-ink/60">
                      {d.description}
                    </p>

                    <Link
                      href={destinationHref(d)}
                      className="focus-ring mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl border border-deep/15 py-2.5 font-heading text-[13px] font-semibold text-deep transition group-hover:bg-deep group-hover:text-cream active:scale-[0.98]"
                    >
                      Explore
                      <ArrowRight size={14} aria-hidden />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
