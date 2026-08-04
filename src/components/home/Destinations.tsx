"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { MapPin, Star, Users, ArrowRight, Compass } from "lucide-react";
import { getFeaturedDestinations } from "@/app/actions/destination.actions";
import type { DestinationRecord } from "@/lib/repositories/destination.repository";

// Static UI-only presentation data — no DB column exists for these yet.
// Cycled by index against live data, same pattern as Offers.tsx.
const destinationStyles = [
  { price: "3,499", rating: 4.6, bookings: "12.4k", banner: "from-orange to-orange-2" },
  { price: "18,999", rating: 4.8, bookings: "9.1k", banner: "from-sky to-deep" },
  { price: "21,499", rating: 4.7, bookings: "7.8k", banner: "from-deep-2 to-sky" },
  { price: "9,999", rating: 4.9, bookings: "6.3k", banner: "from-sky-light to-deep-2" },
  { price: "4,199", rating: 4.5, bookings: "10.2k", banner: "from-deep to-sky-light" },
  { price: "16,499", rating: 4.6, bookings: "8.5k", banner: "from-orange-2 to-deep" },
  { price: "19,999", rating: 4.7, bookings: "5.9k", banner: "from-deep to-deep-2" },
  { price: "11,499", rating: 4.8, bookings: "4.7k", banner: "from-sky to-orange" },
];

function DestinationSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-[0_16px_30px_-18px_rgba(11,47,92,0.4)]">
      <div className="skeleton h-48 w-full" />
      <div className="space-y-3 p-5">
        <div className="skeleton h-4 w-2/3 rounded-full" />
        <div className="skeleton h-3 w-full rounded-full" />
        <div className="skeleton h-3 w-1/3 rounded-full" />
        <div className="skeleton h-9 w-full rounded-lg" />
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
  const [failedImages, setFailedImages] = useState<Set<string | number>>(new Set());

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
    <section className="bg-mist-2 py-16">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <span className="font-heading text-[13px] font-semibold uppercase tracking-wide text-orange">
              Where to next
            </span>
            <h2 className="mt-1 font-display text-3xl text-deep">
              Popular destinations
            </h2>
            <p className="mt-2 max-w-md text-[14px] text-ink/60">
              Hand-picked places our travellers keep coming back to.
            </p>
          </div>

          <button
            type="button"
            className="focus-ring hidden shrink-0 items-center gap-1.5 rounded-full border border-deep/15 bg-white px-4 py-2 font-heading text-[13px] font-semibold text-deep transition hover:border-deep/30 hover:bg-mist sm:flex"
          >
            View all
            <ArrowRight size={14} aria-hidden />
          </button>
        </div>

        {loading ? (
          <div
            className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
            aria-busy="true"
            aria-label="Loading destinations"
          >
            {Array.from({ length: 8 }).map((_, i) => (
              <DestinationSkeleton key={i} />
            ))}
          </div>
        ) : destinations.length === 0 ? (
          <EmptyDestinations />
        ) : (
          <div
            className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
            role="list"
            aria-label="Popular destinations"
          >
            {destinations.map((d, i) => {
              const style = destinationStyles[i % destinationStyles.length];
              const hasImage =
                Boolean(d.thumbnail && d.thumbnail.trim().length > 0) &&
                !failedImages.has(d.id);

              return (
                <div
                  key={d.id}
                  role="listitem"
                  className="reveal hover-lift group overflow-hidden rounded-2xl bg-white/90 shadow-[0_16px_30px_-18px_rgba(11,47,92,0.4)] backdrop-blur-sm hover:shadow-[0_24px_40px_-16px_rgba(11,47,92,0.45)]"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div className="relative h-48 overflow-hidden">
                    {hasImage ? (
                      <Image
                        src={d.thumbnail as string}
                        alt={d.name}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        className="object-cover transition-transform duration-500 ease-out group-hover:scale-110"
                        onError={() =>
                          setFailedImages((prev) => new Set(prev).add(d.id))
                        }
                      />
                    ) : (
                      <div
                        className={`absolute inset-0 bg-gradient-to-br ${style.banner} transition-transform duration-500 ease-out group-hover:scale-110`}
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/0 to-black/0" />

                    <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-deep backdrop-blur-sm">
                      <Star
                        size={12}
                        className="fill-gold text-gold"
                        aria-hidden
                      />
                      {style.rating.toFixed(1)}
                    </span>

                    <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between text-white">
                      <div>
                        <p className="font-heading text-lg font-semibold leading-tight">
                          {d.name}
                        </p>

                        <p className="flex items-center gap-1 text-[12px] text-white/80">
                          <MapPin size={11} aria-hidden />
                          {d.state ?? "—"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-5">
                    <p className="text-[13px] leading-relaxed text-ink/60">
                      {d.description}
                    </p>

                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-[12px] text-ink/50">
                        Starting from
                        <span className="ml-1.5 font-display text-[17px] text-orange">
                          ₹{style.price}
                        </span>
                      </p>

                      <span className="flex items-center gap-1 text-[11px] text-ink/45">
                        <Users size={12} aria-hidden />
                        {style.bookings} booked
                      </span>
                    </div>

                    <button
                      type="button"
                      className="focus-ring mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl border border-deep/15 py-2.5 font-heading text-[13px] font-semibold text-deep transition group-hover:bg-deep group-hover:text-cream active:scale-[0.98]"
                    >
                      Explore
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
          View all destinations
          <ArrowRight size={14} aria-hidden />
        </button>
      </div>
    </section>
  );
}
