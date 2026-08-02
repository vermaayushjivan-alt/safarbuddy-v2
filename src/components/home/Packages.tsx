"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  Star,
  MapPin,
  Clock,
  ArrowRight,
  Plane,
  BedDouble,
  Coffee,
  Camera,
  Car,
  ShieldCheck,
  Sparkles,
  Package as PackageIcon,
  type LucideIcon,
} from "lucide-react";

type Package = {
  id: string;
  title: string;
  destination: string;
  duration: string;
  imageSeed: string;
  rating: number;
  reviews: string;
  price: string;
  originalPrice: string;
  discount: string;
  highlights: string[];
  limitedOffer: boolean;
};

const highlightIcons: Record<string, LucideIcon> = {
  "Flight Included": Plane,
  "Hotel Included": BedDouble,
  Breakfast: Coffee,
  Sightseeing: Camera,
  "Airport Transfer": Car,
  "Free Cancellation": ShieldCheck,
};

const packages: Package[] = [
  {
    id: "goa-beach-escape",
    title: "Goa Beach Escape",
    destination: "Goa, India",
    duration: "4 Days / 3 Nights",
    imageSeed: "goa-beach-escape",
    rating: 4.6,
    reviews: "2.3k",
    price: "12,999",
    originalPrice: "17,999",
    discount: "28% OFF",
    highlights: ["Flight Included", "Hotel Included", "Breakfast", "Free Cancellation"],
    limitedOffer: true,
  },
  {
    id: "kashmir-paradise",
    title: "Kashmir Paradise",
    destination: "Srinagar, Kashmir",
    duration: "6 Days / 5 Nights",
    imageSeed: "kashmir-paradise",
    rating: 4.8,
    reviews: "1.8k",
    price: "24,999",
    originalPrice: "32,999",
    discount: "24% OFF",
    highlights: ["Hotel Included", "Sightseeing", "Airport Transfer", "Breakfast"],
    limitedOffer: true,
  },
  {
    id: "bali-honeymoon",
    title: "Bali Honeymoon",
    destination: "Bali, Indonesia",
    duration: "5 Days / 4 Nights",
    imageSeed: "bali-honeymoon",
    rating: 4.9,
    reviews: "3.5k",
    price: "42,999",
    originalPrice: "54,999",
    discount: "22% OFF",
    highlights: ["Flight Included", "Hotel Included", "Airport Transfer", "Free Cancellation"],
    limitedOffer: true,
  },
  {
    id: "dubai-luxury-tour",
    title: "Dubai Luxury Tour",
    destination: "Dubai, UAE",
    duration: "5 Days / 4 Nights",
    imageSeed: "dubai-luxury-tour",
    rating: 4.7,
    reviews: "4.1k",
    price: "38,499",
    originalPrice: "47,999",
    discount: "20% OFF",
    highlights: ["Flight Included", "Hotel Included", "Sightseeing", "Breakfast"],
    limitedOffer: false,
  },
  {
    id: "thailand-adventure",
    title: "Thailand Adventure",
    destination: "Phuket & Krabi, Thailand",
    duration: "6 Days / 5 Nights",
    imageSeed: "thailand-adventure",
    rating: 4.6,
    reviews: "2.9k",
    price: "27,499",
    originalPrice: "35,999",
    discount: "24% OFF",
    highlights: ["Flight Included", "Hotel Included", "Sightseeing", "Free Cancellation"],
    limitedOffer: true,
  },
  {
    id: "himachal-family-trip",
    title: "Himachal Family Trip",
    destination: "Manali & Shimla, Himachal Pradesh",
    duration: "5 Days / 4 Nights",
    imageSeed: "himachal-family-trip",
    rating: 4.5,
    reviews: "5.2k",
    price: "15,499",
    originalPrice: "19,999",
    discount: "22% OFF",
    highlights: ["Hotel Included", "Breakfast", "Sightseeing", "Airport Transfer"],
    limitedOffer: false,
  },
  {
    id: "kerala-backwaters",
    title: "Kerala Backwaters",
    destination: "Alleppey, Kerala",
    duration: "4 Days / 3 Nights",
    imageSeed: "kerala-backwaters",
    rating: 4.7,
    reviews: "3.0k",
    price: "13,999",
    originalPrice: "17,499",
    discount: "20% OFF",
    highlights: ["Hotel Included", "Breakfast", "Sightseeing", "Free Cancellation"],
    limitedOffer: true,
  },
  {
    id: "andaman-island-tour",
    title: "Andaman Island Tour",
    destination: "Port Blair, Andaman",
    duration: "5 Days / 4 Nights",
    imageSeed: "andaman-island-tour",
    rating: 4.8,
    reviews: "1.6k",
    price: "22,999",
    originalPrice: "28,999",
    discount: "21% OFF",
    highlights: ["Flight Included", "Hotel Included", "Sightseeing", "Airport Transfer"],
    limitedOffer: false,
  },
];

function PackageSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-[0_16px_30px_-18px_rgba(11,47,92,0.4)]">
      <div className="skeleton h-56 w-full" />
      <div className="space-y-3 p-5">
        <div className="skeleton h-4 w-2/3 rounded-full" />
        <div className="skeleton h-3 w-1/2 rounded-full" />
        <div className="flex gap-1.5">
          <div className="skeleton h-5 w-16 rounded-full" />
          <div className="skeleton h-5 w-16 rounded-full" />
          <div className="skeleton h-5 w-16 rounded-full" />
        </div>
        <div className="skeleton h-3 w-full rounded-full" />
        <div className="flex gap-2">
          <div className="skeleton h-9 w-1/2 rounded-lg" />
          <div className="skeleton h-9 w-1/2 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

function EmptyPackages() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-deep/15 bg-mist-2 px-6 py-16 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-full bg-mist text-deep">
        <PackageIcon size={20} aria-hidden />
      </div>
      <p className="mt-4 font-heading text-[15px] font-semibold text-deep">
        No holiday packages right now
      </p>
      <p className="mt-1 max-w-xs text-[13px] text-ink/55">
        New handpicked getaways drop every week — check back soon.
      </p>
    </div>
  );
}

export default function Packages() {
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
            Curated getaways
          </span>
          <h2 className="mt-1 font-display text-3xl text-deep">
            Holiday Packages
          </h2>
          <p className="mt-2 max-w-md text-[14px] text-ink/60">
            Handpicked holiday experiences at the best prices.
          </p>
        </div>
        <button
          type="button"
          className="focus-ring hidden shrink-0 items-center gap-1.5 rounded-full border border-deep/15 bg-white px-4 py-2 font-heading text-[13px] font-semibold text-deep transition hover:border-deep/30 hover:bg-mist sm:flex"
        >
          View all packages
          <ArrowRight size={14} aria-hidden />
        </button>
      </div>

      {loading ? (
        <div
          className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
          aria-busy="true"
          aria-label="Loading holiday packages"
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <PackageSkeleton key={i} />
          ))}
        </div>
      ) : packages.length === 0 ? (
        <EmptyPackages />
      ) : (
        <div
          className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
          role="list"
          aria-label="Holiday packages"
        >
          {packages.map((p, i) => (
            <div
              key={p.id}
              role="listitem"
              className="reveal hover-lift group overflow-hidden rounded-2xl bg-white/90 shadow-[0_16px_30px_-18px_rgba(11,47,92,0.4)] backdrop-blur-sm hover:shadow-[0_24px_40px_-16px_rgba(11,47,92,0.45)]"
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <div className="relative h-56 w-full overflow-hidden">
                <Image
                  src={`https://picsum.photos/seed/${p.imageSeed}/800/600`}
                  alt={`${p.title} – ${p.destination}`}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover transition-transform duration-500 ease-out group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-black/0" />

                <span className="absolute left-3 top-3 rounded-full bg-orange px-2.5 py-1 text-[10px] font-semibold text-white shadow-sm">
                  {p.discount}
                </span>
                {p.limitedOffer && (
                  <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-cream/95 px-2.5 py-1 text-[10px] font-semibold text-orange backdrop-blur-sm">
                    <Sparkles size={11} aria-hidden />
                    Limited Time Offer
                  </span>
                )}

                <div className="absolute bottom-3 left-4 right-4 text-white">
                  <p className="font-heading text-lg font-semibold leading-tight">
                    {p.title}
                  </p>
                  <p className="flex items-center gap-1 text-[12px] text-white/80">
                    <MapPin size={11} aria-hidden />
                    {p.destination}
                  </p>
                </div>
              </div>

              <div className="p-5">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-md bg-mist px-2 py-0.5 text-[12px] font-semibold text-deep">
                    <Star size={11} className="fill-deep text-deep" aria-hidden />
                    {p.rating.toFixed(1)}
                  </span>
                  <span className="text-[12px] text-ink/50">
                    {p.reviews} reviews
                  </span>
                  <span className="ml-auto flex items-center gap-1 text-[12px] text-ink/50">
                    <Clock size={11} aria-hidden />
                    {p.duration}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {p.highlights.map((h) => {
                    const Icon = highlightIcons[h] ?? Sparkles;
                    return (
                      <span
                        key={h}
                        className="inline-flex items-center gap-1 rounded-full bg-mist px-2 py-1 text-[10px] font-medium text-deep/80"
                      >
                        <Icon size={10} aria-hidden />
                        {h}
                      </span>
                    );
                  })}
                </div>

                <div className="mt-4 flex items-end justify-between">
                  <div>
                    <p className="text-[11px] text-ink/45">Starting from</p>
                    <div className="flex items-baseline gap-2">
                      <span className="font-display text-xl text-orange">
                        ₹{p.price}
                      </span>
                      <span className="text-[12px] text-ink/40 line-through">
                        ₹{p.originalPrice}
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
        View all packages
        <ArrowRight size={14} aria-hidden />
      </button>
    </section>
  );
}
