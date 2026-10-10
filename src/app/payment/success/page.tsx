// src/app/payment/success/page.tsx
// PAY-01 — Payment result landing page (return_url target for Cashfree).
//
// PAY-05 fix (this session): this page previously showed a hardcoded
// "Payment Submitted Successfully" message on every single visit,
// regardless of what actually happened — see getPaymentOutcomeForResult()
// in payment.actions.ts for the full root-cause explanation. It now
// checks the real outcome (DB first, live Cashfree fallback) and
// renders success / failure / still-verifying accordingly.
//
// REDESIGN: the success state is now a full "Booking Confirmed" screen
// (animated tick like PhonePe / Google Pay, booking details, invoice button)
// with ad banners and offers below it. It is also the page the Pay page
// sends a customer to when they go "back" to an already-paid booking.
// The failed / pending states are unchanged.
//
// Do NOT mark payment as paid here. Do NOT call confirmBooking here.
// The webhook handler remains the only authoritative payment processor
// — this page only ever reads status, never writes it.

import Link from 'next/link';
import { getPaymentOutcomeForResult } from '@/lib/actions/payment.actions';
import { getMyBookingById } from '@/app/actions/booking.actions';
import { createServiceRoleClient } from '@/lib/supabase/server';
import type { BookingRecord } from '@/lib/repositories/booking.repository';
import { PaymentRepository } from '@/lib/repositories/payment.repository';
import { HotelRepository } from '@/lib/repositories/hotel.repository';
import { PackageRepository } from '@/lib/repositories/package.repository';
import BookingConfirmedHero from '@/components/payment/BookingConfirmedHero';
import PromoBanner from '@/components/home/PromoBanner';
import Offers from '@/components/home/Offers';
import Packages from '@/components/home/Packages';

interface PageProps {
  searchParams: Promise<{ order_id?: string; booking_id?: string }>;
}

const PAID_PAYMENT_STATUSES = ['success', 'partially_refunded', 'refunded'];

function formatDay(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// Payment time is always shown in Indian time, whatever timezone the server runs in.
function formatPaymentTime(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date
    .toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata',
    })
    .replace(/\b(am|pm)\b/, (m) => m.toUpperCase());
}

// Ownership-scoped (the customer's own session). Null when not signed in or
// not their booking — the page then just shows the confirmation without details.
async function loadMyBooking(id?: string): Promise<BookingRecord | null> {
  if (!id) return null;
  try {
    return await getMyBookingById(id);
  } catch {
    return null;
  }
}

interface ConfirmedDetails {
  itemName: string | null;
  itemLocation: string | null;
  paidAt: string | null;
  reference: string | null;
}

// Only called AFTER loadMyBooking() proved the booking belongs to this customer.
async function loadConfirmedDetails(booking: BookingRecord): Promise<ConfirmedDetails> {
  const admin = createServiceRoleClient();
  const details: ConfirmedDetails = {
    itemName: null,
    itemLocation: null,
    paidAt: null,
    reference: null,
  };

  try {
    if (booking.booking_type === 'hotel' && booking.hotel_id) {
      const hotel = await new HotelRepository(admin).getHotelById(booking.hotel_id);
      details.itemName = hotel?.hotel_name ?? null;
      details.itemLocation = hotel?.city ?? null;
    } else if (booking.package_id) {
      const pack = await new PackageRepository(admin).getPackageById(booking.package_id);
      details.itemName = pack?.package_name ?? null;
      details.itemLocation = pack?.city ?? null;
    }
  } catch (error) {
    console.error('[payment success] item lookup failed', error);
  }

  try {
    const payments = await new PaymentRepository(admin).getPaymentsByBookingId(booking.id);
    const paid = payments
      .filter((p) => PAID_PAYMENT_STATUSES.includes(p.status) && p.completed_at)
      .sort(
        (a, b) =>
          new Date(b.completed_at as string).getTime() -
          new Date(a.completed_at as string).getTime()
      )[0];

    if (paid) {
      details.paidAt = paid.completed_at;
      details.reference = paid.gateway_order_id ?? null;
    }
  } catch (error) {
    console.error('[payment success] payment lookup failed', error);
  }

  return details;
}

export default async function PaymentSuccessPage({
  searchParams,
}: PageProps) {
  const { order_id, booking_id } = await searchParams;

  const booking = await loadMyBooking(booking_id);
  const bookingIsPaid =
    booking !== null &&
    (booking.status === 'confirmed' || booking.status === 'completed');

  let outcome: 'success' | 'failed' | 'pending';
  if (order_id) {
    outcome = await getPaymentOutcomeForResult(order_id);
  } else {
    // Arrived from the Pay page (booking already paid) — no gateway order id.
    outcome = bookingIsPaid ? 'success' : 'pending';
  }

  if (outcome === "failed") {
    return (
      <FailedState orderId={order_id} bookingId={booking_id} />
    );
  }

  if (outcome === "pending") {
    return (
      <PendingState orderId={order_id} />
    );
  }

  const details = bookingIsPaid && booking ? await loadConfirmedDetails(booking) : null;
  const reference = order_id ?? details?.reference ?? null;

  const amountLabel =
    bookingIsPaid && booking
      ? `${booking.currency === 'INR' ? '₹' : `${booking.currency} `}${Number(
          booking.price_snapshot
        ).toLocaleString('en-IN')}`
      : null;
  const paidAtLabel = formatPaymentTime(details?.paidAt);

  const checkIn = formatDay(booking?.check_in_date);
  const checkOut = formatDay(booking?.check_out_date);
  const travel = formatDay(booking?.travel_date);

  return (
    <main className="bg-cream pb-28">
      <BookingConfirmedHero amountLabel={amountLabel} paidAtLabel={paidAtLabel} />

      <div className="mx-auto max-w-lg px-4">
        {bookingIsPaid && booking && (
          <div className="rounded-2xl border border-deep/10 bg-white p-5 shadow-sm">
            {details?.itemName && (
              <div className="border-b border-deep/10 pb-4">
                <p className="font-heading text-[17px] font-bold text-deep">
                  {details.itemName}
                </p>
                {details.itemLocation && (
                  <p className="mt-0.5 text-[13px] text-ink/60">{details.itemLocation}</p>
                )}
              </div>
            )}

            <dl className="space-y-3 pt-4 text-[13px]">
              <div className="flex justify-between gap-4">
                <dt className="text-ink/50">Booking ID</dt>
                <dd className="font-semibold text-deep">{booking.booking_number}</dd>
              </div>

              {booking.booking_type === 'hotel' ? (
                (checkIn || checkOut) && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-ink/50">Dates</dt>
                    <dd className="text-right font-semibold text-deep">
                      {[checkIn, checkOut].filter(Boolean).join('  →  ')}
                    </dd>
                  </div>
                )
              ) : (
                travel && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-ink/50">Travel date</dt>
                    <dd className="font-semibold text-deep">{travel}</dd>
                  </div>
                )
              )}

              <div className="flex justify-between gap-4">
                <dt className="text-ink/50">Guests</dt>
                <dd className="font-semibold text-deep">
                  {booking.num_guests} {booking.num_guests === 1 ? 'guest' : 'guests'}
                </dd>
              </div>

              {paidAtLabel && (
                <div className="flex justify-between gap-4">
                  <dt className="text-ink/50">Payment time</dt>
                  <dd className="text-right font-semibold text-deep">{paidAtLabel}</dd>
                </div>
              )}

              {reference && (
                <div className="flex justify-between gap-4">
                  <dt className="text-ink/50">Reference</dt>
                  <dd className="break-all text-right text-[12px] font-medium text-ink/70">
                    {reference}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        )}

        {!bookingIsPaid && reference && (
          <p className="text-center text-[12px] text-ink/40">Reference: {reference}</p>
        )}

        <p className="mt-4 text-center text-[13px] text-ink/60">
          A confirmation with your invoice is also sent to your email.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          {bookingIsPaid && booking && (
            <Link
              href={`/dashboard/bookings/${booking.id}/invoice`}
              className="rounded-xl bg-orange px-6 py-3 text-center font-heading text-[15px] font-bold text-white transition hover:bg-orange/90"
            >
              View Invoice
            </Link>
          )}
          <Link
            href="/dashboard/bookings"
            className="rounded-xl border border-deep/15 bg-white px-6 py-3 text-center font-heading text-[14px] font-semibold text-deep transition hover:bg-mist"
          >
            View My Bookings
          </Link>
          <Link
            href="/"
            className="rounded-xl px-6 py-2 text-center font-heading text-[14px] font-semibold text-deep/70 transition hover:text-deep"
          >
            Back to Home
          </Link>
        </div>
      </div>

      {/* ADS — same admin-managed banners as the homepage (Admin → Promotions). */}
      <div className="mt-8">
        <PromoBanner slot="after_hero" />
      </div>

      {/* REFER & EARN */}
      <div className="mx-auto mt-2 max-w-lg px-4">
        <Link
          href="/referral"
          className="focus-ring block rounded-2xl bg-gradient-to-br from-deep to-deep-2 p-5 text-white shadow-[0_14px_30px_-16px_rgba(11,47,92,0.6)] transition hover:-translate-y-0.5"
        >
          <p className="font-heading text-[11px] font-semibold uppercase tracking-wide text-white/70">
            Refer &amp; Earn
          </p>
          <p className="mt-1 font-heading text-xl font-bold">
            Invite a friend, you both get a discount
          </p>
          <p className="mt-1 text-[13px] text-white/75">
            Share your link. When your friend completes their first booking, you earn a
            discount coupon too.
          </p>
          <span className="mt-4 inline-block rounded-full bg-white px-4 py-2 font-heading text-[13px] font-semibold text-deep">
            Get my referral link
          </span>
        </Link>
      </div>

      {/* MORE TO EXPLORE */}
      <Offers />
      <PromoBanner slot="between_destinations_trending" />
      <Packages />
      <PromoBanner slot="between_packages_testimonials" />
    </main>
  );
}

function FailedState({
  orderId,
  bookingId,
}: {
  orderId?: string;
  bookingId?: string;
}) {
  return (
    <main className="mx-auto max-w-lg px-4 py-20 text-center">
      <div className="mb-6 flex justify-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <svg
            className="h-8 w-8 text-red-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>
      </div>

      <h1 className="font-heading text-2xl font-bold text-deep">
        Payment Failed
      </h1>

      <p className="mt-3 text-[14px] text-ink/60">
        Your payment could not be completed. No amount has been
        deducted for this attempt (or will be automatically reversed
        by your bank if it was). Please try again.
      </p>

      {orderId && (
        <p className="mt-2 text-[12px] text-ink/40">
          Reference: {orderId}
        </p>
      )}

      <div className="mt-8 flex flex-col gap-3">
        {bookingId && (
          <Link
            href={`/dashboard/bookings/${bookingId}/pay`}
            className="rounded-xl bg-orange px-6 py-3 font-heading text-[15px] font-bold text-white transition hover:bg-orange/90"
          >
            Try Again
          </Link>
        )}
        <Link
          href="/dashboard/bookings"
          className="rounded-xl border border-deep/15 px-6 py-3 font-heading text-[14px] font-semibold text-deep transition hover:bg-mist"
        >
          View My Bookings
        </Link>
      </div>
    </main>
  );
}

function PendingState({ orderId }: { orderId?: string }) {
  return (
    <main className="mx-auto max-w-lg px-4 py-20 text-center">
      <h1 className="font-heading text-2xl font-bold text-deep">
        Verifying Your Payment
      </h1>

      <p className="mt-3 text-[14px] text-ink/60">
        We&apos;re still confirming your payment with the bank. This
        page will not update automatically — please refresh in a
        minute, or check My Bookings shortly.
      </p>

      {orderId && (
        <p className="mt-2 text-[12px] text-ink/40">
          Reference: {orderId}
        </p>
      )}

      <div className="mt-8 flex flex-col gap-3">
        <Link
          href="/dashboard/bookings"
          className="rounded-xl bg-orange px-6 py-3 font-heading text-[15px] font-bold text-white transition hover:bg-orange/90"
        >
          View My Bookings
        </Link>
      </div>
    </main>
  );
}
