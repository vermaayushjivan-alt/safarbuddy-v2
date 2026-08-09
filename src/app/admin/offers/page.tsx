import Link from "next/link";
import { Plus, Pencil } from "lucide-react";
import { getAllOffersAdmin, deleteOfferAdmin } from "@/app/actions/offer.actions";

export default async function AdminOffersListPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Number(params.page ?? "1") || 1;

  const { data: offers, total, totalPages, hasNext, hasPrev } =
    await getAllOffersAdmin(page, 20);

  async function handleDelete(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    const result = await deleteOfferAdmin(id);
    if (!result.success) {
      // No client-side error UI in this fire-and-forget delete form;
      // log server-side so a failed delete is diagnosable.
      console.error("[deleteOfferAdmin]", result.error);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-deep">Offers</h1>
          <p className="mt-2 text-[14px] text-ink/60">
            {total} offer{total === 1 ? "" : "s"} total
          </p>
        </div>
        <Link
          href="/admin/offers/new"
          className="focus-ring inline-flex items-center gap-1.5 rounded-full bg-deep px-4 py-2.5 font-heading text-[13px] font-semibold text-cream transition hover:bg-deep-2"
        >
          <Plus size={14} aria-hidden />
          Add Offer
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-deep/15 bg-white">
        <table className="w-full text-left text-[13px]">
          <thead className="border-b border-deep/10 bg-mist text-[11px] uppercase tracking-wide text-ink/50">
            <tr>
              <th className="px-4 py-3 font-heading font-semibold">Title</th>
              <th className="px-4 py-3 font-heading font-semibold">Discount</th>
              <th className="px-4 py-3 font-heading font-semibold">Status</th>
              <th className="px-4 py-3 font-heading font-semibold">End Date</th>
              <th className="px-4 py-3 font-heading font-semibold text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {offers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-ink/50">
                  No offers yet.
                </td>
              </tr>
            ) : (
              offers.map((offer) => (
                <tr key={offer.id} className="border-b border-deep/10 last:border-0">
                  <td className="px-4 py-3 font-medium text-deep">
                    {offer.title}
                  </td>
                  <td className="px-4 py-3 text-ink/70">{offer.discount ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full bg-mist px-2 py-0.5 text-[11px] font-semibold text-deep">
                      {offer.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink/70">{offer.end_date ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/offers/${offer.id}/edit`}
                        className="focus-ring inline-flex items-center gap-1 rounded-lg border border-deep/15 px-2.5 py-1.5 text-[12px] font-semibold text-deep transition hover:bg-mist"
                      >
                        <Pencil size={12} aria-hidden />
                        Edit
                      </Link>
                      <form action={handleDelete}>
                        <input type="hidden" name="id" value={offer.id} />
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
            href={`/admin/offers?page=${page - 1}`}
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
            href={`/admin/offers?page=${page + 1}`}
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
