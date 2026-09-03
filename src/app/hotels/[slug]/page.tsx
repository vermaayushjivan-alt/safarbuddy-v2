// ROOT PATH: src/app/hotels/[slug]/page.tsx
import Image from "next/image";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { MapPin, Star } from "lucide-react";
import Navbar from "@/components/home/Navbar";
import Footer from "@/components/home/Footer";
import { getHotelBySlug, getHotelGalleryImages } from "@/app/actions/hotel.actions";
import { getBookableRoomsForHotel } from "@/app/actions/room-type.actions";
import { slugify } from "@/lib/utils/format";
import ImageCarousel from "@/components/public/ImageCarousel";

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
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    checkin?: string;
    checkout?: string;
    guests?: string;
  }>;
}) {
  const { slug } = await params;
  const { checkin, checkout, guests } = await searchParams;

  // HOME-HOTEL-SEARCH-01: carry the dates/guests picked at search time
  // through room + booking links, instead of dropping them here.
  const stayParams = new URLSearchParams();
  if (checkin) stayParams.set("checkin", checkin);
  if (checkout) stayParams.set("checkout", checkout);
  if (guests) stayParams.set("guests", guests);
  const stayQuery = stayParams.toString() ? `?${stayParams.toString()}` : "";

  const hotel = await getHotelBySlug(slug);

  if (!hotel) {
    notFound();
  }

  // CANONICAL-REDIRECT FIX (encoded/legacy slug 404):
  // Vercel Runtime Logs confirmed this function DOES receive legacy
  // requests (e.g. the %20-encoded URL) and DOES resolve them to the
  // correct hotel via getHotelBySlug()'s exact -> canonical -> legacy
  // self-heal chain — the 200 shows up in the logs every time. The
  // page still intermittently rendered a 404 in the browser because a
  // non-canonical URL (raw spaces, %20, mixed case, etc.) is its own
  // distinct cache key, and something between Vercel and the browser
  // (edge cache / intermediate proxy / browser cache) could still be
  // holding an old cached response for that exact non-canonical URL,
  // independent of how correct the underlying lookup is.
  //
  // Fix: once the hotel is resolved, if the URL the visitor is on
  // isn't already the canonical slug, issue a permanent redirect to
  // the canonical URL instead of rendering content at the
  // non-canonical one. The legacy URL then only ever needs to serve a
  // tiny redirect (which itself gets a fresh, correct response every
  // time this function runs), and every visitor lands on the single
  // canonical URL that is already proven to work reliably. This never
  // 404s: getHotelBySlug already returned a hotel above, so canonical
  // is always derived from real, existing data — never invented, no
  // extra DB call, no redirect loop (once on the canonical slug, this
  // check is false and the page renders normally).
  const canonicalSlug = slugify(hotel.slug);
  if (canonicalSlug && canonicalSlug !== slug) {
    permanentRedirect(`/hotels/${canonicalSlug}`);
  }

  // ROOM-05 (public read path): rooms + their resolved rates for today.
  // Previously this page never fetched hotel_rooms/room_prices at all,
  // so no room ever showed here regardless of what was set in the admin
  // panel. getBookableRoomsForHotel is a public (no-auth) read — see
  // room-type.actions.ts for why this was missing.
  const bookableRooms = await getBookableRoomsForHotel(hotel.id);

  // PUBLIC-02: full gallery (was only ever hotel.thumbnail — a single
  // is_primary image — before this). See getHotelGalleryImages.
  const galleryImages = await getHotelGalleryImages(hotel.id);

  return (
    <main className="bg-cream">
      <Navbar />

      <section className="mx-auto max-w-5xl px-6 py-12">
        <ImageCarousel
          images={
            galleryImages.length > 0
              ? galleryImages
              : hotel.thumbnail
                ? [{ id: "thumbnail", publicUrl: hotel.thumbnail }]
                : []
          }
          alt={hotel.hotel_name}
        />

        <div className="mt-4">
          <h1 className="font-display text-3xl text-deep sm:text-4xl">{hotel.hotel_name}</h1>
          <p className="mt-1 flex items-center gap-1.5 text-[14px] text-ink/60">
            <MapPin size={14} aria-hidden />
            {formatLocation(hotel.city, hotel.state, hotel.country)}
          </p>
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

            <h2 className="mt-8 font-heading text-[16px] font-semibold text-deep">
              Rooms
            </h2>
            {bookableRooms.length === 0 ? (
              <p className="mt-2 text-[14px] text-ink/60">
                No rooms are available to book yet.
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                {bookableRooms.map((room) => {
                  const thumb =
                    room.images.find((img) => img.is_primary) ??
                    room.images[0] ??
                    null;

                  // ROOM-06: teaser card now links into the dedicated
                  // room detail page instead of surfacing a "Book"
                  // shortcut directly from the list — the room's own
                  // page is where booking happens, this is just a
                  // preview. See src/app/hotels/[slug]/rooms/[roomId].
                  return (
                    <Link
                      key={room.id}
                      href={`/hotels/${canonicalSlug}/rooms/${room.id}${stayQuery}`}
                      className="focus-ring flex items-center justify-between gap-4 rounded-xl border border-deep/15 bg-white p-4 transition hover:border-deep/30 hover:shadow-sm"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-mist">
                          {thumb ? (
                            <Image
                              src={thumb.publicUrl}
                              alt={room.room_name}
                              fill
                              sizes="56px"
                              className="object-cover"
                            />
                          ) : null}
                        </div>
                        <div className="min-w-0">
                          <p className="font-heading text-[14px] font-semibold text-deep">
                            {room.room_name}
                          </p>
                          <p className="mt-0.5 text-[12px] capitalize text-ink/55">
                            {room.room_type} · Sleeps {room.max_occupancy}
                            {room.bed_type ? ` · ${room.bed_type}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-display text-lg text-orange">
                          ₹{formatPrice(room.price)}
                        </p>
                        <span className="mt-1 inline-block text-[12px] font-semibold text-deep/60">
                          View details →
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          <aside className="h-fit rounded-2xl border border-deep/15 bg-white p-6">
            <p className="text-[11px] text-ink/45">Per night</p>
            <p className="mt-1 font-display text-2xl text-orange">
              ₹{formatPrice(
                bookableRooms.length > 0
                  ? Math.min(...bookableRooms.map((r) => r.price))
                  : hotel.starting_price
              )}
            </p>
            {/* BOOKING-01: was a disabled "Booking coming soon" button. */}
            <Link
              href={`/hotels/${canonicalSlug}/book${stayQuery}`}
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
