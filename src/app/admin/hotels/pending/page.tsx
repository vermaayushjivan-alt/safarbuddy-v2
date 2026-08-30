import Link from "next/link";
import { CheckCircle2, XCircle, Eye } from "lucide-react";
import {
  getPendingHotelsAdmin,
  approveHotelAdmin,
  rejectHotelAdmin,
} from "@/app/actions/hotel.actions";

// VENDOR-03 M4 -- Admin approval queue for hotels submitted via the
// public self-service "List Your Property" flow (M2). Mirrors the
// existing /admin/hotels list page's structure/styling (RULE 9), but
// scoped to status='pending' only, with Approve/Reject in place of
// Edit/Delete. See hotel.actions.ts for the RULE 15 audit note on why
// this page exists and why Reject sets 'suspended' rather than an
// invented 'rejected' status.

export default async function AdminPendingHotelsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Number(params.page ?? "1") || 1;

  const { data: hotels, total, totalPages, hasNext, hasPrev } =
    await getPendingHotelsAdmin(page, 20);

  async function handleApprove(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    const result = await approveHotelAdmin(id);
    if (!result.success) {
      console.error("[approveHotelAdmin]", result.error);
    }
  }

  async function handleReject(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    const result = await rejectHotelAdmin(id);
    if (!result.success) {
      console.error("[rejectHotelAdmin]", result.error);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-deep">
            Pending Listings
          </h1>
          <p className="mt-2 text-[14px] text-ink/60">
            {total} propert{total === 1 ? "y" : "ies"} awaiting review
            &mdash; submitted via &ldquo;List Your Property&rdquo;
          </p>
        </div>
        <Link
          href="/admin/hotels"
          className="focus-ring inline-flex items-center gap-1.5 rounded-full border border-deep/15 px-4 py-2.5 font-heading text-[13px] font-semibold text-deep transition hover:bg-mist"
        >
          All Hotels
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-deep/15 bg-white">
        <table className="w-full text-left text-[13px]">
          <thead className="border-b border-deep/10 bg-mist text-[11px] uppercase tracking-wide text-ink/50">
            <tr>
              <th className="px-4 py-3 font-heading font-semibold">Property</th>
              <th className="px-4 py-3 font-heading font-semibold">City</th>
              <th className="px-4 py-3 font-heading font-semibold">Contact</th>
              <th className="px-4 py-3 font-heading font-semibold">Submitted</th>
              <th className="px-4 py-3 font-heading font-semibold text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {hotels.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-ink/50">
                  No pending listings right now.
                </td>
              </tr>
            ) : (
              hotels.map((hotel) => (
                <tr key={hotel.id} className="border-b border-deep/10 last:border-0">
                  <td className="px-4 py-3 font-medium text-deep">
                    {hotel.hotel_name}
                  </td>
                  <td className="px-4 py-3 text-ink/70">{hotel.city ?? "—"}</td>
                  <td className="px-4 py-3 text-ink/70">
                    {hotel.phone ?? hotel.email ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-ink/70">
                    {hotel.created_at
                      ? new Date(hotel.created_at).toLocaleDateString("en-IN")
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/hotels/${hotel.id}/edit`}
                        className="focus-ring inline-flex items-center gap-1 rounded-lg border border-deep/15 px-2.5 py-1.5 text-[12px] font-semibold text-deep transition hover:bg-mist"
                      >
                        <Eye size={12} aria-hidden />
                        View
                      </Link>
                      <form action={handleApprove}>
                        <input type="hidden" name="id" value={hotel.id} />
                        <button
                          type="submit"
                          className="focus-ring inline-flex items-center gap-1 rounded-lg border border-green-200 px-2.5 py-1.5 text-[12px] font-semibold text-green-700 transition hover:bg-green-50"
                        >
                          <CheckCircle2 size={12} aria-hidden />
                          Approve
                        </button>
                      </form>
                      <form action={handleReject}>
                        <input type="hidden" name="id" value={hotel.id} />
                        <button
                          type="submit"
                          className="focus-ring inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-[12px] font-semibold text-red-600 transition hover:bg-red-50"
                        >
                          <XCircle size={12} aria-hidden />
                          Reject
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
            href={`/admin/hotels/pending?page=${page - 1}`}
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
            href={`/admin/hotels/pending?page=${page + 1}`}
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

