// ROOT PATH: src/app/dashboard/support/[id]/page.tsx
// SUPPORT-01 — customer side of one support request (chat box).

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth/session';
import { getTicketThread } from '@/app/actions/support.actions';
import { TicketChatThread } from '@/components/support/TicketStatusControls';
import { toSafeErrorMessage } from '@/lib/actions/action-result';
import {
  CATEGORY_LABELS,
  STATUS_LABELS,
} from '@/lib/repositories/help-ticket.repository';

export default async function MySupportTicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const authUser = await getAuthUser();
  if (!authUser) {
    redirect('/login');
  }

  const result = await getTicketThread(id);

  if (!result.success) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="font-heading text-xl font-bold text-deep">Request not found</h1>
        <p className="mt-2 text-[14px] text-ink/60">{toSafeErrorMessage(result.error)}</p>
      </main>
    );
  }

  const { ticket, messages, bookingNumber } = result.data;
  const isClosed = ticket.status === 'closed';
  const canMarkResolved = ticket.status !== 'resolved' && ticket.status !== 'closed';

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <Link
        href="/dashboard/support"
        className="focus-ring mb-6 inline-block text-[13px] font-semibold text-deep hover:underline"
      >
        ← Help &amp; support
      </Link>

      <div className="mb-4">
        <h1 className="font-heading text-xl font-bold text-deep">{ticket.subject}</h1>
        <p className="text-[13px] text-ink/60">
          {ticket.ticket_number} · {CATEGORY_LABELS[ticket.category]}
          {bookingNumber ? ` · Booking ${bookingNumber}` : ''} · {STATUS_LABELS[ticket.status]}
        </p>
      </div>

      <TicketChatThread
        ticketId={ticket.id}
        viewerRole="customer"
        initialMessages={messages}
        isClosed={isClosed}
        canMarkResolved={canMarkResolved}
      />
    </div>
  );
}
