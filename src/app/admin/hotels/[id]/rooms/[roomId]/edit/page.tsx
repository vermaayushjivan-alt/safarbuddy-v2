import Link from "next/link";
import { notFound } from "next/navigation";

import { getHotelByIdAdmin } from "@/app/actions/hotel.actions";
import { getRoomTypeByIdAdmin } from "@/app/actions/room-type.actions";
import { RoomTypeForm } from "@/components/admin/rooms/RoomTypeForm";
import { isValidUuid } from "@/lib/utils/uuid";

export default async function EditRoomTypePage({
  params,
}: {
  params: Promise<{ id: string; roomId: string }>;
}) {
  const { id: hotelId, roomId } = await params;

  if (!isValidUuid(hotelId) || !isValidUuid(roomId)) {
    notFound();
  }

  const hotel = await getHotelByIdAdmin(hotelId);

  if (!hotel) {
    notFound();
  }

  const roomType = await getRoomTypeByIdAdmin(roomId);

  // Prevent editing a room type through a different hotel's URL.
  if (!roomType || roomType.hotel_id !== hotel.id) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-8">
        <Link
          href={`/admin/hotels/${hotel.id}/rooms`}
          className="focus-ring inline-flex rounded-full border border-deep/15 px-4 py-2 text-[13px] font-semibold text-deep transition hover:bg-mist"
        >
          ← Back to Room Types
        </Link>
      </div>

      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-deep">
            Edit Room Type
          </h1>

          <p className="mt-2 text-[14px] text-ink/60">
            {hotel.hotel_name} — {roomType.room_name}
          </p>
        </div>

        <Link
          href={`/admin/hotels/${hotel.id}/rooms/${roomType.id}/images`}
          className="focus-ring inline-flex rounded-full border border-deep/15 px-4 py-2.5 font-heading text-[13px] font-semibold text-deep transition hover:bg-mist"
        >
          Manage Images
        </Link>

        <Link
          href={`/admin/hotels/${hotel.id}/rooms/${roomType.id}/pricing`}
          className="focus-ring inline-flex rounded-full border border-deep/15 px-4 py-2.5 font-heading text-[13px] font-semibold text-deep transition hover:bg-mist"
        >
          Pricing
        </Link>

        <Link
          href={`/admin/hotels/${hotel.id}/rooms/${roomType.id}/availability`}
          className="focus-ring inline-flex rounded-full border border-deep/15 px-4 py-2.5 font-heading text-[13px] font-semibold text-deep transition hover:bg-mist"
        >
          Availability
        </Link>
      </div>

      <RoomTypeForm
        mode="edit"
        hotelId={hotel.id}
        roomType={roomType}
      />
    </div>
  );
}
