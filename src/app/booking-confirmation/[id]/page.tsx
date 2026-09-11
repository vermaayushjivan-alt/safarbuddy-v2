// PATH: src/app/booking-confirmation/[id]/page.tsx
//
// BOOKING-03: public confirmation page a guest lands on right after
// createBooking() succeeds without a session. Deliberately outside any
// auth gate — see getGuestBookingConfirmation()'s header comment in
// booking.actions.ts for the trust model (unguessable UUID, not an
// enumerable identifier). /booking-confirmation/ is in middleware.ts's
// public allowlist.

import { notFound } from 'next/navigation';
import Navbar from '@/components/home/Navbar';
import Footer from '@/components/home/Footer';
import { getGuestBookingConfirmation } from '@/app/actions/booking.actions';
import { isValidUuid } from '@/lib/utils/uuid';
import type { BookingRecord } from '@/lib/repositories/booking.repository';

function formatDate(value: string | null): string {
  return value ?? '—';
}

function bookingDates(booking: BookingRecord): string {
  if (booking.booking_type === 'hotel') {
    return `${formatDate(booking.check_in_date)} → ${formatDate(booking.check_out_date)}`;
  }
  return formatDate(booking.travel_date);
}

export default async function BookingConfirmationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!isValidUuid(id)) {
    notFound();
  }

  const booking = await getGuestBookingConfirmation(id);

  if (!booking) {
    notFound();
  }

  return (
    <main className="bg-cream">
      <Navbar />

      <section className="mx-auto max-w-2xl px-6 py-12">
        <div className="rounded-2xl border border-deep/15 bg-white p-8">
          <p className="text-[13px] font-semibold text-green-600">
            ✓ Booking placed successfully
          </p>

          <h1 className="mt-2 font-display text-3xl text-deep">
            Booking confirmed
          </h1>

          <p className="mt-2 text-[14px] text-ink/60">
            We&apos;ve recorded your {booking.booking_type} booking.
            {booking.guest_email
              ? ` A confirmation will be sent to ${booking.guest_email}.`
              : ''}
          </p>

          <dl className="mt-8 space-y-4 border-t border-deep/10 pt-6 text-[13px]">
            <div className="flex justify-between">
              <dt className="text-ink/45">Booking number</dt>
              <dd className="font-semibold text-deep">{booking.booking_number}</dd>
            </div>

            <div className="flex justify-between">
              <dt className="text-ink/45">
                {booking.booking_type === 'hotel' ? 'Dates' : 'Travel date'}
              </dt>
              <dd className="font-semibold text-deep">{bookingDates(booking)}</dd>
            </div>

            <div className="flex justify-between">
              <dt className="text-ink/45">Guests</dt>
              <dd className="font-semibold text-deep">{booking.num_guests}</dd>
            </div>

            <div className="flex justify-between">
              <dt className="text-ink/45">Status</dt>
              <dd className="font-semibold capitalize text-deep">{booking.status}</dd>
            </div>

            {booking.guest_name && (
              <div className="flex justify-between">
                <dt className="text-ink/45">Booked by</dt>
                <dd className="font-semibold text-deep">{booking.guest_name}</dd>
              </div>
            )}
          </dl>

          <p className="mt-8 text-[11px] text-ink/45">
            Save this link — it&apos;s the only way to view this booking
            without creating an account.
          </p>
        </div>
      </section>

      <Footer />
    </main>
  );
}

