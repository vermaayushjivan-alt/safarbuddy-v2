// src/app/dashboard/bookings/[id]/pay/page.tsx
// PAY-01 — Customer payment initiation page.
//
// P0.2 fix (2026-08-28 session, see MASTER_PLAN.md Phase 0.2): this page
// used to fetch the booking directly via BookingRepository and compare
// `booking.user_id !== authUser.id` for ownership. That comparison was
// always false for a real booking: BookingRecord.user_id is actually
// mapped from the DB's `customer_id` column (see
// src/lib/repositories/booking.repository.ts, line ~225:
// `user_id: row.customer_id`), and `customer_id` is `public.users.id` —
// a row keyed by `auth_user_id`, NOT the same UUID as
// `authUser.id` (which is `auth.users.id`, the raw Supabase Auth id).
// These are two different UUIDs for the same person. So every booking's
// "Pay Now" click showed "Booking not found," regardless of who made
// the booking — this was the confirmed root cause of that bug report.
//
// getMyBookingById() (src/app/actions/booking.actions.ts) already does
// this correctly — it resolves the real public.users.id via
// getPublicUserId() first, then compares booking.customer_id against
// THAT. This page now reuses that already-correct, already-used-
// elsewhere (getMyBookings) logic instead of re-deriving its own
// (broken) version of the same check.
//
// Auth: getAuthUser() — redirect to /login if unauthenticated.
// Ownership + ownership-scoped fetch: getMyBookingById() — server-side.
// Amount/currency: derived from booking record — never from client.

import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth/session';
import { getMyBookingById } from '@/app/actions/booking.actions';
import { PayNowButton } from '@/components/payment/PayNowButton';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function BookingPayPage({ params }: PageProps) {
  const { id } = await params;

  // 1. Auth check — redirect unauthenticated users
  const authUser = await getAuthUser();
  if (!authUser) {
    redirect('/login');
  }

  // 2. Fetch booking, ownership-scoped server-side (see comment above)
  const booking = await getMyBookingById(id);

  // 3. Not found / not owned by this account
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

  // 4. Status check — only pending bookings are payable
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

  // 5. Render payment page — amount/currency from server record only
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
