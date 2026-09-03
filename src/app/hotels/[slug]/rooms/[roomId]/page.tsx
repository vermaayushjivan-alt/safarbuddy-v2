// ROOT PATH: src/app/hotels/[slug]/rooms/[roomId]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Users, BedDouble, Maximize } from "lucide-react";
import Navbar from "@/components/home/Navbar";
import Footer from "@/components/home/Footer";
import { getHotelBySlug } from "@/app/actions/hotel.actions";
import { getBookableRoomById } from "@/app/actions/room-type.actions";
import { slugify } from "@/lib/utils/format";
import ImageCarousel from "@/components/public/ImageCarousel";

// ROOM-06 — public room detail page. Server component, no auth
// required (mirrors the hotel detail page's public pattern). Renders
// only fields that come back from getBookableRoomById — no amenities
// section here: hotel_rooms has no amenities column/table in the live
// schema (see RoomTypeForm.tsx / DATABASE_BIBLE.md "never invent
// columns"), so there is nothing real to group or display yet.
export const dynamic = "force-dynamic";

function formatPrice(price: number | null): string {
  if (price == null) return "—";
  return price.toLocaleString("en-IN");
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

  // HOME-HOTEL-SEARCH-01: carry dates/guests through to the booking form.
  const stayParams = new URLSearchParams();
  if (checkin) stayParams.set("checkin", checkin);
  if (checkout) stayParams.set("checkout", checkout);
  if (guests) stayParams.set("guests", guests);
  const stayQuerySuffix = stayParams.toString()
    ? `&${stayParams.toString()}`
    : "";

  const hotel = await getHotelBySlug(slug);
  if (!hotel) {
    notFound();
  }

  const canonicalSlug = slugify(hotel.slug) || slug;

  const room = await getBookableRoomById(hotel.id, roomId);
  if (!room) {
    notFound();
  }

  return (
    <main className="bg-cream">
      <Navbar />

      <section className="mx-auto max-w-5xl px-6 py-12">
        <Link
          href={`/hotels/${canonicalSlug}`}
          className="focus-ring inline-flex items-center gap-1 text-[13px] font-semibold text-ink/60 transition hover:text-deep"
        >
          <ChevronLeft size={16} aria-hidden />
          Back to {hotel.hotel_name}
        </Link>

        <div className="mt-4">
          <ImageCarousel images={room.images} alt={room.room_name} />
        </div>

        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <h1 className="font-display text-3xl text-deep sm:text-4xl">
              {room.room_name}
            </h1>
            <p className="mt-1 text-[14px] capitalize text-ink/60">
              {room.room_type} room at {hotel.hotel_name}
            </p>

            <div className="mt-6 flex flex-wrap gap-4">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-mist px-3 py-1.5 text-[13px] font-semibold text-deep">
                <Users size={14} aria-hidden />
                Sleeps {room.max_occupancy}
                {room.capacity_children > 0
                  ? ` (${room.capacity_adults} adults, ${room.capacity_children} children)`
                  : ` (${room.capacity_adults} adults)`}
              </span>
              {room.bed_type && (
                <span className="inline-flex items-center gap-1.5 rounded-md bg-mist px-3 py-1.5 text-[13px] font-semibold text-deep">
                  <BedDouble size={14} aria-hidden />
                  {room.bed_type}
                </span>
              )}
              {room.room_size_sqft != null && (
                <span className="inline-flex items-center gap-1.5 rounded-md bg-mist px-3 py-1.5 text-[13px] font-semibold text-deep">
                  <Maximize size={14} aria-hidden />
                  {room.room_size_sqft} sq ft
                </span>
              )}
            </div>

            <h2 className="mt-8 font-heading text-[16px] font-semibold text-deep">
              About this room
            </h2>
            <p className="mt-2 text-[14px] leading-relaxed text-ink/70">
              A {room.room_type} room at {hotel.hotel_name}, accommodating up
              to {room.max_occupancy} guest{room.max_occupancy === 1 ? "" : "s"}
              {room.bed_type ? ` with ${room.bed_type.toLowerCase()} bedding` : ""}
              {room.room_size_sqft != null ? ` across ${room.room_size_sqft} sq ft` : ""}.
            </p>
          </div>

          <aside className="h-fit rounded-2xl border border-deep/15 bg-white p-6">
            <p className="text-[11px] text-ink/45">Per night</p>
            <p className="mt-1 font-display text-2xl text-orange">
              ₹{formatPrice(room.price)}
            </p>
            <Link
              href={`/hotels/${canonicalSlug}/book?room=${room.id}${stayQuerySuffix}`}
              className="focus-ring mt-5 block w-full rounded-xl bg-deep py-2.5 text-center font-heading text-[13px] font-semibold text-cream transition hover:bg-deep-2"
            >
              Book This Room
            </Link>
          </aside>
        </div>
      </section>

      <Footer />
    </main>
  );
}
