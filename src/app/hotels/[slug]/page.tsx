// ROOT PATH: src/app/hotels/[slug]/page.tsx
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import {
  BedDouble,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Coffee,
  MapPin,
  Phone,
  ShieldCheck,
  Snowflake,
  Star,
  Users,
  Waves,
  Wifi,
} from "lucide-react";
import Navbar from "@/components/home/Navbar";
import Footer from "@/components/home/Footer";
import { footerContact } from "@/data/home";
import { getHotelBySlug, getHotelGalleryImages } from "@/app/actions/hotel.actions";
import { getBookableRoomsForHotel } from "@/app/actions/room-type.actions";
import { getHotelFacilitiesPublic } from "@/app/actions/hotel-facility.actions";
import { slugify } from "@/lib/utils/format";
import { absoluteUrl, SITE_NAME } from "@/lib/seo/site";
import HotelGallery from "@/components/public/HotelGallery";
import HotelMap from "@/components/public/HotelMap";
import HotelReviews from "@/components/public/HotelReviews";
import { getHotelReviewSummary } from "@/app/actions/review.actions";
import ReadMore from "@/components/public/ReadMore";
import { HotelIcon } from "@/components/layout/nav-icons";

// SEO_AUDIT.md §3.2/§3.4 — every hotel previously inherited the exact
// same site-wide title/description from the root layout. Built only
// from fields confirmed to exist on HotelRecord (RULE 7/11 — no
// invented ratings, amenities, or copy). getHotelBySlug() already
// filters to status === 'active' (see hotel.repository.ts
// queryHotelBySlugValue), so every hotel this resolves to is public by
// definition — no separate noindex branch is needed here.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const hotel = await getHotelBySlug(slug);

  if (!hotel) {
    return { title: `Hotel not found | ${SITE_NAME}` };
  }

  const canonicalSlug = slugify(hotel.slug) || hotel.slug;
  const locationBits = [hotel.city, hotel.state].filter(Boolean).join(", ");
  const title = locationBits
    ? `${hotel.hotel_name} — Hotel in ${locationBits} | ${SITE_NAME}`
    : `${hotel.hotel_name} | ${SITE_NAME}`;

  const rawDescription =
    hotel.description?.trim() ||
    (locationBits
      ? `Book ${hotel.hotel_name} in ${locationBits}. Compare rooms and prices, and reserve directly on ${SITE_NAME}.`
      : `Book ${hotel.hotel_name} on ${SITE_NAME}. Compare rooms and prices, and reserve directly.`);
  const description =
    rawDescription.length > 160
      ? `${rawDescription.slice(0, 157).trimEnd()}...`
      : rawDescription;

  const canonicalPath = `/hotels/${canonicalSlug}`;
  const ogImages = hotel.thumbnail ? [{ url: hotel.thumbnail }] : undefined;

  return {
    title,
    description,
    alternates: { canonical: canonicalPath },
    openGraph: {
      title,
      description,
      url: absoluteUrl(canonicalPath),
      siteName: SITE_NAME,
      type: "website",
      images: ogImages,
    },
    twitter: {
      card: ogImages ? "summary_large_image" : "summary",
      title,
      description,
      images: ogImages,
    },
  };
}

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

// MOBILE-03: "14:00" / "14:00:00" -> "2:00 PM". Anything unparsable is
// shown as-is rather than guessed.
function formatTime(value: string | null | undefined): string {
  if (!value) return "—";
  const match = /^(\d{1,2}):(\d{2})/.exec(value.trim());
  if (!match) return value;
  const h = Number(match[1]);
  const m = match[2];
  if (h > 23) return value;
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m} ${suffix}`;
}

// Icon per well-known facility code (codes from 011_vendor03_hotel_facilities.sql);
// anything else gets the neutral check icon.
function FacilityIcon({ code }: { code: string }) {
  const cls = "h-4 w-4 shrink-0 text-orange";
  switch (code) {
    case "free_wifi":
      return <Wifi className={cls} aria-hidden />;
    case "swimming_pool":
      return <Waves className={cls} aria-hidden />;
    case "ac_rooms":
      return <Snowflake className={cls} aria-hidden />;
    case "restaurant":
      return <Coffee className={cls} aria-hidden />;
    default:
      return <CheckCircle2 className={cls} aria-hidden />;
  }
}

function HighlightTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl bg-mist-2 px-2 py-4 text-center">
      <span className="text-deep">{icon}</span>
      <p className="mt-2 text-[12px] text-ink/50">{label}</p>
      <p className="mt-0.5 font-heading text-[14px] font-semibold capitalize leading-tight text-deep">
        {value}
      </p>
    </div>
  );
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
  // MOBILE-03: rooms, gallery and amenities are independent reads, so they
  // run in parallel instead of one after another.
  const [bookableRooms, galleryImages, facilities] = await Promise.all([
    getBookableRoomsForHotel(hotel.id),
    getHotelGalleryImages(hotel.id),
    getHotelFacilitiesPublic(hotel.id),
  ]);

  // PUBLIC-02: full gallery (was only ever hotel.thumbnail — a single
  // is_primary image — before this). See getHotelGalleryImages.
  // (galleryImages is fetched together with the rooms above.)

  // SEO_AUDIT.md §3.3 — no structured data existed anywhere. Built only
  // from fields confirmed to exist on HotelRecord: no AggregateRating/
  // Review block (PROJECT_STATUS.md shows no reviews system built yet
  // — see SEO_AUDIT.md priority list item 4), no fabricated amenities.
  // hotel.total_reviews/star_rating are real (if currently always
  // null pre-reviews-system) HotelRecord fields, not invented ones.
  // GOLIVE-15: real review summary; the structured-data rating below is only
  // emitted when at least one PUBLISHED review exists (never invented).
  const reviewSummary = await getHotelReviewSummary(hotel.id);

  const hotelJsonLd = {
    "@context": "https://schema.org",
    "@type": "Hotel",
    ...(reviewSummary.count > 0 && reviewSummary.average != null
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: reviewSummary.average,
            reviewCount: reviewSummary.count,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
    name: hotel.hotel_name,
    description: hotel.description ?? undefined,
    url: absoluteUrl(`/hotels/${canonicalSlug}`),
    image: galleryImages.length > 0 ? galleryImages.map((img) => img.publicUrl) : hotel.thumbnail ?? undefined,
    address: {
      "@type": "PostalAddress",
      streetAddress: hotel.address ?? undefined,
      addressLocality: hotel.city ?? undefined,
      addressRegion: hotel.state ?? undefined,
      addressCountry: hotel.country ?? undefined,
    },
    ...(hotel.latitude != null && hotel.longitude != null
      ? {
          geo: {
            "@type": "GeoCoordinates",
            latitude: hotel.latitude,
            longitude: hotel.longitude,
          },
        }
      : {}),
    ...(hotel.star_rating != null
      ? { starRating: { "@type": "Rating", ratingValue: hotel.star_rating } }
      : {}),
    ...(hotel.starting_price != null
      ? {
          priceRange: `₹${hotel.starting_price.toLocaleString("en-IN")}+`,
        }
      : {}),
    telephone: hotel.phone ?? undefined,
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
      { "@type": "ListItem", position: 2, name: "Hotels", item: absoluteUrl("/hotels") },
      {
        "@type": "ListItem",
        position: 3,
        name: hotel.hotel_name,
        item: absoluteUrl(`/hotels/${canonicalSlug}`),
      },
    ],
  };

  const galleryForUi =
    galleryImages.length > 0
      ? galleryImages
      : hotel.thumbnail
        ? [{ id: "thumbnail", publicUrl: hotel.thumbnail }]
        : [];

  const fromPrice =
    bookableRooms.length > 0
      ? Math.min(...bookableRooms.map((r) => r.price))
      : hotel.starting_price;
  const maxGuests =
    bookableRooms.length > 0
      ? Math.max(...bookableRooms.map((r) => r.max_occupancy))
      : null;
  const supportTel = `tel:${footerContact.supportPhone.replace(/\s+/g, "")}`;
  const bookHref = `/hotels/${canonicalSlug}/book${stayQuery}`;

  return (
    <main className="bg-cream">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(hotelJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <Navbar />

      {/* MOBILE-03: app-style detail page. Edge-to-edge gallery on phones,
          padded content below. Owner contact details are intentionally NOT
          shown anywhere on this page. */}
      <section className="mx-auto max-w-5xl pb-44 sm:px-6 sm:py-8 lg:py-12 lg:pb-12">
        <HotelGallery
          images={galleryForUi}
          alt={hotel.hotel_name}
          shareTitle={hotel.hotel_name}
        />

        <div className="px-5 sm:px-0">
          {/* Title + price */}
          <div className="mt-5 flex items-start justify-between gap-4">
            <h1 className="min-w-0 font-display text-[26px] leading-tight text-deep sm:text-4xl">
              {hotel.hotel_name}
            </h1>
            {fromPrice != null && (
              <div className="shrink-0 text-right">
                <p className="font-display text-2xl leading-none text-orange">
                  ₹{formatPrice(fromPrice)}
                </p>
                <p className="mt-1 text-[11px] text-ink/50">per night</p>
              </div>
            )}
          </div>

          <p className="mt-1.5 flex items-start gap-1.5 text-[14px] text-ink/60">
            <MapPin size={15} className="mt-0.5 shrink-0" aria-hidden />
            {formatLocation(hotel.city, hotel.state, hotel.country)}
          </p>

          {/* Check-in / check-out strip */}
          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-deep/10 bg-white px-4 py-3">
            <CalendarCheck size={22} className="shrink-0 text-deep" aria-hidden />
            <div className="flex flex-1 flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-ink/60">
              <span>
                Check-in: <b className="font-semibold text-ink">{formatTime(hotel.check_in_time)}</b>
              </span>
              <span className="hidden h-4 w-px bg-deep/15 sm:block" aria-hidden />
              <span>
                Check-out: <b className="font-semibold text-ink">{formatTime(hotel.check_out_time)}</b>
              </span>
            </div>
          </div>

          {/* Badges */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {hotel.is_verified && (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 font-heading text-[12px] font-semibold text-white">
                <ShieldCheck size={15} aria-hidden />
                Verified
              </span>
            )}
            {hotel.star_rating != null && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-mist px-3 py-1.5 text-[13px] font-semibold text-deep">
                <Star size={13} className="fill-deep text-deep" aria-hidden />
                {hotel.star_rating.toFixed(1)}
                {hotel.total_reviews != null && (
                  <span className="font-normal text-ink/50">
                    · {hotel.total_reviews} reviews
                  </span>
                )}
              </span>
            )}
            {hotel.property_type && (
              <span className="rounded-lg bg-mist px-3 py-1.5 text-[13px] font-medium capitalize text-deep">
                {hotel.property_type}
              </span>
            )}
          </div>

          <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2">
              {/* Highlights */}
              <h2 className="font-heading text-[16px] font-semibold text-deep">
                Property Highlights
              </h2>
              <div className="mt-3 grid grid-cols-3 gap-2.5">
                {hotel.property_type && (
                  <HighlightTile
                    icon={<HotelIcon className="h-6 w-6" />}
                    label="Type"
                    value={hotel.property_type}
                  />
                )}
                {hotel.star_rating != null && (
                  <HighlightTile
                    icon={<Star size={24} aria-hidden />}
                    label="Rating"
                    value={hotel.star_rating.toFixed(1)}
                  />
                )}
                {bookableRooms.length > 0 && (
                  <HighlightTile
                    icon={<BedDouble size={24} aria-hidden />}
                    label="Room types"
                    value={String(bookableRooms.length)}
                  />
                )}
                <HighlightTile
                  icon={<Clock size={24} aria-hidden />}
                  label="Check-in"
                  value={formatTime(hotel.check_in_time)}
                />
                <HighlightTile
                  icon={<Clock size={24} aria-hidden />}
                  label="Check-out"
                  value={formatTime(hotel.check_out_time)}
                />
                {maxGuests != null && (
                  <HighlightTile
                    icon={<Users size={24} aria-hidden />}
                    label="Sleeps up to"
                    value={String(maxGuests)}
                  />
                )}
              </div>

              {/* About */}
              <h2 className="mt-8 font-heading text-[16px] font-semibold text-deep">
                About this hotel
              </h2>
              <div className="mt-2">
                <ReadMore
                  text={hotel.description?.trim() || "No description available yet."}
                  className="text-[14px] leading-relaxed text-ink/70"
                />
              </div>

              {/* Services & amenities */}
              {facilities.length > 0 && (
                <section aria-labelledby="hotel-amenities-heading" className="mt-8">
                  <h2
                    id="hotel-amenities-heading"
                    className="font-heading text-[16px] font-semibold text-deep"
                  >
                    Services &amp; Amenities
                  </h2>
                  <ul className="mt-3 grid grid-cols-2 gap-2.5">
                    {facilities.map((facility) => (
                      <li
                        key={facility.id}
                        className="flex items-center gap-2.5 rounded-xl border border-deep/10 bg-white px-3 py-2.5 text-[13px] font-medium text-ink/75"
                      >
                        <FacilityIcon code={facility.code} />
                        <span className="leading-tight">{facility.label}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Rooms */}
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

                    // ROOM-06: teaser card links into the dedicated room
                    // detail page, where booking happens.
                    return (
                      <Link
                        key={room.id}
                        href={`/hotels/${canonicalSlug}/rooms/${room.id}${stayQuery}`}
                        className="focus-ring flex items-center justify-between gap-4 rounded-2xl border border-deep/10 bg-white p-3.5 transition hover:border-deep/30 hover:shadow-sm active:scale-[0.99]"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-mist">
                            {thumb ? (
                              <Image
                                src={thumb.publicUrl}
                                alt={room.room_name}
                                fill
                                sizes="64px"
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

              {/* Location */}
              <HotelMap
                hotelName={hotel.hotel_name}
                address={hotel.address}
                city={hotel.city}
                state={hotel.state}
                latitude={hotel.latitude}
                longitude={hotel.longitude}
                googleMapsUrl={hotel.google_maps_url}
              />

              {/* Policies */}
              {hotel.cancellation_policy?.trim() && (
                <section className="mt-8">
                  <h2 className="font-heading text-[16px] font-semibold text-deep">
                    Cancellation policy
                  </h2>
                  <div className="mt-2">
                    <ReadMore
                      text={hotel.cancellation_policy.trim()}
                      className="text-[14px] leading-relaxed text-ink/70"
                    />
                  </div>
                </section>
              )}
              {hotel.house_rules?.trim() && (
                <section className="mt-8">
                  <h2 className="font-heading text-[16px] font-semibold text-deep">
                    House rules
                  </h2>
                  <div className="mt-2">
                    <ReadMore
                      text={hotel.house_rules.trim()}
                      className="text-[14px] leading-relaxed text-ink/70"
                    />
                  </div>
                </section>
              )}

              {/* Guest reviews (GOLIVE-15) */}
              <HotelReviews hotelId={hotel.id} />
            </div>

            {/* Desktop booking card (phones use the sticky bar below) */}
            <aside className="hidden h-fit rounded-2xl border border-deep/15 bg-white p-6 lg:sticky lg:top-24 lg:block">
              <p className="text-[11px] text-ink/45">Per night</p>
              <p className="mt-1 font-display text-2xl text-orange">
                ₹{formatPrice(fromPrice)}
              </p>
              {/* BOOKING-01: was a disabled "Booking coming soon" button. */}
              <Link
                href={bookHref}
                className="focus-ring mt-5 block w-full rounded-xl bg-deep py-2.5 text-center font-heading text-[13px] font-semibold text-cream transition hover:bg-deep-2"
              >
                Book Now
              </Link>
            </aside>
          </div>
        </div>
      </section>

      {/* Phones: sticky price + Call SafarBuddy support + Book Now, sitting
          just above the bottom tab bar. The extra bottom padding keeps the
          buttons clear of the raised centre Search button. Call goes to
          SafarBuddy support, never to the property owner. */}
      <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30 border-t border-deep/10 bg-white/95 px-4 pb-6 pt-3 backdrop-blur-md lg:hidden">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <div className="min-w-0 pr-1">
            <p className="text-[11px] text-ink/50">From</p>
            <p className="font-display text-xl leading-none text-orange">
              ₹{formatPrice(fromPrice)}
            </p>
          </div>
          <a
            href={supportTel}
            aria-label="Call SafarBuddy support"
            className="focus-ring ml-auto grid h-11 w-11 shrink-0 place-items-center rounded-full bg-sky text-white shadow-md transition active:scale-95"
          >
            <Phone size={20} aria-hidden />
          </a>
          <Link
            href={bookHref}
            className="focus-ring rounded-full bg-orange px-7 py-3 font-heading text-[14px] font-semibold text-white shadow-[0_8px_20px_-8px_rgba(255,106,43,0.7)] transition active:scale-[0.97]"
          >
            Book Now
          </Link>
        </div>
      </div>

      <Footer />
    </main>
  );
}
