
// src/app/hotel-owner/bookings/page.tsx
// CHAT-01 prerequisite — minimal hotel-owner bookings list, so the new
// Chat link (CHAT-01) has somewhere to be reached from. Intentionally
// NOT a full booking-management page (no confirm/cancel here — those
// stay admin-only, unchanged) — see owner-booking.actions.ts's header
// for the scope reasoning. NO_VENDOR_FOR_OWNER / pending-hotel
// handling mirrors hotel-owner/images/page.tsx exactly (same error
// shapes, same reasoning documented there).

import Link from 'next/link';
import { getMyHotel } from '@/app/actions/owner-hotel.actions';
import { getMyHotelBookings } from '@/app/actions/owner-booking.actions';
import { toSafeErrorMessage } from '@/lib/actions/action-result';
import { Alert } from '@/components/auth/Alert';

export default async function HotelOwnerBookingsPage() {
  let hotel;

  try {
    hotel = await getMyHotel();
  } catch (err) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-12">
        <Alert>{toSafeErrorMessage(err)}</Alert>
      </div>
    );
  }

  if (!hotel) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-12">
        <Alert>
          No property is linked to your account yet.{' '}
          <Link href="/list-your-property" className="font-medium underline">
            List a property
          </Link>{' '}
          to get started.
        </Alert>
      </div>
    );
  }

  const result = await getMyHotelBookings();

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <div className="mb-8">
        <Link
          href="/hotel-owner"
          className="focus-ring inline-flex rounded-full border border-deep/15 px-4 py-2 text-[13px] font-semibold text-deep transition hover:bg-mist"
        >
          ← Back to Your Property
        </Link>
      </div>

      <h1 className="font-heading text-2xl font-bold text-deep">Bookings</h1>
      <p className="mt-1 text-[14px] text-ink/60">{hotel.hotel_name}</p>

      {!result.success ? (
        <div className="mt-6">
          <Alert>{toSafeErrorMessage(result.error)}</Alert>
        </div>
      ) : result.data.data.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-deep/15 bg-white px-6 py-10 text-center">
          <p className="text-[14px] text-ink/60">No bookings yet.</p>
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-2xl border border-deep/15 bg-white">
          <table className="w-full text-left text-[13px]">
            <thead className="border-b border-deep/10 bg-cream text-[12px] uppercase tracking-wide text-ink/50">
              <tr>
                <th className="px-4 py-3">Booking</th>
                <th className="px-4 py-3">Dates</th>
                <th className="px-4 py-3">Guests</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {result.data.data.map((booking) => (
                <tr key={booking.id} className="border-b border-deep/10 last:border-0">
                  <td className="px-4 py-3 font-medium text-deep">{booking.booking_number}</td>
                  <td className="px-4 py-3 text-ink/70">
                    {booking.check_in_date && booking.check_out_date
                      ? `${booking.check_in_date} → ${booking.check_out_date}`
                      : (booking.travel_date ?? '—')}
                  </td>
                  <td className="px-4 py-3 text-ink/70">{booking.num_guests}</td>
                  <td className="px-4 py-3 capitalize text-ink/70">{booking.status}</td>
                  <td className="px-4 py-3 text-right">
                    {(booking.status === 'confirmed' || booking.status === 'completed') && (
                      <Link
                        href={`/hotel-owner/bookings/${booking.id}/chat`}
                        className="focus-ring rounded-lg border border-deep/15 px-3 py-1.5 text-[12px] font-semibold text-deep transition hover:bg-mist"
                      >
                        Chat
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
