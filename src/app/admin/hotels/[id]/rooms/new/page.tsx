import Link from "next/link";
import { notFound } from "next/navigation";

import { getHotelByIdAdmin } from "@/app/actions/hotel.actions";
import { RoomTypeForm } from "@/components/admin/rooms/RoomTypeForm";
import { isValidUuid } from "@/lib/utils/uuid";

export default async function NewRoomTypePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: hotelId } = await params;

  if (!isValidUuid(hotelId)) {
    notFound();
  }

  const hotel = await getHotelByIdAdmin(hotelId);

  if (!hotel) {
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

      <div className="mb-8">
        <h1 className="font-display text-3xl text-deep">
          Add Room Type
        </h1>

        <p className="mt-2 text-[14px] text-ink/60">
          {hotel.hotel_name}
        </p>
      </div>

      <RoomTypeForm mode="create" hotelId={hotel.id} />
    </div>
  );
}
