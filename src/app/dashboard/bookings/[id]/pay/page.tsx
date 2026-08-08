// src/app/dashboard/bookings/[id]/pay/page.tsx
// PAY-01 — Customer payment initiation page.
//
// Fetches booking directly via BookingRepository (Server Component).
// This avoids any import path ambiguity around booking.actions.ts
// while preserving full ownership verification server-side.
//
// Auth: getAuthUser() — redirect to /login if unauthenticated.
// Ownership: booking.user_id === authUser.id checked server-side.
// Amount/currency: derived from booking record — never from client.

import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { BookingRepository } from '@/lib/repositories/booking.repository';
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

  // 2. Fetch booking via repository — Server Component pattern
  const supabase = await createClient();
  const bookingRepo = new BookingRepository(supabase);
  const booking = await bookingRepo.getBookingById(id);

  // 3. Ownership check — server-side, never trusted from client
  if (!booking || booking.user_id !== authUser.id) {
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
