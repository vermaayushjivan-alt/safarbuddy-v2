import Link from 'next/link';
import { getAllPaymentsAdmin } from '@/lib/actions/payment.actions';
import type { PaymentRecord, PaymentStatus } from '@/lib/repositories/payment.repository';

const STATUS_FILTERS: Array<PaymentStatus | 'all'> = [
  'all',
  'pending',
  'success',
  'failed',
  'cancelled',
  'refunded',
  'partially_refunded',
];

function formatDateTime(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case 'success':
      return 'bg-mist text-deep';
    case 'failed':
    case 'cancelled':
      return 'bg-red-50 text-red-600';
    default:
      return 'bg-orange/10 text-orange';
  }
}

export default async function AdminPaymentsListPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const params = await searchParams;
  const page = Number(params.page ?? '1') || 1;
  const statusParam = (params.status ?? 'all') as PaymentStatus | 'all';
  const status = statusParam === 'all' ? undefined : statusParam;

  const { data: payments, total, totalPages, hasNext, hasPrev } = await getAllPaymentsAdmin(
    page,
    20,
    status
  );

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-deep">Payments</h1>
          <p className="mt-2 text-[14px] text-ink/60">
            {total} payment{total === 1 ? '' : 's'} total
          </p>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((filter) => (
          <Link
            key={filter}
            href={`/admin/payments?status=${filter}`}
            className={`focus-ring rounded-full border px-3.5 py-1.5 text-[12px] font-semibold capitalize transition ${
              statusParam === filter
                ? 'border-deep bg-deep text-cream'
                : 'border-deep/15 text-deep hover:bg-mist'
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
              <th className="px-4 py-3 font-heading font-semibold">Order ID</th>
              <th className="px-4 py-3 font-heading font-semibold">Amount</th>
              <th className="px-4 py-3 font-heading font-semibold">Method</th>
              <th className="px-4 py-3 font-heading font-semibold">Initiated</th>
              <th className="px-4 py-3 font-heading font-semibold">Status</th>
              <th className="px-4 py-3 font-heading font-semibold text-right">Details</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-ink/50">
                  No payments found.
                </td>
              </tr>
            ) : (
              payments.map((payment: PaymentRecord) => (
                <tr key={payment.id} className="border-b border-deep/10 last:border-0 align-top">
                  <td className="px-4 py-3 font-medium text-deep">{payment.gateway_order_id}</td>
                  <td className="px-4 py-3 text-ink/70">
                    {payment.currency_code} {Number(payment.amount).toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3 text-ink/70 capitalize">
                    {payment.payment_method ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-ink/70">{formatDateTime(payment.initiated_at)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${statusBadgeClass(
                        payment.status
                      )}`}
                    >
                      {payment.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/payments/${payment.id}`}
                      className="focus-ring rounded-lg border border-deep/15 px-2.5 py-1.5 text-[12px] font-semibold text-deep transition hover:bg-mist"
                    >
                      View
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
            href={`/admin/payments?page=${page - 1}&status=${statusParam}`}
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
            href={`/admin/payments?page=${page + 1}&status=${statusParam}`}
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
