// src/app/payment/failure/page.tsx
// PAY-01 — Payment failure landing page.
//
// Cashfree may redirect here after a failed or dropped payment.
// The customer can retry from this page.
//
// Do NOT mark payment as failed here.
// The webhook handler is the authoritative payment processor.

import Link from 'next/link';

interface PageProps {
  searchParams: { order_id?: string; booking_id?: string };
}

export default function PaymentFailurePage({ searchParams }: PageProps) {
  return (
    <main className="mx-auto max-w-lg px-4 py-20 text-center">
      <div className="mb-6 flex justify-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <svg
            className="h-8 w-8 text-red-500"
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
        Payment Unsuccessful
      </h1>

      <p className="mt-3 text-[14px] text-ink/60">
        Your payment could not be completed. Your booking has not been
        confirmed. You can try again or contact support.
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
