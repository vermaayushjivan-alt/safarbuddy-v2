// ROOT PATH: src/app/admin/support/page.tsx
// SUPPORT-01 — admin queue of customer support requests. Customers waiting for
// a reply are listed first and marked.

import Link from 'next/link';
import { listTicketsAdmin } from '@/app/actions/support.actions';
import {
  CATEGORY_LABELS,
  STATUS_LABELS,
  TICKET_STATUSES,
  type TicketStatus,
} from '@/lib/repositories/help-ticket.repository';

const FILTERS: { value: TicketStatus | 'active'; label: string }[] = [
  { value: 'active', label: 'Active' },
  ...TICKET_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] })),
];

function formatDate(value: string): string {
  return new Date(value).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default async function AdminSupportPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const filter = (FILTERS.find((f) => f.value === status)?.value ?? 'active') as
    | TicketStatus
    | 'active';

  const result = await listTicketsAdmin(filter);
  const tickets = result.success
    ? [...result.data].sort((a, b) => Number(b.needs_reply) - Number(a.needs_reply))
    : [];

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-deep">Customer Support</h1>
          <p className="mt-2 text-[14px] text-ink/60">
            Cancellation, refund and other requests from customers.
          </p>
        </div>
        <Link
          href="/admin"
          className="focus-ring rounded-full border border-deep/15 px-4 py-2 text-[13px] font-semibold text-deep transition hover:bg-mist"
        >
          Back to Dashboard
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={`/admin/support?status=${f.value}`}
            className={`focus-ring rounded-full border px-3 py-1 text-[12px] font-semibold ${
              filter === f.value
                ? 'border-deep bg-deep text-cream'
                : 'border-deep/15 text-deep hover:bg-mist'
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {!result.success && (
        <p className="mb-4 text-[13px] text-red-600">Could not load requests. Please refresh.</p>
      )}

      <div className="overflow-x-auto rounded-2xl border border-deep/15 bg-white">
        <table className="w-full text-left text-[13px]">
          <thead className="border-b border-deep/10 bg-mist text-[11px] uppercase tracking-wide text-ink/50">
            <tr>
              <th className="px-4 py-3 font-heading font-semibold">Request</th>
              <th className="px-4 py-3 font-heading font-semibold">Customer</th>
              <th className="px-4 py-3 font-heading font-semibold">Type</th>
              <th className="px-4 py-3 font-heading font-semibold">Booking</th>
              <th className="px-4 py-3 font-heading font-semibold">Priority</th>
              <th className="px-4 py-3 font-heading font-semibold">Status</th>
              <th className="px-4 py-3 font-heading font-semibold">Last activity</th>
              <th className="px-4 py-3 text-right font-heading font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {tickets.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-ink/50">
                  No requests here.
                </td>
              </tr>
            ) : (
              tickets.map((t) => (
                <tr key={t.id} className="border-t border-deep/10 align-top">
                  <td className="px-4 py-3 text-deep">
                    {t.ticket_number}
                    {t.needs_reply && (
                      <span className="ml-2 rounded-full bg-orange px-2 py-0.5 text-[10px] font-semibold text-white">
                        Needs reply
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink/70">{t.customer_label ?? '—'}</td>
                  <td className="px-4 py-3 text-ink/70">{CATEGORY_LABELS[t.category]}</td>
                  <td className="px-4 py-3 text-ink/70">{t.booking_number ?? '—'}</td>
                  <td className="px-4 py-3 capitalize text-ink/70">{t.priority}</td>
                  <td className="px-4 py-3 text-ink/70">{STATUS_LABELS[t.status]}</td>
                  <td className="px-4 py-3 text-ink/60">{formatDate(t.last_message_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/support/${t.id}`}
                      className="focus-ring rounded-lg border border-deep/15 px-2.5 py-1.5 text-[12px] font-semibold text-deep transition hover:bg-mist"
                    >
                      Open
                    </Link>
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
