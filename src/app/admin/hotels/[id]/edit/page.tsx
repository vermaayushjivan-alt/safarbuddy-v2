import Link from "next/link";
import { notFound } from "next/navigation";
import { getHotelByIdAdmin } from "@/app/actions/hotel.actions";
import { HotelForm } from "@/components/admin/hotels/HotelForm";

export default async function EditHotelPage({
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
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/hotels"
            className="focus-ring rounded-full border border-deep/15 px-4 py-2 text-[13px] font-semibold text-deep transition hover:bg-mist"
          >
            ← Back to Hotels
          </Link>

          <h1 className="font-display text-3xl text-deep">
            Edit Hotel
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/admin/hotels/${hotel.id}/images`}
            className="focus-ring rounded-full border border-deep/15 px-4 py-2 text-[13px] font-semibold text-deep transition hover:bg-mist"
          >
            Manage Images
          </Link>

          {hotel.status === "ACTIVE" && (
            <Link
              href={`/hotels/${hotel.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="focus-ring rounded-full bg-deep px-4 py-2 text-[13px] font-semibold text-cream transition hover:bg-deep-2"
            >
              View Hotel
            </Link>
          )}
        </div>
      </div>

      <HotelForm mode="edit" hotel={hotel} />
    </div>
  );
}
