import Link from "next/link";
import { notFound } from "next/navigation";
import { getHotelByIdAdmin } from "@/app/actions/hotel.actions";
import { getRoomTypeByIdAdmin } from "@/app/actions/room-type.actions";
import { RoomPriceManager } from "@/components/admin/rooms/RoomPriceManager";
import { isValidUuid } from "@/lib/utils/uuid";

export default async function RoomTypePricingPage({
  params,
}: {
  params: Promise<{ id: string; roomId: string }>;
}) {
  const { id, roomId } = await params;

  if (!isValidUuid(id) || !isValidUuid(roomId)) {
    notFound();
  }

  const hotel = await getHotelByIdAdmin(id);

  if (!hotel) {
    notFound();
  }

  const roomType = await getRoomTypeByIdAdmin(roomId);

  if (!roomType || roomType.hotel_id !== hotel.id) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/admin/hotels/${hotel.id}/rooms/${roomType.id}/edit`}
          className="focus-ring inline-flex rounded-full border border-deep/15 px-4 py-2 text-[13px] font-semibold text-deep transition hover:bg-mist"
        >
          ← Back to Edit Room Type
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href={`/admin/hotels/${hotel.id}/rooms/${roomType.id}/images`}
            className="focus-ring inline-flex rounded-full border border-deep/15 px-4 py-2 text-[13px] font-semibold text-deep transition hover:bg-mist"
          >
            Images
          </Link>
          <Link
            href={`/admin/hotels/${hotel.id}/rooms/${roomType.id}/availability`}
            className="focus-ring inline-flex rounded-full border border-deep/15 px-4 py-2 text-[13px] font-semibold text-deep transition hover:bg-mist"
          >
            Availability
          </Link>
        </div>
      </div>

      <h1 className="mb-2 font-display text-3xl text-deep">
        {hotel.hotel_name} — {roomType.room_name} — Pricing
      </h1>

      <p className="mb-8 text-[14px] text-ink/60">
        Set per-day rates for this room type, one date at a time or across a date range.
      </p>

      <RoomPriceManager
        hotelId={hotel.id}
        roomId={roomType.id}
        roomName={roomType.room_name}
      />
    </div>
  );
}
