import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus, Pencil } from "lucide-react";
import {
  getRoomTypesByHotelAdmin,
  deleteRoomTypeAdmin,
} from "@/app/actions/room-type.actions";
import { getHotelByIdAdmin } from "@/app/actions/hotel.actions";
import { isValidUuid } from "@/lib/utils/uuid";

export default async function AdminRoomTypesListPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { id: hotelId } = await params;

  if (!isValidUuid(hotelId)) {
    notFound();
  }

  const hotel = await getHotelByIdAdmin(hotelId);

  if (!hotel) {
    notFound();
  }

  const spParams = await searchParams;
  const page = Number(spParams.page ?? "1") || 1;

  const { data: roomTypes, total, totalPages, hasNext, hasPrev } =
    await getRoomTypesByHotelAdmin(hotelId, page, 20);

  async function handleDelete(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    const result = await deleteRoomTypeAdmin(id);
    if (!result.success) {
      // No client-side error UI in this fire-and-forget delete form;
      // log server-side so a failed delete is diagnosable.
      console.error("[deleteRoomTypeAdmin]", result.error);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link
            href={`/admin/hotels/${hotel.id}/edit`}
            className="mb-2 inline-block text-[13px] font-semibold text-deep/60 transition hover:text-deep"
          >
            ← Back to {hotel.hotel_name}
          </Link>
          <h1 className="font-display text-3xl text-deep">Room Types</h1>
          <p className="mt-2 text-[14px] text-ink/60">
            {total} room type{total === 1 ? "" : "s"} for {hotel.hotel_name}
          </p>
        </div>
        <Link
          href={`/admin/hotels/${hotel.id}/rooms/new`}
          className="focus-ring inline-flex items-center gap-1.5 rounded-full bg-deep px-4 py-2.5 font-heading text-[13px] font-semibold text-cream transition hover:bg-deep-2"
        >
          <Plus size={14} aria-hidden />
          Add Room Type
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-deep/15 bg-white">
        <table className="w-full text-left text-[13px]">
          <thead className="border-b border-deep/10 bg-mist text-[11px] uppercase tracking-wide text-ink/50">
            <tr>
              <th className="px-4 py-3 font-heading font-semibold">Name</th>
              <th className="px-4 py-3 font-heading font-semibold">
                Occupancy
              </th>
              <th className="px-4 py-3 font-heading font-semibold">
                Base Price
              </th>
              <th className="px-4 py-3 font-heading font-semibold">Status</th>
              <th className="px-4 py-3 font-heading font-semibold text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {roomTypes.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-ink/50">
                  No room types yet.
                </td>
              </tr>
            ) : (
              roomTypes.map((roomType) => (
                <tr
                  key={roomType.id}
                  className="border-b border-deep/10 last:border-0"
                >
                  <td className="px-4 py-3 font-medium text-deep">
                    {roomType.name}
                  </td>
                  <td className="px-4 py-3 text-ink/70">
                    {roomType.max_adults} adult
                    {roomType.max_adults === 1 ? "" : "s"}
                    {roomType.max_children > 0
                      ? `, ${roomType.max_children} child${
                          roomType.max_children === 1 ? "" : "ren"
                        }`
                      : ""}
                  </td>
                  <td className="px-4 py-3 text-ink/70">
                    ₹{roomType.base_price.toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full bg-mist px-2 py-0.5 text-[11px] font-semibold text-deep">
                      {roomType.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/hotels/${hotel.id}/rooms/${roomType.id}/edit`}
                        className="focus-ring inline-flex items-center gap-1 rounded-lg border border-deep/15 px-2.5 py-1.5 text-[12px] font-semibold text-deep transition hover:bg-mist"
                      >
                        <Pencil size={12} aria-hidden />
                        Edit
                      </Link>
                      <form action={handleDelete}>
                        <input type="hidden" name="id" value={roomType.id} />
                        <button
                          type="submit"
                          className="focus-ring rounded-lg border border-red-200 px-2.5 py-1.5 text-[12px] font-semibold text-red-600 transition hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link
            href={`/admin/hotels/${hotel.id}/rooms?page=${page - 1}`}
            aria-disabled={!hasPrev}
            className={`focus-ring rounded-full border border-deep/15 px-4 py-2 text-[13px] font-semibold text-deep ${
              hasPrev ? "hover:bg-mist" : "pointer-events-none opacity-40"
            }`}
          >
            Previous
          </Link>
          <span className="text-[13px] text-ink/60">
            Page {page} of {totalPages}
          </span>
          <Link
            href={`/admin/hotels/${hotel.id}/rooms?page=${page + 1}`}
            aria-disabled={!hasNext}
            className={`focus-ring rounded-full border border-deep/15 px-4 py-2 text-[13px] font-semibold text-deep ${
              hasNext ? "hover:bg-mist" : "pointer-events-none opacity-40"
            }`}
          >
            Next
          </Link>
        </div>
      )}
    </div>
  );
}
