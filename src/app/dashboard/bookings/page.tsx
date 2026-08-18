// PATH: src/app/dashboard/bookings/page.tsx
import Link from 'next/link';
import { getMyBookings } from '@/app/actions/booking.actions';
import CancelBookingButton from '@/components/booking/CancelBookingButton';
import type { BookingRecord } from '@/lib/repositories/booking.repository';

function formatDate(value: string | null): string {
  return value ?? '—';
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case 'confirmed':
      return 'bg-mist text-deep';
    case 'cancelled':
      return 'bg-red-50 text-red-600';
    case 'completed':
      return 'bg-mist text-ink/60';
    default:
      return 'bg-orange/10 text-orange';
  }
}

function bookingDates(booking: BookingRecord): string {
  if (booking.booking_type === 'hotel') {
    return `${formatDate(booking.check_in_date)} → ${formatDate(booking.check_out_date)}`;
  }
  return formatDate(booking.travel_date);
}

export default async function MyBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; created?: string }>;
}) {
  const params = await searchParams;
  const page = Number(params.page ?? '1') || 1;
  const justCreated = params.created ?? null;

  const { data: bookings, total, totalPages, hasNext, hasPrev } =
    await getMyBookings(page, 20);

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <div className="mb-8">
        <h1 className="font-display text-3xl text-deep">My Bookings</h1>
        <p className="mt-2 text-[14px] text-ink/60">
          {total} booking{total === 1 ? '' : 's'} total
        </p>
      </div>

      {/* Success banner shown after createBooking() redirect */}
      {justCreated && (
        <div className="mb-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-[13px] text-green-700">
          ✓ Booking placed successfully. Click{' '}
          <strong>Pay Now</strong> below to complete your payment and confirm
          your booking.
        </div>
      )}

      {/*
        MOBILE-PAYMENT-BUG-01 hotfix (see SESSION_HANDOFF.md): the 6-column
        table below is wider than a phone viewport. It previously sat
        inside a plain `overflow-hidden` wrapper (no horizontal scroll),
        so on mobile the rightmost "Actions" column — the only place the
        "Pay Now" button lives — was clipped completely outside the
        visible area rather than scrollable into view. Root cause was
        rendered-but-outside-viewport / clipped-by-overflow-hidden, not a
        disabled state or conditional-rendering bug.

        Fix, keeping the existing visual language (same table, same card
        border/radius, same button styles) rather than introducing a new
        payment UI:
        - Desktop/tablet (md and up): unchanged table, now with
          overflow-x-auto instead of overflow-hidden as a safety net if a
          future column is added.
        - Mobile (below md): the table is hidden and each booking renders
          as a stacked card instead, using the exact same status/price
          formatting and Pay Now / Paid / Cancel actions — so every
          action button is always fully visible without needing to
          scroll a table sideways.
      */}
      <div className="hidden overflow-x-auto rounded-2xl border border-deep/15 bg-white md:block">
        <table className="w-full text-left text-[13px]">
          <thead className="border-b border-deep/10 bg-mist text-[11px] uppercase tracking-wide text-ink/50">
            <tr>
              <th className="px-4 py-3 font-heading font-semibold">Type</th>
              <th className="px-4 py-3 font-heading font-semibold">Dates</th>
              <th className="px-4 py-3 font-heading font-semibold">Guests</th>
              <th className="px-4 py-3 font-heading font-semibold">Price</th>
              <th className="px-4 py-3 font-heading font-semibold">Status</th>
              <th className="px-4 py-3 font-heading font-semibold text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {bookings.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-ink/50"
                >
                  No bookings yet.
                </td>
              </tr>
            ) : (
              bookings.map((booking) => (
                <tr
                  key={booking.id}
                  className="border-b border-deep/10 last:border-0"
                >
                  <td className="px-4 py-3 font-medium capitalize text-deep">
                    {booking.booking_type}
                  </td>
                  <td className="px-4 py-3 text-ink/70">
                    {bookingDates(booking)}
                  </td>
                  <td className="px-4 py-3 text-ink/70">
                    {booking.num_guests}
                  </td>
                  <td className="px-4 py-3 text-ink/70">
                    {booking.currency}{' '}
                    {Number(booking.price_snapshot).toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${statusBadgeClass(
                        booking.status
                      )}`}
                    >
                      {booking.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">

                      {/* PAY NOW — pending bookings only */}
                      {booking.status === 'pending' && (
                        <Link
                          href={`/dashboard/bookings/${booking.id}/pay`}
                          className="focus-ring rounded-lg bg-orange px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-orange/90"
                        >
                          Pay Now
                        </Link>
                      )}

                      {/* PAID indicator — confirmed bookings */}
                      {booking.status === 'confirmed' && (
                        <span className="rounded-lg bg-green-50 px-3 py-1.5 text-[12px] font-semibold text-green-700">
                          Paid ✓
                        </span>
                      )}

                      {/* CANCEL — pending or confirmed only */}
                      {(booking.status === 'pending' ||
                        booking.status === 'confirmed') && (
                        <CancelBookingButton bookingId={booking.id} />
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile card list — md:hidden mirrors the table above 1:1 */}
      <div className="space-y-3 md:hidden">
        {bookings.length === 0 ? (
          <div className="rounded-2xl border border-deep/15 bg-white px-4 py-10 text-center text-[13px] text-ink/50">
            No bookings yet.
          </div>
        ) : (
          bookings.map((booking) => (
            <div
              key={booking.id}
              className="rounded-2xl border border-deep/15 bg-white p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium capitalize text-deep">
                    {booking.booking_type}
                  </p>
                  <p className="mt-0.5 text-[12px] text-ink/60">
                    {bookingDates(booking)}
                  </p>
                </div>
                <span
                  className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${statusBadgeClass(
                    booking.status
                  )}`}
                >
                  {booking.status}
                </span>
              </div>

              <div className="mt-3 flex items-center justify-between text-[13px] text-ink/70">
                <span>{booking.num_guests} guest{booking.num_guests === 1 ? '' : 's'}</span>
                <span className="font-semibold text-deep">
                  {booking.currency}{' '}
                  {Number(booking.price_snapshot).toLocaleString('en-IN')}
                </span>
              </div>

              <div className="mt-4 flex items-center justify-end gap-2 border-t border-deep/10 pt-3">
                {/* PAY NOW — pending bookings only. This is the button
                    that was unreachable on mobile before this hotfix. */}
                {booking.status === 'pending' && (
                  <Link
                    href={`/dashboard/bookings/${booking.id}/pay`}
                    className="focus-ring w-full rounded-lg bg-orange px-3 py-2 text-center text-[13px] font-semibold text-white transition hover:bg-orange/90"
                  >
                    Pay Now
                  </Link>
                )}

                {/* PAID indicator — confirmed bookings */}
                {booking.status === 'confirmed' && (
                  <span className="w-full rounded-lg bg-green-50 px-3 py-2 text-center text-[13px] font-semibold text-green-700">
                    Paid ✓
                  </span>
                )}

                {/* CANCEL — pending or confirmed only */}
                {(booking.status === 'pending' ||
                  booking.status === 'confirmed') && (
                  <CancelBookingButton bookingId={booking.id} />
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link
            href={`/dashboard/bookings?page=${page - 1}`}
            aria-disabled={!hasPrev}
            className={`focus-ring rounded-full border border-deep/15 px-4 py-2 text-[13px] font-semibold text-deep ${
              hasPrev
                ? 'hover:bg-mist'
                : 'pointer-events-none opacity-40'
            }`}
          >
            Previous
          </Link>
          <span className="text-[13px] text-ink/60">
            Page {page} of {totalPages}
          </span>
          <Link
            href={`/dashboard/bookings?page=${page + 1}`}
            aria-disabled={!hasNext}
            className={`focus-ring rounded-full border border-deep/15 px-4 py-2 text-[13px] font-semibold text-deep ${
              hasNext
                ? 'hover:bg-mist'
                : 'pointer-events-none opacity-40'
            }`}
          >
            Next
          </Link>
        </div>
      )}
    </div>
  );
}
