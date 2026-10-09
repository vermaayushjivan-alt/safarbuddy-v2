// ROOT PATH: src/app/dashboard/support/page.tsx
// SUPPORT-01 — customer's list of help requests (cancellation, refund, ...).

import Link from 'next/link';
import { listMyTickets } from '@/app/actions/support.actions';
import { toSafeErrorMessage } from '@/lib/actions/action-result';
import {
  CATEGORY_LABELS,
  STATUS_LABELS,
} from '@/lib/repositories/help-ticket.repository';

function formatDate(value: string): string {
  return new Date(value).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default async function MySupportPage() {
  const result = await listMyTickets();

  if (!result.success) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-[14px] text-ink/60">{toSafeErrorMessage(result.error)}</p>
      </main>
    );
  }

  const tickets = result.data;

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <Link
        href="/dashboard/bookings"
        className="focus-ring mb-6 inline-block text-[13px] font-semibold text-deep hover:underline"
      >
        ← My bookings
      </Link>

      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-bold text-deep">Help &amp; support</h1>
        <Link
          href="/dashboard/support/new"
          className="focus-ring rounded-full bg-sky px-5 py-2 text-[13px] font-semibold text-white"
        >
          New request
        </Link>
      </div>

      {tickets.length === 0 ? (
        <div className="rounded-2xl border border-deep/15 bg-white px-6 py-12 text-center">
          <p className="text-[14px] text-ink/60">
            You have no requests yet. Need to cancel a booking or ask about a refund? Start a
            request and our team will reply here.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {tickets.map((t) => (
            <li key={t.id}>
              <Link
                href={`/dashboard/support/${t.id}`}
                className="focus-ring block rounded-2xl border border-deep/15 bg-white px-4 py-3 transition hover:bg-mist"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[14px] font-semibold text-deep">
                      {t.subject}
                      {t.unread && (
                        <span className="ml-2 rounded-full bg-orange px-2 py-0.5 text-[10px] font-semibold text-white">
                          New reply
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-[12px] text-ink/55">
                      {t.ticket_number} · {CATEGORY_LABELS[t.category]}
                      {t.booking_number ? ` · Booking ${t.booking_number}` : ''}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-mist px-2.5 py-0.5 text-[11px] font-semibold text-deep">
                    {STATUS_LABELS[t.status]}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-ink/45">Last activity {formatDate(t.last_message_at)}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
