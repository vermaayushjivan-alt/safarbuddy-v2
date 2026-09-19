// src/app/admin/bookings/[id]/chat/page.tsx
// CHAT-01 — admin side of the 3-way booking chat.
//
// Mirrors admin/bookings/[id]/invoice/page.tsx exactly — same "no
// [id] detail page exists, so this is a dedicated route linked
// directly from the list's Actions column" reasoning (see that file's
// RULE 15 note). getBookingChatContext() (booking-chat.actions.ts)
// does its own requireRole-equivalent check internally (an admin/
// super_admin role always resolves to the 'admin' chat role — see
// resolveSenderRole()'s header there) — this page just treats any
// thrown error as notFound(), same as the invoice page beside it.

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getBookingChatContext } from '@/app/actions/booking-chat.actions';
import { BookingChatThread } from '@/components/chat/BookingChatThread';

export default async function AdminBookingChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const result = await getBookingChatContext(id);

  if (!result.success) {
    notFound();
  }

  const chat = result.data;

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <Link
        href="/admin/bookings"
        className="focus-ring mb-6 inline-block text-[13px] font-semibold text-deep hover:underline"
      >
        ← All bookings
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
