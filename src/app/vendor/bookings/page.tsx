import Link from "next/link";
import { getMyVendorBookings } from "@/app/actions/vendor-booking.actions";
import type {
  BookingRecord,
  BookingStatus,
} from "@/lib/repositories/booking.repository";

const STATUS_FILTERS: Array<BookingStatus | "all"> = [
  "all",
  "pending",
  "confirmed",
  "cancelled",
  "completed",
];

function formatDate(value: string | null): string {
  return value ?? "—";
}

function bookingDates(booking: BookingRecord): string {
  if (booking.booking_type === "hotel") {
    return `${formatDate(booking.check_in_date)} → ${formatDate(
      booking.check_out_date
    )}`;
  }
  return formatDate(booking.travel_date);
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case "confirmed":
      return "bg-mist text-deep";
    case "cancelled":
      return "bg-red-50 text-red-600";
    case "completed":
      return "bg-mist text-ink/60";
    default:
      return "bg-orange/10 text-orange";
  }
}

export default async function VendorBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const params = await searchParams;
  const page = Number(params.page ?? "1") || 1;
  const statusParam = (params.status ?? "all") as BookingStatus | "all";
  const status = statusParam === "all" ? undefined : statusParam;

  let bookings: BookingRecord[] = [];
  let total = 0;
  let totalPages = 0;
  let hasNext = false;
  let hasPrev = false;
  let noVendor = false;

  try {
    const result = await getMyVendorBookings(page, 20, status);
    bookings = result.data;
    total = result.total;
    totalPages = result.totalPages;
    hasNext = result.hasNext;
    hasPrev = result.hasPrev;
  } catch (error) {
    if (error instanceof Error && error.message === "NO_VENDOR_FOR_OWNER") {
      noVendor = true;
    } else {
      throw error;
    }
  }

  if (noVendor) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="font-display text-3xl text-deep">Bookings</h1>
        <p className="mt-4 text-[14px] text-ink/60">
          No vendor account is linked to this login yet, so there are no
          bookings to show here.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-deep">Bookings</h1>
          <p className="mt-2 text-[14px] text-ink/60">
            {total} booking{total === 1 ? "" : "s"} across your properties
          </p>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((filter) => (
          <Link
            key={filter}
            href={`/vendor/bookings?status=${filter}`}
            className={`focus-ring rounded-full border px-3.5 py-1.5 text-[12px] font-semibold capitalize transition ${
              statusParam === filter
                ? "border-deep bg-deep text-cream"
                : "border-deep/15 text-deep hover:bg-mist"
            }`}
          >
            {filter}
          </Link>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-deep/15 bg-white">
        <table className="w-full text-left text-[13px]">
          <thead className="border-b border-deep/10 bg-mist text-[11px] uppercase tracking-wide text-ink/50">
            <tr>
              <th className="px-4 py-3 font-heading font-semibold">Type</th>
              <th className="px-4 py-3 font-heading font-semibold">Dates</th>
              <th className="px-4 py-3 font-heading font-semibold">Guests</th>
              <th className="px-4 py-3 font-heading font-semibold">Price</th>
              <th className="px-4 py-3 font-heading font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {bookings.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-ink/50">
                  No bookings found.
                </td>
              </tr>
            ) : (
              bookings.map((booking) => (
                <tr
                  key={booking.id}
                  className="border-b border-deep/10 last:border-0 align-top"
                >
                  <td className="px-4 py-3 font-medium text-deep capitalize">
                    {booking.booking_type}
                  </td>
                  <td className="px-4 py-3 text-ink/70">
                    {bookingDates(booking)}
                  </td>
                  <td className="px-4 py-3 text-ink/70">
                    {booking.num_guests}
                  </td>
                  <td className="px-4 py-3 text-ink/70">
                    {booking.currency}{" "}
                    {Number(booking.price_snapshot).toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${statusBadgeClass(
                        booking.status
                      )}`}
                    >
                      {booking.status}
                    </span>
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
            href={`/vendor/bookings?page=${page - 1}&status=${statusParam}`}
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
            href={`/vendor/bookings?page=${page + 1}&status=${statusParam}`}
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

