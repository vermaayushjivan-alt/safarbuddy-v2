import Link from "next/link";
import { notFound } from "next/navigation";
import { getHotelByIdAdmin } from "@/app/actions/hotel.actions";
import { getRoomTypeByIdAdmin } from "@/app/actions/room-type.actions";
import { RoomInventoryManager } from "@/components/admin/rooms/RoomInventoryManager";
import { isValidUuid } from "@/lib/utils/uuid";

export default async function RoomTypeAvailabilityPage({
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
            href={`/admin/hotels/${hotel.id}/rooms/${roomType.id}/pricing`}
            className="focus-ring inline-flex rounded-full border border-deep/15 px-4 py-2 text-[13px] font-semibold text-deep transition hover:bg-mist"
          >
            Pricing
          </Link>
        </div>
      </div>

      <h1 className="mb-2 font-display text-3xl text-deep">
        {hotel.hotel_name} — {roomType.room_name} — Availability
      </h1>

      <p className="mb-8 text-[14px] text-ink/60">
        Set how many rooms of this type are available per day, one date at a time or across a date range.
      </p>

      <RoomInventoryManager
        hotelId={hotel.id}
        roomId={roomType.id}
        roomName={roomType.room_name}
      />
    </div>
  );
}
