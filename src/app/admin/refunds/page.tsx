// ROOT PATH: src/app/admin/refunds/page.tsx
// GOLIVE-07b — "Refunds Due": cancelled bookings that were paid. The admin
// opens the payment and decides the amount (policy suggestion is shown there).
// Nothing is refunded from this page (owner decision D4).

import Link from 'next/link';
import { getRefundDueBookingsAdmin } from '@/app/actions/refund-due.actions';

function formatDateTime(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function money(code: string, value: number): string {
  return `${code} ${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

export default async function AdminRefundsDuePage() {
  const rows = await getRefundDueBookingsAdmin();

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-deep">Refunds Due</h1>
          <p className="mt-2 text-[14px] text-ink/60">
            {rows.length} cancelled booking{rows.length === 1 ? '' : 's'} waiting for a refund
            decision. Oldest first.
          </p>
        </div>
        <Link
          href="/admin"
          className="focus-ring rounded-full border border-deep/15 px-4 py-2 text-[13px] font-semibold text-deep transition hover:bg-mist"
        >
          Back to Dashboard
        </Link>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-deep/15 bg-white">
        <table className="w-full text-left text-[13px]">
          <thead className="border-b border-deep/10 bg-mist text-[11px] uppercase tracking-wide text-ink/50">
            <tr>
              <th className="px-4 py-3 font-heading font-semibold">Booking</th>
              <th className="px-4 py-3 font-heading font-semibold">Cancelled</th>
              <th className="px-4 py-3 font-heading font-semibold">Paid</th>
              <th className="px-4 py-3 font-heading font-semibold">Refunded</th>
              <th className="px-4 py-3 font-heading font-semibold">Left to refund</th>
              <th className="px-4 py-3 font-heading font-semibold">Reason</th>
              <th className="px-4 py-3 font-heading font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-ink/50">
                  No refunds are waiting.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={`${r.booking_id}-${r.payment_id ?? 'none'}`} className="border-t border-deep/10 align-top">
                  <td className="px-4 py-3 text-deep">{r.booking_number}</td>
                  <td className="px-4 py-3 text-ink/70">{formatDateTime(r.cancelled_at)}</td>
                  <td className="px-4 py-3 text-deep">{money(r.currency_code, r.paid)}</td>
                  <td className="px-4 py-3 text-ink/70">
                    {money(r.currency_code, r.refunded)}
                    {r.pending_refund > 0 && (
                      <span className="block text-[11px] text-orange">
                        + {money(r.currency_code, r.pending_refund)} in progress
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-semibold text-deep">
                    {money(r.currency_code, r.remaining)}
                  </td>
                  <td className="px-4 py-3 text-ink/70">{r.cancellation_reason ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    {r.payment_id ? (
                      <Link
                        href={`/admin/payments/${r.payment_id}`}
                        className="focus-ring rounded-lg border border-deep/15 px-2.5 py-1.5 text-[12px] font-semibold text-deep transition hover:bg-mist"
                      >
                        Review &amp; refund
                      </Link>
                    ) : (
                      <span className="text-[12px] text-ink/50">No payment found: check manually</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
