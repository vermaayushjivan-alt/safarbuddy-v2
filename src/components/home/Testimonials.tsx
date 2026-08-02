"use client";

import { useEffect, useState } from "react";
import {
  Star,
  Quote,
  BadgeCheck,
  ThumbsUp,
  MapPin,
  Calendar,
  ArrowRight,
  Plane,
  BedDouble,
  Package as PackageIcon,
  Bus,
  Users,
  type LucideIcon,
} from "lucide-react";
import { testimonials, homeStats, type BookingType } from "@/data/home";

const bookingTypeIcons: Record<BookingType, LucideIcon> = {
  Flight: Plane,
  Hotel: BedDouble,
  "Holiday Package": PackageIcon,
  Bus: Bus,
};

function TestimonialSkeleton() {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-[0_16px_30px_-18px_rgba(11,47,92,0.4)]">
      <div className="flex items-center gap-3">
        <div className="skeleton h-11 w-11 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-3 w-1/2 rounded-full" />
          <div className="skeleton h-3 w-1/3 rounded-full" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <div className="skeleton h-3 w-full rounded-full" />
        <div className="skeleton h-3 w-full rounded-full" />
        <div className="skeleton h-3 w-2/3 rounded-full" />
      </div>
      <div className="mt-4 skeleton h-5 w-24 rounded-full" />
    </div>
  );
}

function EmptyTestimonials() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-deep/15 bg-mist-2 px-6 py-16 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-full bg-mist text-deep">
        <Users size={20} aria-hidden />
      </div>
      <p className="mt-4 font-heading text-[15px] font-semibold text-deep">
        No traveler stories yet
      </p>
      <p className="mt-1 max-w-xs text-[13px] text-ink/55">
        Reviews from real trips will show up here as travelers share them.
      </p>
    </div>
  );
}

export default function Testimonials() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = window.setTimeout(() => setLoading(false), 700);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <section className="mx-auto max-w-7xl px-6 py-16">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <span className="font-heading text-[13px] font-semibold uppercase tracking-wide text-orange">
            Traveler stories
          </span>
          <h2 className="mt-1 font-display text-3xl text-deep">
            What Our Travelers Say
          </h2>
          <p className="mt-2 max-w-md text-[14px] text-ink/60">
            Thousands of happy travelers trust SafarBuddy for unforgettable
            journeys.
          </p>
        </div>
        <button
          type="button"
          className="focus-ring hidden shrink-0 items-center gap-1.5 rounded-full border border-deep/15 bg-white px-4 py-2 font-heading text-[13px] font-semibold text-deep transition hover:border-deep/30 hover:bg-mist sm:flex"
        >
          View all reviews
          <ArrowRight size={14} aria-hidden />
        </button>
      </div>

      <div className="mb-10 grid grid-cols-2 gap-4 rounded-2xl border border-deep/10 bg-white/70 p-6 backdrop-blur-sm sm:grid-cols-4">
        {homeStats.map((stat) => (
          <div key={stat.id} className="reveal text-center">
            <p className="font-display text-2xl text-deep sm:text-3xl">
              {stat.value}
            </p>
            <p className="mt-1 text-[12px] text-ink/55">{stat.label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div
          className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
          aria-busy="true"
          aria-label="Loading traveler reviews"
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <TestimonialSkeleton key={i} />
          ))}
        </div>
      ) : testimonials.length === 0 ? (
        <EmptyTestimonials />
      ) : (
        <div
          className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
          role="list"
          aria-label="Traveler reviews"
        >
          {testimonials.map((t, i) => {
            const BookingIcon = bookingTypeIcons[t.bookingType];
            return (
              <div
                key={t.id}
                role="listitem"
                className="reveal hover-lift group relative overflow-hidden rounded-2xl bg-white/90 p-5 shadow-[0_16px_30px_-18px_rgba(11,47,92,0.4)] backdrop-blur-sm hover:shadow-[0_24px_40px_-16px_rgba(11,47,92,0.45)]"
                style={{ animationDelay: `${i * 70}ms` }}
              >
                <Quote
                  size={40}
                  className="pointer-events-none absolute -right-1 -top-1 text-mist"
                  aria-hidden
                />

                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-sky to-deep font-heading text-[13px] font-bold text-white transition-transform duration-300 group-hover:scale-110">
                    {t.avatarSeed}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate font-heading text-[14px] font-semibold text-deep">
                        {t.name}
                      </p>
                      {t.verified && (
                        <span
                          className="inline-flex shrink-0 items-center gap-0.5 text-[10px] font-medium text-sky"
                          title="Verified Traveler"
                        >
                          <BadgeCheck size={13} aria-hidden />
                        </span>
                      )}
                    </div>
                    <p className="truncate text-[12px] text-ink/50">
                      {t.location}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, s) => (
                    <Star
                      key={s}
                      size={13}
                      className={
                        s < t.rating
                          ? "fill-gold text-gold"
                          : "fill-mist text-mist"
                      }
                      aria-hidden
                    />
                  ))}
                </div>

                <p className="relative z-10 mt-3 text-[13px] leading-relaxed text-ink/70">
                  {t.reviewText}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-mist px-2.5 py-1 text-[10px] font-semibold text-deep">
                    <BookingIcon size={11} aria-hidden />
                    {t.bookingType}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] text-ink/50">
                    <MapPin size={11} aria-hidden />
                    {t.destination}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] text-ink/50">
                    <Calendar size={11} aria-hidden />
                    {t.travelDate}
                  </span>
                </div>

                <div className="mt-4 flex items-center gap-1.5 border-t border-deep/10 pt-3 text-[11px] text-ink/45">
                  <ThumbsUp size={12} aria-hidden />
                  {t.helpfulCount} found this helpful
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
        View all reviews
        <ArrowRight size={14} aria-hidden />
      </button>
    </section>
  );
}
