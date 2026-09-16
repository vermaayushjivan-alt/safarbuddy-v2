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
// Do NOT mark payment as paid here. Do NOT call confirmBooking here.
// The webhook handler remains the only authoritative payment processor
// — this page only ever reads status, never writes it.

import Link from 'next/link';
import { getPaymentOutcomeForResult } from '@/lib/actions/payment.actions';

interface PageProps {
  searchParams: Promise<{ order_id?: string; booking_id?: string }>;
}

export default async function PaymentSuccessPage({
  searchParams,
}: PageProps) {
  const { order_id, booking_id } = await searchParams;

  const outcome = order_id
    ? await getPaymentOutcomeForResult(order_id)
    : "pending";

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

  return (
    <main className="mx-auto max-w-lg px-4 py-20 text-center">
      <div className="mb-6 flex justify-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <svg
            className="h-8 w-8 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
      </div>

      <h1 className="font-heading text-2xl font-bold text-deep">
        Payment Successful
      </h1>

      <p className="mt-3 text-[14px] text-ink/60">
        Your payment was received. Your booking is now confirmed.
      </p>

      {order_id && (
        <p className="mt-2 text-[12px] text-ink/40">
          Reference: {order_id}
        </p>
      )}

      <div className="mt-8 flex flex-col gap-3">
        <Link
          href="/dashboard/bookings"
          className="rounded-xl bg-orange px-6 py-3 font-heading text-[15px] font-bold text-white transition hover:bg-orange/90"
        >
          View My Bookings
        </Link>
        <Link
          href="/"
          className="rounded-xl border border-deep/15 px-6 py-3 font-heading text-[14px] font-semibold text-deep transition hover:bg-mist"
        >
          Back to Home
        </Link>
      </div>
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
