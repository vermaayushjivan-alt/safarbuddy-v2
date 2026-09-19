// src/app/dashboard/bookings/[id]/chat/page.tsx
// CHAT-01 — customer side of the 3-way booking chat.
//
// Auth/ownership pattern mirrors dashboard/bookings/[id]/invoice/
// page.tsx exactly (getAuthUser() -> redirect, then getMyBookingById()
// for an ownership-scoped existence check) — getBookingChatContext()
// (booking-chat.actions.ts) re-derives the role/ownership check again
// independently (defense in depth, same reasoning that file's header
// gives for invoice.actions.ts).
//
// A guest-checkout booking (no account) has no page to reach this
// from at all — same known, deliberate scope limit as the invoice
// page above it.

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth/session';
import { getMyBookingById } from '@/app/actions/booking.actions';
import { getBookingChatContext } from '@/app/actions/booking-chat.actions';
import { BookingChatThread } from '@/components/chat/BookingChatThread';
import { toSafeErrorMessage } from '@/lib/actions/action-result';

export default async function MyBookingChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const authUser = await getAuthUser();
  if (!authUser) {
    redirect('/login');
  }

  const booking = await getMyBookingById(id);
  if (!booking) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="font-heading text-xl font-bold text-deep">Booking not found</h1>
        <p className="mt-2 text-[14px] text-ink/60">
          This booking does not exist or does not belong to your account.
        </p>
      </main>
    );
  }

  const result = await getBookingChatContext(id);

  if (!result.success) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-[14px] text-ink/60">{toSafeErrorMessage(result.error)}</p>
      </main>
    );
  }

  const chat = result.data;

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <Link
        href="/dashboard/bookings"
        className="focus-ring mb-6 inline-block text-[13px] font-semibold text-deep hover:underline"
      >
        ← My bookings
      </Link>

      <div className="mb-4">
        <h1 className="font-heading text-xl font-bold text-deep">{chat.itemName}</h1>
        <p className="text-[13px] text-ink/60">
          Booking {chat.bookingNumber}
          {chat.bookingType === 'hotel' && chat.checkInDate && chat.checkOutDate
            ? ` · ${chat.checkInDate} → ${chat.checkOutDate}`
            : chat.travelDate
              ? ` · ${chat.travelDate}`
              : ''}
        </p>
      </div>

      <BookingChatThread
        bookingId={id}
        currentRole={chat.role}
        initialMessages={chat.messages}
      />
    </div>
  );
}

