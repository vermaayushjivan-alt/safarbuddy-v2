"use client";

import { useEffect, useState } from "react";
import {
  Star,
  MapPin,
  Wifi,
  Coffee,
  Snowflake,
  Waves,
  ArrowRight,
  BedDouble,
} from "lucide-react";

type Hotel = {
  id: string;
  name: string;
  location: string;
  stars: number;
  userRating: number;
  reviews: string;
  price: string;
  originalPrice: string;
  discount: string;
  banner: string;
};

const hotels: Hotel[] = [
  {
    id: "taj-lake-palace",
    name: "Taj Lake Palace",
    location: "Udaipur, Rajasthan",
    stars: 5,
    userRating: 4.9,
    reviews: "3.1k",
    price: "24,999",
    originalPrice: "32,000",
    discount: "22% OFF",
    banner: "from-sky to-deep",
  },
  {
    id: "oberoi-udaivilas",
    name: "The Oberoi Udaivilas",
    location: "Udaipur, Rajasthan",
    stars: 5,
    userRating: 4.9,
    reviews: "2.4k",
    price: "38,499",
    originalPrice: "45,000",
    discount: "14% OFF",
    banner: "from-orange to-orange-2",
  },
  {
    id: "itc-grand-goa",
    name: "ITC Grand Goa",
    location: "Cansaulim, Goa",
    stars: 5,
    userRating: 4.7,
    reviews: "5.6k",
    price: "16,999",
    originalPrice: "21,499",
    discount: "21% OFF",
    banner: "from-deep-2 to-sky",
  },
  {
    id: "leela-palace-jaipur",
    name: "Leela Palace Jaipur",
    location: "Jaipur, Rajasthan",
    stars: 5,
    userRating: 4.8,
    reviews: "4.2k",
    price: "21,499",
    originalPrice: "27,000",
    discount: "20% OFF",
    banner: "from-sky-light to-deep-2",
  },
  {
    id: "radisson-blu-manali",
    name: "Radisson Blu Manali",
    location: "Manali, Himachal Pradesh",
    stars: 4,
    userRating: 4.5,
    reviews: "6.8k",
    price: "8,499",
    originalPrice: "10,999",
    discount: "23% OFF",
    banner: "from-deep to-sky-light",
  },
  {
    id: "lemon-tree-delhi",
    name: "Lemon Tree Delhi",
    location: "Aerocity, New Delhi",
    stars: 4,
    userRating: 4.4,
    reviews: "9.3k",
    price: "5,299",
    originalPrice: "6,999",
    discount: "24% OFF",
    banner: "from-orange-2 to-deep",
  },
];

const amenities = [
  { icon: Wifi, label: "Free WiFi" },
  { icon: Coffee, label: "Breakfast" },
  { icon: Snowflake, label: "AC" },
  { icon: Waves, label: "Pool" },
];

function HotelSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-[0_16px_30px_-18px_rgba(11,47,92,0.4)]">
      <div className="skeleton h-44 w-full" />
      <div className="space-y-3 p-5">
        <div className="skeleton h-4 w-2/3 rounded-full" />
        <div className="skeleton h-3 w-1/2 rounded-full" />
        <div className="skeleton h-3 w-full rounded-full" />
        <div className="flex gap-2">
          <div className="skeleton h-9 w-1/2 rounded-lg" />
          <div className="skeleton h-9 w-1/2 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

function EmptyHotels() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-deep/15 bg-mist-2 px-6 py-16 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-full bg-mist text-deep">
        <BedDouble size={20} aria-hidden />
      </div>
      <p className="mt-4 font-heading text-[15px] font-semibold text-deep">
        No trending hotels right now
      </p>
      <p className="mt-1 max-w-xs text-[13px] text-ink/55">
        Our most-booked stays refresh every week — check back soon.
      </p>
    </div>
  );
}

export default function Trending() {
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
            Trending this week
          </span>
          <h2 className="mt-1 font-display text-3xl text-deep">
            Trending Hotels
          </h2>
          <p className="mt-2 max-w-md text-[14px] text-ink/60">
            Discover the most booked hotels at the best prices.
          </p>
        </div>
        <button
          type="button"
          className="focus-ring hidden shrink-0 items-center gap-1.5 rounded-full border border-deep/15 bg-white px-4 py-2 font-heading text-[13px] font-semibold text-deep transition hover:border-deep/30 hover:bg-mist sm:flex"
        >
          View all hotels
          <ArrowRight size={14} aria-hidden />
        </button>
      </div>

      {loading ? (
        <div
          className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
          aria-busy="true"
          aria-label="Loading trending hotels"
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <HotelSkeleton key={i} />
          ))}
        </div>
      ) : hotels.length === 0 ? (
        <EmptyHotels />
      ) : (
        <div
          className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
          role="list"
          aria-label="Trending hotels"
        >
          {hotels.map((h, i) => (
            <div
              key={h.id}
              role="listitem"
              className="reveal hover-lift group overflow-hidden rounded-2xl bg-white/90 shadow-[0_16px_30px_-18px_rgba(11,47,92,0.4)] backdrop-blur-sm hover:shadow-[0_24px_40px_-16px_rgba(11,47,92,0.45)]"
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <div className="relative h-44 overflow-hidden">
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${h.banner} transition-transform duration-500 ease-out group-hover:scale-110`}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/0 to-black/0" />

                <span className="absolute left-3 top-3 rounded-full bg-orange px-2.5 py-1 text-[10px] font-semibold text-white shadow-sm">
                  {h.discount}
                </span>
                <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-deep backdrop-blur-sm">
                  {Array.from({ length: h.stars }).map((_, s) => (
                    <Star
                      key={s}
                      size={10}
                      className="fill-gold text-gold"
                      aria-hidden
                    />
                  ))}
                </span>

                <div className="absolute bottom-3 left-4 right-4 text-white">
                  <p className="font-heading text-lg font-semibold leading-tight">
                    {h.name}
                  </p>
                  <p className="flex items-center gap-1 text-[12px] text-white/80">
                    <MapPin size={11} aria-hidden />
                    {h.location}
                  </p>
                </div>
              </div>

              <div className="p-5">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-md bg-mist px-2 py-0.5 text-[12px] font-semibold text-deep">
                    <Star size={11} className="fill-deep text-deep" aria-hidden />
                    {h.userRating.toFixed(1)}
                  </span>
                  <span className="text-[12px] text-ink/50">
                    {h.reviews} reviews
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-3">
                  {amenities.map((a) => (
                    <span
                      key={a.label}
                      title={a.label}
                      className="flex items-center gap-1 text-[11px] text-ink/50"
                    >
                      <a.icon size={13} aria-hidden />
                      <span className="hidden sm:inline">{a.label}</span>
                    </span>
                  ))}
                </div>

                <div className="mt-4 flex items-end justify-between">
                  <div>
                    <p className="text-[11px] text-ink/45">Per night</p>
                    <div className="flex items-baseline gap-2">
                      <span className="font-display text-xl text-orange">
                        ₹{h.price}
                      </span>
                      <span className="text-[12px] text-ink/40 line-through">
                        ₹{h.originalPrice}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    className="focus-ring flex-1 rounded-xl border border-deep/15 py-2.5 font-heading text-[13px] font-semibold text-deep transition hover:bg-mist active:scale-[0.98]"
                  >
                    View details
                  </button>
                  <button
                    type="button"
                    className="focus-ring flex-1 rounded-xl bg-deep py-2.5 font-heading text-[13px] font-semibold text-cream transition hover:bg-deep-2 active:scale-[0.98]"
                  >
                    Book now
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        className="focus-ring mt-6 flex w-full items-center justify-center gap-1.5 rounded-full border border-deep/15 bg-white px-4 py-2.5 font-heading text-[13px] font-semibold text-deep sm:hidden"
      >
        View all hotels
        <ArrowRight size={14} aria-hidden />
      </button>
    </section>
  );
}
