import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, Star } from "lucide-react";
import Navbar from "@/components/home/Navbar";
import Footer from "@/components/home/Footer";
import { getHotelBySlug } from "@/app/actions/hotel.actions";

// HOTEL 404 FIX: this page fetches from Supabase inside a Server
// Component. Next.js caches such fetches/route output by default
// unless told not to — which meant a hotel that 404'd once (e.g.
// before the slug-resolution fix) could keep 404ing forever from a
// stale cached result, even after the underlying data/code was
// correct. Forcing dynamic rendering makes every request re-run the
// lookup against the live database.
export const dynamic = "force-dynamic";

// PUBLIC-01 — public detail page for the AUTH-06 `/hotels` allowlist
// entry. Server component, no auth required. Only renders fields that
// already exist on HotelRecord — nothing invented.

function formatLocation(
  city: string | null,
  state: string | null,
  country: string | null
): string {
  return [city, state, country].filter(Boolean).join(", ") || "Location unavailable";
}

function formatPrice(price: number | null): string {
  if (price == null) return "—";
  return price.toLocaleString("en-IN");
}

export default async function HotelDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const hotel = await getHotelBySlug(slug);

  if (!hotel) {
    notFound();
  }

  const hasImage = Boolean(hotel.thumbnail && hotel.thumbnail.trim().length > 0);

  return (
    <main className="bg-cream">
      <Navbar />

      <section className="mx-auto max-w-5xl px-6 py-12">
        <div className="relative h-72 overflow-hidden rounded-2xl sm:h-96">
          {hasImage ? (
            <Image
              src={hotel.thumbnail as string}
              alt={hotel.hotel_name}
              fill
              sizes="(max-width: 1024px) 100vw, 960px"
              className="object-cover"
              priority
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-sky to-deep" aria-hidden />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/0 to-black/0" />

          <div className="absolute bottom-5 left-6 right-6 text-white">
            <h1 className="font-display text-3xl sm:text-4xl">{hotel.hotel_name}</h1>
            <p className="mt-1 flex items-center gap-1.5 text-[14px] text-white/85">
              <MapPin size={14} aria-hidden />
              {formatLocation(hotel.city, hotel.state, hotel.country)}
            </p>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-md bg-mist px-2.5 py-1 text-[13px] font-semibold text-deep">
                <Star size={12} className="fill-deep text-deep" aria-hidden />
                {hotel.star_rating != null ? hotel.star_rating.toFixed(1) : "—"}
              </span>
              {hotel.total_reviews != null && (
                <span className="text-[13px] text-ink/50">
                  {hotel.total_reviews} reviews
                </span>
              )}
            </div>

            <h2 className="mt-6 font-heading text-[16px] font-semibold text-deep">
              About this hotel
            </h2>
            <p className="mt-2 whitespace-pre-line text-[14px] leading-relaxed text-ink/70">
              {hotel.description ?? "No description available yet."}
            </p>

            {hotel.address && (
              <>
                <h2 className="mt-6 font-heading text-[16px] font-semibold text-deep">
                  Address
                </h2>
                <p className="mt-2 text-[14px] leading-relaxed text-ink/70">
                  {hotel.address}
                </p>
              </>
            )}
          </div>

          <aside className="h-fit rounded-2xl border border-deep/15 bg-white p-6">
            <p className="text-[11px] text-ink/45">Per night</p>
            <p className="mt-1 font-display text-2xl text-orange">
              ₹{formatPrice(hotel.starting_price)}
            </p>
            {/* BOOKING-01: was a disabled "Booking coming soon" button. */}
            <Link
              href={`/hotels/${hotel.slug}/book`}
              className="focus-ring mt-5 block w-full rounded-xl bg-deep py-2.5 text-center font-heading text-[13px] font-semibold text-cream transition hover:bg-deep-2"
            >
              Book Now
            </Link>
          </aside>
        </div>
      </section>

      <Footer />
    </main>
  );
}
