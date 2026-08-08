// src/app/payment/success/page.tsx
// PAY-01 — Payment success landing page.
//
// Cashfree redirects here after a successful payment attempt.
// The actual payment status is determined by the webhook — this page
// shows a confirmation message only.
//
// URL: /payment/success?order_id=SF-xxxxxxxx-1234567890123
//
// Do NOT mark payment as paid here.
// Do NOT call confirmBooking here.
// The webhook handler is the authoritative payment processor.

import Link from 'next/link';

interface PageProps {
  searchParams: { order_id?: string };
}

export default function PaymentSuccessPage({ searchParams }: PageProps) {
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
        Payment Submitted
      </h1>

      <p className="mt-3 text-[14px] text-ink/60">
        Your payment has been submitted successfully. Your booking will be
        confirmed once the payment is verified.
      </p>

      {searchParams.order_id && (
        <p className="mt-2 text-[12px] text-ink/40">
          Reference: {searchParams.order_id}
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
