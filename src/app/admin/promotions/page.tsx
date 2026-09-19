import Link from "next/link";
import { Plus, Pencil } from "lucide-react";
import {
  getAllPromotionsAdmin,
  deletePromotionAdmin,
} from "@/app/actions/promotion.actions";

const SLOT_LABELS: Record<string, string> = {
  after_hero: "After Hero",
  between_destinations_trending: "Destinations → Trending",
  between_packages_testimonials: "Packages → Testimonials",
};

export default async function AdminPromotionsListPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Number(params.page ?? "1") || 1;

  const {
    data: promotions,
    total,
    totalPages,
    hasNext,
    hasPrev,
  } = await getAllPromotionsAdmin(page, 20);

  async function handleDelete(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    const result = await deletePromotionAdmin(id);
    if (!result.success) {
      console.error("[deletePromotionAdmin]", result.error);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-deep">
            Homepage Promotions
          </h1>
          <p className="mt-2 text-[14px] text-ink/60">
            {total} promotion{total === 1 ? "" : "s"} total
          </p>
        </div>
        <Link
          href="/admin/promotions/new"
          className="focus-ring inline-flex items-center gap-1.5 rounded-full bg-deep px-4 py-2.5 font-heading text-[13px] font-semibold text-cream transition hover:bg-deep-2"
        >
          <Plus size={14} aria-hidden />
          Add Promotion
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-deep/15 bg-white">
        <table className="w-full text-left text-[13px]">
          <thead className="border-b border-deep/10 bg-mist text-[11px] uppercase tracking-wide text-ink/50">
            <tr>
              <th className="px-4 py-3 font-heading font-semibold">
                Company
              </th>
              <th className="px-4 py-3 font-heading font-semibold">Slot</th>
              <th className="px-4 py-3 font-heading font-semibold">
                Impressions
              </th>
              <th className="px-4 py-3 font-heading font-semibold">Clicks</th>
              <th className="px-4 py-3 font-heading font-semibold">
                Active
              </th>
              <th className="px-4 py-3 text-right font-heading font-semibold">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {promotions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-ink/50">
                  No promotions yet.
                </td>
              </tr>
            ) : (
              promotions.map((promo) => (
                <tr
                  key={promo.id}
                  className="border-b border-deep/10 last:border-0"
                >
                  <td className="px-4 py-3 font-medium text-deep">
                    {promo.company_name}
                  </td>
                  <td className="px-4 py-3 text-ink/70">
                    {SLOT_LABELS[promo.slot_position] ?? promo.slot_position}
                  </td>
                  <td className="px-4 py-3 text-ink/70">
                    {promo.impression_count}
                  </td>
                  <td className="px-4 py-3 text-ink/70">
                    {promo.click_count}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        promo.is_active
                          ? "bg-mist text-deep"
                          : "bg-red-50 text-red-600"
                      }`}
                    >
                      {promo.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/promotions/${promo.id}/edit`}
                        className="focus-ring inline-flex items-center gap-1 rounded-lg border border-deep/15 px-2.5 py-1.5 text-[12px] font-semibold text-deep transition hover:bg-mist"
                      >
                        <Pencil size={12} aria-hidden />
                        Edit
                      </Link>
                      <form action={handleDelete}>
                        <input type="hidden" name="id" value={promo.id} />
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
            href={`/admin/promotions?page=${page - 1}`}
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
            href={`/admin/promotions?page=${page + 1}`}
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

