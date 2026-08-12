import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPaymentByIdAdmin } from '@/lib/actions/payment.actions';
import { getBookingByIdAdmin } from '@/app/actions/booking.actions';
import { isValidUuid } from '@/lib/utils/uuid';

function formatDateTime(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case 'paid':
      return 'bg-mist text-deep';
    case 'failed':
    case 'flagged':
      return 'bg-red-50 text-red-600';
    default:
      return 'bg-orange/10 text-orange';
  }
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-deep/10 px-4 py-3 last:border-0">
      <span className="text-[12px] font-heading font-semibold uppercase tracking-wide text-ink/50">
        {label}
      </span>
      <span className="text-[13px] text-deep">{value}</span>
    </div>
  );
}

export default async function AdminPaymentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!isValidUuid(id)) {
    notFound();
  }

  const payment = await getPaymentByIdAdmin(id);

  if (!payment) {
    notFound();
  }

  const booking = await getBookingByIdAdmin(payment.booking_id);

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-deep">Payment Details</h1>
          <p className="mt-2 text-[14px] text-ink/60">{payment.cf_order_id}</p>
        </div>
        <Link
          href="/admin/payments"
          className="focus-ring rounded-full border border-deep/15 px-4 py-2 text-[13px] font-semibold text-deep transition hover:bg-mist"
        >
          Back to Payments
        </Link>
      </div>

      <div className="mb-6 overflow-hidden rounded-2xl border border-deep/15 bg-white">
        <DetailRow
          label="Status"
          value={
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${statusBadgeClass(
                payment.status
              )}`}
            >
              {payment.status}
            </span>
          }
        />
        <DetailRow
          label="Amount"
          value={`${payment.currency} ${Number(payment.amount).toLocaleString('en-IN')}`}
        />
        <DetailRow label="Gateway Order ID" value={payment.cf_order_id} />
        <DetailRow label="Gateway Payment ID" value={payment.cf_payment_id ?? '—'} />
        <DetailRow
          label="Gateway Status (raw)"
          value={payment.cf_payment_status ?? '—'}
        />
        <DetailRow
          label="Payment Method"
          value={payment.payment_method ?? '—'}
        />
        <DetailRow label="Initiated At" value={formatDateTime(payment.initiated_at)} />
        <DetailRow label="Completed At" value={formatDateTime(payment.completed_at)} />
        {payment.failure_reason && (
          <DetailRow label="Failure Reason" value={payment.failure_reason} />
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-deep/15 bg-white">
        <div className="border-b border-deep/10 bg-mist px-4 py-3">
          <h2 className="font-heading text-[13px] font-semibold text-deep">Linked Booking</h2>
        </div>
        {booking ? (
          <>
            <DetailRow label="Type" value={<span className="capitalize">{booking.booking_type}</span>} />
            <DetailRow
              label="Status"
              value={<span className="capitalize">{booking.status}</span>}
            />
            <DetailRow label="Guests" value={booking.num_guests} />
            <DetailRow
              label="Price Snapshot"
              value={`${booking.currency} ${Number(booking.price_snapshot).toLocaleString('en-IN')}`}
            />
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-[12px] font-heading font-semibold uppercase tracking-wide text-ink/50">
                Booking
              </span>
              <Link
                href={`/admin/bookings?status=${booking.status}`}
                className="focus-ring rounded-lg border border-deep/15 px-2.5 py-1.5 text-[12px] font-semibold text-deep transition hover:bg-mist"
              >
                View in Bookings
              </Link>
            </div>
          </>
        ) : (
          <div className="px-4 py-6 text-center text-[13px] text-ink/50">
            Linked booking not found.
          </div>
        )}
      </div>
    </div>
  );
}
