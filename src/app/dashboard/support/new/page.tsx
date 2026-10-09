// ROOT PATH: src/app/dashboard/support/new/page.tsx
// SUPPORT-01 — new help request. Links from "My bookings" pass
// ?booking=<id>&category=cancellation|refund|... so the form is pre-filled.

import Link from 'next/link';
import { getMyBookingById } from '@/app/actions/booking.actions';
import { NewTicketForm } from '@/components/support/NewTicketForm';
import {
  TICKET_CATEGORIES,
  type TicketCategory,
} from '@/lib/repositories/help-ticket.repository';

export default async function NewSupportRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ booking?: string; category?: string }>;
}) {
  const { booking: bookingParam, category: categoryParam } = await searchParams;

  // Ownership-scoped lookup: a booking that is not the caller's comes back empty.
  const booking = bookingParam ? await getMyBookingById(bookingParam) : null;

  const initialCategory = (TICKET_CATEGORIES as readonly string[]).includes(categoryParam ?? '')
    ? (categoryParam as TicketCategory)
    : null;

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <Link
        href="/dashboard/support"
        className="focus-ring mb-6 inline-block text-[13px] font-semibold text-deep hover:underline"
      >
        ← Help &amp; support
      </Link>

      <h1 className="mb-1 font-heading text-2xl font-bold text-deep">New request</h1>
      <p className="mb-6 text-[13px] text-ink/60">
        Our team will reply in a chat on this site. You will see the reply on your Help page.
      </p>

      <NewTicketForm
        bookingId={booking ? booking.id : null}
        bookingNumber={booking ? booking.booking_number : null}
        initialCategory={initialCategory}
      />
    </div>
  );
}
