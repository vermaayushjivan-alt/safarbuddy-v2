import Link from 'next/link';
import { getAllVendorDueSummariesAdmin } from '@/app/actions/vendor-settlement.actions';

function formatMoney(value: number): string {
  return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function AdminSettlementsListPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Number(params.page ?? '1') || 1;

  const { data: summaries, total, totalPages, hasNext, hasPrev } =
    await getAllVendorDueSummariesAdmin(page, 20);

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-deep">Settlements</h1>
          <p className="mt-2 text-[14px] text-ink/60">
            {total} vendor{total === 1 ? '' : 's'} — manual payouts, until Cashfree Payouts is wired up
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-deep/15 bg-white">
        <table className="w-full text-left text-[13px]">
          <thead className="border-b border-deep/10 bg-mist text-[11px] uppercase tracking-wide text-ink/50">
            <tr>
              <th className="px-4 py-3 font-heading font-semibold">Vendor</th>
              <th className="px-4 py-3 font-heading font-semibold">Total Earned</th>
              <th className="px-4 py-3 font-heading font-semibold">Already Paid</th>
              <th className="px-4 py-3 font-heading font-semibold">Due</th>
              <th className="px-4 py-3 font-heading font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {summaries.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-ink/50">
                  No vendors found.
                </td>
              </tr>
            ) : (
              summaries.map(({ vendor, totalEarned, totalSettled, due }) => (
                <tr key={vendor.id} className="border-b border-deep/10 last:border-0 align-top">
                  <td className="px-4 py-3 font-medium text-deep">{vendor.vendor_name}</td>
                  <td className="px-4 py-3 text-ink/70">{formatMoney(totalEarned)}</td>
                  <td className="px-4 py-3 text-ink/70">{formatMoney(totalSettled)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`font-semibold ${due > 0 ? 'text-orange' : 'text-ink/50'}`}
                    >
                      {formatMoney(due)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/settlements/${vendor.id}`}
                      className="focus-ring rounded-lg border border-deep/15 px-2.5 py-1.5 text-[12px] font-semibold text-deep transition hover:bg-mist"
                    >
                      {due > 0 ? 'Mark as Paid' : 'View'}
                    </Link>
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
            href={`/admin/settlements?page=${page - 1}`}
            aria-disabled={!hasPrev}
            className={`focus-ring rounded-full border border-deep/15 px-4 py-2 text-[13px] font-semibold text-deep ${
              hasPrev ? 'hover:bg-mist' : 'pointer-events-none opacity-40'
            }`}
          >
            Previous
          </Link>
          <span className="text-[13px] text-ink/60">
            Page {page} of {totalPages}
          </span>
          <Link
            href={`/admin/settlements?page=${page + 1}`}
            aria-disabled={!hasNext}
            className={`focus-ring rounded-full border border-deep/15 px-4 py-2 text-[13px] font-semibold text-deep ${
              hasNext ? 'hover:bg-mist' : 'pointer-events-none opacity-40'
            }`}
          >
            Next
          </Link>
        </div>
      )}
    </div>
  );
}

