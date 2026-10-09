// ROOT PATH: src/app/admin/support/[id]/page.tsx
// SUPPORT-01 — admin side of one support request: chat box, status/priority,
// and shortcuts to the booking chat and the refund screen (GOLIVE-07).

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTicketThread } from '@/app/actions/support.actions';
import { TicketChatThread } from '@/components/support/TicketChatThread';
import { TicketStatusControls } from '@/components/support/TicketStatusControls';
import {
  CATEGORY_LABELS,
  STATUS_LABELS,
} from '@/lib/repositories/help-ticket.repository';

export default async function AdminSupportTicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const result = await getTicketThread(id);
  if (!result.success || result.data.viewerRole !== 'support') {
    notFound();
  }

  const { ticket, messages, bookingNumber, paymentId, customerLabel } = result.data;

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <Link
        href="/admin/support"
        className="focus-ring mb-6 inline-block text-[13px] font-semibold text-deep hover:underline"
      >
        ← All requests
      </Link>

      <div className="mb-4">
        <h1 className="font-heading text-xl font-bold text-deep">{ticket.subject}</h1>
        <p className="text-[13px] text-ink/60">
          {ticket.ticket_number} · {CATEGORY_LABELS[ticket.category]}
          {customerLabel ? ` · ${customerLabel}` : ''} · {STATUS_LABELS[ticket.status]}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
        <TicketChatThread
          ticketId={ticket.id}
          viewerRole="support"
          initialMessages={messages}
          isClosed={ticket.status === 'closed'}
          canMarkResolved={false}
        />

        <aside className="space-y-4">
          <div className="rounded-2xl border border-deep/15 bg-white p-4">
            <TicketStatusControls
              ticketId={ticket.id}
              status={ticket.status}
              priority={ticket.priority}
            />
          </div>

          {ticket.booking_id && (
            <div className="space-y-2 rounded-2xl border border-deep/15 bg-white p-4">
              <p className="text-[12px] font-semibold text-ink/60">
                Booking {bookingNumber ?? ''}
              </p>
              <Link
                href={`/admin/bookings/${ticket.booking_id}/chat`}
                className="focus-ring block rounded-lg border border-deep/15 px-3 py-2 text-center text-[13px] font-semibold text-deep transition hover:bg-mist"
              >
                Booking chat
              </Link>
              {paymentId ? (
                <Link
                  href={`/admin/payments/${paymentId}`}
                  className="focus-ring block rounded-lg bg-deep px-3 py-2 text-center text-[13px] font-semibold text-cream"
                >
                  Open payment &amp; refund
                </Link>
              ) : (
                <p className="text-[12px] text-ink/50">No paid payment on this booking.</p>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
