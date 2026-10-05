// ROOT PATH: src/app/hotels/[slug]/rooms/[roomId]/page.tsx
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  BedDouble,
  CalendarCheck,
  Clock,
  MapPin,
  Maximize,
  Phone,
  ShieldCheck,
  Star,
  Users,
} from "lucide-react";
import Navbar from "@/components/home/Navbar";
import Footer from "@/components/home/Footer";
import { footerContact } from "@/data/home";
import { getHotelBySlug } from "@/app/actions/hotel.actions";
import {
  getBookableRoomById,
  getBookableRoomsForHotel,
} from "@/app/actions/room-type.actions";
import { slugify } from "@/lib/utils/format";
import { SITE_NAME } from "@/lib/seo/site";
import HotelGallery from "@/components/public/HotelGallery";
import ReadMore from "@/components/public/ReadMore";

// ROOM-06 — public room detail page. Server component, no auth required.
// Styled to match the hotel detail page (app-style gallery, title + price,
// check-in strip, badges, highlight tiles, sticky mobile booking bar).
// Renders only fields returned by getBookableRoomById / HotelRecord — no
// amenities section: hotel_rooms has no amenities column (see
// DATABASE_BIBLE.md "never invent columns").
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; roomId: string }>;
}): Promise<Metadata> {
  const { slug, roomId } = await params;
  const hotel = await getHotelBySlug(slug);
  if (!hotel) return { title: `Room not found | ${SITE_NAME}` };
  const room = await getBookableRoomById(hotel.id, roomId);
  if (!room) return { title: `Room not found | ${SITE_NAME}` };
  return { title: `${room.room_name} — ${hotel.hotel_name} | ${SITE_NAME}` };
}

function formatPrice(price: number | null): string {
  if (price == null) return "—";
  return price.toLocaleString("en-IN");
}

// "14:00" / "14:00:00" -> "2:00 PM". Unparsable values are shown as-is.
function formatTime(value: string | null | undefined): string {
  if (!value) return "—";
  const match = /^(\d{1,2}):(\d{2})/.exec(value.trim());
  if (!match) return value;
  const h = Number(match[1]);
  if (h > 23) return value;
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${match[2]} ${suffix}`;
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

export default async function RoomDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; roomId: string }>;
  searchParams: Promise<{
    checkin?: string;
    checkout?: string;
    guests?: string;
  }>;
}) {
  const { slug, roomId } = await params;
  const { checkin, checkout, guests } = await searchParams;

  // HOME-HOTEL-SEARCH-01: carry dates/guests through to the booking form
  // and to sibling room links.
  const stayParams = new URLSearchParams();
  if (checkin) stayParams.set("checkin", checkin);
  if (checkout) stayParams.set("checkout", checkout);
  if (guests) stayParams.set("guests", guests);
  const stayQuery = stayParams.toString() ? `?${stayParams.toString()}` : "";
  const stayQuerySuffix = stayParams.toString()
    ? `&${stayParams.toString()}`
    : "";

  const hotel = await getHotelBySlug(slug);
  if (!hotel) {
    notFound();
  }

  const canonicalSlug = slugify(hotel.slug) || slug;

  const [room, allRooms] = await Promise.all([
    getBookableRoomById(hotel.id, roomId),
    getBookableRoomsForHotel(hotel.id),
  ]);
  if (!room) {
    notFound();
  }

  const otherRooms = allRooms.filter((r) => r.id !== room.id);
  const galleryImages = room.images.map((img) => ({
    id: img.id,
    publicUrl: img.publicUrl,
  }));

  const supportTel = `tel:${footerContact.supportPhone.replace(/\s+/g, "")}`;
  const bookHref = `/hotels/${canonicalSlug}/book?room=${room.id}${stayQuerySuffix}`;
  const hotelHref = `/hotels/${canonicalSlug}${stayQuery}`;

  const aboutText = `A ${room.room_type} room at ${hotel.hotel_name}, accommodating up to ${room.max_occupancy} guest${room.max_occupancy === 1 ? "" : "s"}${
    room.bed_type ? ` with ${room.bed_type.toLowerCase()} bedding` : ""
  }${room.room_size_sqft != null ? ` across ${room.room_size_sqft} sq ft` : ""}.`;

  return (
    <main className="bg-cream">
      <Navbar />

      {/* App-style detail page: edge-to-edge gallery on phones, padded
          content below — same structure as the hotel detail page. */}
      <section className="mx-auto max-w-5xl pb-44 sm:px-6 sm:py-8 lg:py-12 lg:pb-12">
        <HotelGallery
          images={galleryImages}
          alt={room.room_name}
          shareTitle={`${room.room_name} — ${hotel.hotel_name}`}
          fallbackHref={`/hotels/${canonicalSlug}`}
        />

        <div className="px-5 sm:px-0">
          {/* Title + price */}
          <div className="mt-5 flex items-start justify-between gap-4">
            <h1 className="min-w-0 font-display text-[26px] leading-tight text-deep sm:text-4xl">
              {room.room_name}
            </h1>
            <div className="shrink-0 text-right">
              <p className="font-display text-2xl leading-none text-orange">
                ₹{formatPrice(room.price)}
              </p>
              <p className="mt-1 text-[11px] text-ink/50">per night</p>
            </div>
          </div>

          <p className="mt-1.5 text-[14px] capitalize text-ink/60">
            {room.room_type} room at{" "}
            <Link
              href={hotelHref}
              className="focus-ring font-semibold normal-case text-deep underline-offset-2 hover:underline"
            >
              {hotel.hotel_name}
            </Link>
          </p>
          {(hotel.city || hotel.state) && (
            <p className="mt-1 flex items-start gap-1.5 text-[14px] text-ink/60">
              <MapPin size={15} className="mt-0.5 shrink-0" aria-hidden />
              {[hotel.city, hotel.state].filter(Boolean).join(", ")}
            </p>
          )}

          {/* Check-in / check-out strip (hotel timings) */}
          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-deep/10 bg-white px-4 py-3">
            <CalendarCheck size={22} className="shrink-0 text-deep" aria-hidden />
            <div className="flex flex-1 flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-ink/60">
              <span>
                Check-in:{" "}
                <b className="font-semibold text-ink">{formatTime(hotel.check_in_time)}</b>
              </span>
              <span className="hidden h-4 w-px bg-deep/15 sm:block" aria-hidden />
              <span>
                Check-out:{" "}
                <b className="font-semibold text-ink">{formatTime(hotel.check_out_time)}</b>
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
              </span>
            )}
            <span className="rounded-lg bg-mist px-3 py-1.5 text-[13px] font-medium capitalize text-deep">
              {room.room_type}
            </span>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2">
              {/* Highlights */}
              <h2 className="font-heading text-[16px] font-semibold text-deep">
                Room Highlights
              </h2>
              <div className="mt-3 grid grid-cols-3 gap-2.5">
                <HighlightTile
                  icon={<Users size={24} aria-hidden />}
                  label="Sleeps"
                  value={String(room.max_occupancy)}
                />
                <HighlightTile
                  icon={<Users size={24} aria-hidden />}
                  label="Adults"
                  value={String(room.capacity_adults)}
                />
                {room.capacity_children > 0 && (
                  <HighlightTile
                    icon={<Users size={24} aria-hidden />}
                    label="Children"
                    value={String(room.capacity_children)}
                  />
                )}
                {room.bed_type && (
                  <HighlightTile
                    icon={<BedDouble size={24} aria-hidden />}
                    label="Beds"
                    value={room.bed_type}
                  />
                )}
                {room.room_size_sqft != null && (
                  <HighlightTile
                    icon={<Maximize size={24} aria-hidden />}
                    label="Size"
                    value={`${room.room_size_sqft} sq ft`}
                  />
                )}
                <HighlightTile
                  icon={<Clock size={24} aria-hidden />}
                  label="Check-in"
                  value={formatTime(hotel.check_in_time)}
                />
              </div>

              {/* About */}
              <h2 className="mt-8 font-heading text-[16px] font-semibold text-deep">
                About this room
              </h2>
              <div className="mt-2">
                <ReadMore
                  text={aboutText}
                  className="text-[14px] leading-relaxed text-ink/70"
                />
              </div>

              {/* Other rooms at this hotel */}
              {otherRooms.length > 0 && (
                <>
                  <h2 className="mt-8 font-heading text-[16px] font-semibold text-deep">
                    Other rooms at {hotel.hotel_name}
                  </h2>
                  <div className="mt-3 space-y-3">
                    {otherRooms.map((other) => {
                      const thumb =
                        other.images.find((img) => img.is_primary) ??
                        other.images[0] ??
                        null;
                      return (
                        <Link
                          key={other.id}
                          href={`/hotels/${canonicalSlug}/rooms/${other.id}${stayQuery}`}
                          className="focus-ring flex items-center justify-between gap-4 rounded-2xl border border-deep/10 bg-white p-3.5 transition hover:border-deep/30 hover:shadow-sm active:scale-[0.99]"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-mist">
                              {thumb ? (
                                <Image
                                  src={thumb.publicUrl}
                                  alt={other.room_name}
                                  fill
                                  sizes="64px"
                                  className="object-cover"
                                />
                              ) : null}
                            </div>
                            <div className="min-w-0">
                              <p className="font-heading text-[14px] font-semibold text-deep">
                                {other.room_name}
                              </p>
                              <p className="mt-0.5 text-[12px] capitalize text-ink/55">
                                {other.room_type} · Sleeps {other.max_occupancy}
                                {other.bed_type ? ` · ${other.bed_type}` : ""}
                              </p>
                            </div>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="font-display text-lg text-orange">
                              ₹{formatPrice(other.price)}
                            </p>
                            <span className="mt-1 inline-block text-[12px] font-semibold text-deep/60">
                              View details →
                            </span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Desktop booking card (phones use the sticky bar below) */}
            <aside className="hidden h-fit rounded-2xl border border-deep/15 bg-white p-6 lg:sticky lg:top-24 lg:block">
              <p className="text-[11px] text-ink/45">Per night</p>
              <p className="mt-1 font-display text-2xl text-orange">
                ₹{formatPrice(room.price)}
              </p>
              <Link
                href={bookHref}
                className="focus-ring mt-5 block w-full rounded-xl bg-deep py-2.5 text-center font-heading text-[13px] font-semibold text-cream transition hover:bg-deep-2"
              >
                Book This Room
              </Link>
            </aside>
          </div>
        </div>
      </section>

      {/* Phones: sticky price + Call SafarBuddy support + Book, just above
          the bottom tab bar. Call goes to SafarBuddy support, never to the
          property owner. */}
      <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30 border-t border-deep/10 bg-white/95 px-4 pb-6 pt-3 backdrop-blur-md lg:hidden">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <div className="min-w-0 pr-1">
            <p className="text-[11px] text-ink/50">Per night</p>
            <p className="font-display text-xl leading-none text-orange">
              ₹{formatPrice(room.price)}
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
