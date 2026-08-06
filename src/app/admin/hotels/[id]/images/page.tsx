import { notFound } from "next/navigation";
import { getHotelByIdAdmin } from "@/app/actions/hotel.actions";
import { HotelImageManager } from "@/components/admin/hotels/HotelImageManager";

export default async function HotelImagesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const hotel = await getHotelByIdAdmin(id);

  if (!hotel) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="mb-2 font-display text-3xl text-deep">
        {hotel.hotel_name} — Images
      </h1>
      <p className="mb-8 text-[14px] text-ink/60">
        Manage photos for this hotel.
      </p>
      <HotelImageManager hotelId={hotel.id} />
    </div>
  );
}
