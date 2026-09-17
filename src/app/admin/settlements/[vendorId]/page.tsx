import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  getVendorDueSummaryAdmin,
  getSettlementsByVendorAdmin,
  markSettlementPaidAdmin,
} from '@/app/actions/vendor-settlement.actions';

function formatMoney(value: number): string {
  return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDateTime(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default async function AdminVendorSettlementPage({
  params,
}: {
  params: Promise<{ vendorId: string }>;
}) {
  const { vendorId } = await params;

  let summary;
  try {
    summary = await getVendorDueSummaryAdmin(vendorId);
  } catch {
    notFound();
  }

  const { data: settlements, total } = await getSettlementsByVendorAdmin(vendorId, 1, 50);

  async function handleMarkPaid(formData: FormData) {
    'use server';

    const amount = formData.get('amount') as string;
    const reference_note = (formData.get('reference_note') as string) || '';

    const result = await markSettlementPaidAdmin({
      vendor_id: vendorId,
      amount: Number(amount),
      reference_note,
      paid_at: null,
    });

    if (!result.success) {
      // Server Actions inline in a page can't easily surface a toast
      // here without a client component — matches this repo's existing
      // pattern of admin action forms (see booking.actions.ts's
      // handleConfirm/handleCancel, which also swallow the ActionResult
      // shape rather than adding client-side state for a first pass).
      console.error('[markSettlementPaidAdmin] failed:', result.error);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <Link
        href="/admin/settlements"
        className="focus-ring mb-6 inline-block text-[13px] font-semibold text-deep hover:underline"
      >
        ← All vendors
      </Link>

      <h1 className="font-display text-3xl text-deep">{summary.vendor.vendor_name}</h1>

      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="rounded-2xl border border-deep/15 bg-white p-4">
          <p className="text-[11px] uppercase tracking-wide text-ink/50">Total Earned</p>
          <p className="mt-1 font-display text-xl text-deep">{formatMoney(summary.totalEarned)}</p>
        </div>
        <div className="rounded-2xl border border-deep/15 bg-white p-4">
          <p className="text-[11px] uppercase tracking-wide text-ink/50">Already Paid</p>
          <p className="mt-1 font-display text-xl text-deep">{formatMoney(summary.totalSettled)}</p>
        </div>
        <div className="rounded-2xl border border-orange/30 bg-orange/5 p-4">
          <p className="text-[11px] uppercase tracking-wide text-ink/50">Due Now</p>
          <p className="mt-1 font-display text-xl text-orange">{formatMoney(summary.due)}</p>
        </div>
      </div>

      {summary.due > 0 && (
        <form
          action={handleMarkPaid}
          className="mt-8 rounded-2xl border border-deep/15 bg-white p-5"
        >
          <h2 className="font-heading text-[15px] font-semibold text-deep">
            Mark a payment as sent
          </h2>
          <p className="mt-1 text-[13px] text-ink/60">
            After you&apos;ve actually transferred the money to this owner (bank/UPI), log it here to
            generate their receipt.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <label className="block">
              <span className="text-[12px] font-semibold text-deep">Amount paid (₹)</span>
              <input
                type="number"
                name="amount"
                step="0.01"
                min="0.01"
                max={summary.due}
                defaultValue={summary.due.toFixed(2)}
                required
                className="focus-ring mt-1 w-full rounded-lg border border-deep/15 px-3 py-2 text-[13px] text-deep outline-none"
              />
            </label>
            <label className="block">
              <span className="text-[12px] font-semibold text-deep">
                Reference (UPI/bank txn ID — optional)
              </span>
              <input
                type="text"
                name="reference_note"
                placeholder="e.g. UPI Ref 123456789"
                className="focus-ring mt-1 w-full rounded-lg border border-deep/15 px-3 py-2 text-[13px] text-deep outline-none"
              />
            </label>
          </div>

          <button
            type="submit"
            className="focus-ring mt-4 rounded-lg bg-deep px-4 py-2 text-[13px] font-semibold text-cream transition hover:opacity-90"
          >
            Mark as Paid
          </button>
        </form>
      )}

      <div className="mt-8">
        <h2 className="font-heading text-[15px] font-semibold text-deep">
          Receipt history ({total})
        </h2>

        <div className="mt-3 overflow-hidden rounded-2xl border border-deep/15 bg-white">
          <table className="w-full text-left text-[13px]">
            <thead className="border-b border-deep/10 bg-mist text-[11px] uppercase tracking-wide text-ink/50">
              <tr>
                <th className="px-4 py-3 font-heading font-semibold">Receipt No.</th>
                <th className="px-4 py-3 font-heading font-semibold">Amount</th>
                <th className="px-4 py-3 font-heading font-semibold">Reference</th>
                <th className="px-4 py-3 font-heading font-semibold">Paid On</th>
              </tr>
            </thead>
            <tbody>
              {settlements.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-ink/50">
                    No settlements logged yet.
                  </td>
                </tr>
              ) : (
                settlements.map((s) => (
                  <tr key={s.id} className="border-b border-deep/10 last:border-0">
                    <td className="px-4 py-3 font-medium text-deep">{s.receipt_number}</td>
                    <td className="px-4 py-3 text-ink/70">{formatMoney(Number(s.amount))}</td>
                    <td className="px-4 py-3 text-ink/70">{s.reference_note ?? '—'}</td>
                    <td className="px-4 py-3 text-ink/70">{formatDateTime(s.paid_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
