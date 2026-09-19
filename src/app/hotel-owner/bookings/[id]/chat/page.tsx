// src/app/hotel-owner/bookings/[id]/chat/page.tsx
// CHAT-01 — hotel-owner side of the 3-way booking chat.
//
// Auth/ownership: getBookingChatContext() (booking-chat.actions.ts)
// resolves the caller's role itself — a hotel_owner reaches 'hotel'
// only if the booking's vendor.owner_user_id matches them (see
// resolveSenderRole() there), so a hotel owner cannot open another
// hotel's booking chat by guessing an id; it throws FORBIDDEN, treated
// as notFound() here, same "don't distinguish not-found from not-
// yours" reasoning owner-context.ts's assertHotelOwnedByVendor() uses.

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getBookingChatContext } from '@/app/actions/booking-chat.actions';
import { BookingChatThread } from '@/components/chat/BookingChatThread';

export default async function HotelOwnerBookingChatPage({
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
        href="/hotel-owner/bookings"
        className="focus-ring mb-6 inline-block text-[13px] font-semibold text-deep hover:underline"
      >
        ← Bookings
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
