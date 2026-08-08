// src/app/dashboard/bookings/[id]/pay/page.tsx
// PAY-01 — Customer payment initiation page.
//
// Flow:
//   1. Server component fetches booking (ownership enforced in action).
//   2. Client component calls initiatePayment() on user action.
//   3. Server action returns paymentSessionId.
//   4. Cashfree JS SDK (CDN) redirects to hosted checkout.
//
// No credentials are passed to the client.
// Amount and currency come exclusively from the server action.

import { getAuthUser } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { getMyBookingById } from '@/lib/actions/booking.actions';
import { PayNowButton } from '@/components/payment/PayNowButton';

interface PageProps {
  params: { id: string };
}

export default async function BookingPayPage({ params }: PageProps) {
  const authUser = await getAuthUser();
  if (!authUser) {
    redirect('/login');
  }

  const booking = await getMyBookingById(params.id);

  if (!booking) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="font-heading text-xl font-bold text-deep">
          Booking not found
        </h1>
        <p className="mt-2 text-[14px] text-ink/60">
          This booking does not exist or does not belong to your account.
        </p>
      </main>
    );
  }

  if (booking.status !== 'pending') {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="font-heading text-xl font-bold text-deep">
          Payment not available
        </h1>
        <p className="mt-2 text-[14px] text-ink/60">
          This booking is currently{' '}
          <span className="font-semibold">{booking.status}</span> and cannot
          be paid at this time.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <h1 className="font-heading text-2xl font-bold text-deep">
        Complete Payment
      </h1>

      <div className="mt-6 rounded-2xl border border-deep/10 bg-white p-6 shadow-sm">
        <div className="space-y-3 text-[14px] text-ink/70">
          <div className="flex justify-between">
            <span>Booking type</span>
            <span className="font-semibold capitalize text-deep">
              {booking.booking_type}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Guests</span>
            <span className="font-semibold text-deep">
              {booking.num_guests}
            </span>
          </div>
          <div className="flex justify-between border-t border-deep/10 pt-3">
            <span className="font-semibold text-deep">Total</span>
            <span className="font-bold text-deep">
              {booking.currency ?? 'INR'}{' '}
              {Number(booking.price_snapshot).toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        <div className="mt-6">
          <PayNowButton bookingId={booking.id} />
        </div>

        <p className="mt-4 text-center text-[11px] text-ink/40">
          Secured by Cashfree Payments
        </p>
      </div>
    </main>
  );
}
