import Link from "next/link";
import Image from "next/image";
import { MapPin, Star, BedDouble } from "lucide-react";
import type { HotelRecord } from "@/lib/repositories/hotel.repository";

// PUBLIC-01 — shared card grid for the public /hotels listing page
// (src/app/hotels/page.tsx). Mirrors components/public/DestinationGrid.tsx.
// Only renders fields that exist on HotelRecord.

function formatLocation(city: string | null, state: string | null): string {
  if (city && state) return `${city}, ${state}`;
  if (city) return city;
  if (state) return state;
  return "Location unavailable";
}

function formatPrice(price: number | null): string {
  if (price == null) return "—";
  return price.toLocaleString("en-IN");
}

function hotelHref(h: HotelRecord): string {
  const slug = h.slug && h.slug.trim().length > 0 ? h.slug : String(h.id);
  return `/hotels/${slug}`;
}

export function HotelGrid({ hotels }: { hotels: HotelRecord[] }) {
  if (hotels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-deep/15 bg-mist-2 px-6 py-16 text-center">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-mist text-deep">
          <BedDouble size={20} aria-hidden />
        </div>
        <p className="mt-4 font-heading text-[15px] font-semibold text-deep">
          No hotels to show
        </p>
        <p className="mt-1 max-w-xs text-[13px] text-ink/55">
          We&apos;re adding new stays — check back shortly.
        </p>
      </div>
    );
  }

  return (
    <div
      className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
      role="list"
      aria-label="Hotels"
    >
      {hotels.map((h) => {
        const hasImage = Boolean(h.thumbnail && h.thumbnail.trim().length > 0);

        return (
          <div
            key={h.id}
            role="listitem"
            className="hover-lift group overflow-hidden rounded-2xl bg-white shadow-[0_16px_30px_-18px_rgba(11,47,92,0.4)] hover:shadow-[0_24px_40px_-16px_rgba(11,47,92,0.45)]"
          >
            <div className="relative h-44 overflow-hidden">
              {hasImage ? (
                <Image
                  src={h.thumbnail as string}
                  alt={h.hotel_name}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  className="object-cover transition-transform duration-500 ease-out group-hover:scale-110"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-sky to-deep transition-transform duration-500 ease-out group-hover:scale-110" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/0 to-black/0" />

              <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-deep backdrop-blur-sm">
                <Star size={12} className="fill-gold text-gold" aria-hidden />
                {h.star_rating != null ? h.star_rating.toFixed(1) : "—"}
              </span>

              <div className="absolute bottom-3 left-4 right-4 text-white">
                <p className="font-heading text-lg font-semibold leading-tight">
                  {h.hotel_name}
                </p>
                <p className="flex items-center gap-1 text-[12px] text-white/80">
                  <MapPin size={11} aria-hidden />
                  {formatLocation(h.city, h.state)}
                </p>
              </div>
            </div>

            <div className="p-5">
              <p className="text-[12px] text-ink/50">
                Starting from
                <span className="ml-1.5 font-display text-[17px] text-orange">
                  ₹{formatPrice(h.starting_price)}
                </span>
              </p>

              <Link
                href={hotelHref(h)}
                className="focus-ring mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl border border-deep/15 py-2.5 font-heading text-[13px] font-semibold text-deep transition group-hover:bg-deep group-hover:text-cream active:scale-[0.98]"
              >
                View Hotel
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}
