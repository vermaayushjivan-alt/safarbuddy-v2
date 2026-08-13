import Link from "next/link";
import { notFound } from "next/navigation";
import { getHotelByIdAdmin } from "@/app/actions/hotel.actions";
import { getRoomTypeByIdAdmin } from "@/app/actions/room-type.actions";
import { RoomImageManager } from "@/components/admin/rooms/RoomImageManager";
import { isValidUuid } from "@/lib/utils/uuid";

export default async function RoomTypeImagesPage({
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
      <div className="mb-8">
        <Link
          href={`/admin/hotels/${hotel.id}/rooms/${roomType.id}/edit`}
          className="focus-ring inline-flex rounded-full border border-deep/15 px-4 py-2 text-[13px] font-semibold text-deep transition hover:bg-mist"
        >
          ← Back to Edit Room Type
        </Link>
      </div>

      <h1 className="mb-2 font-display text-3xl text-deep">
        {hotel.hotel_name} — {roomType.room_name} — Images
      </h1>

      <p className="mb-8 text-[14px] text-ink/60">
        Manage photos for this room type.
      </p>

      <RoomImageManager roomTypeId={roomType.id} />
    </div>
  );
}
