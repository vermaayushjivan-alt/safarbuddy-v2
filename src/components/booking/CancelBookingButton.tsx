'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { cancelMyBooking } from '@/app/actions/booking.actions';
import {
  getCancellationEstimate,
  type CancellationEstimate,
} from '@/app/actions/customer-refund.actions';

function rupees(value: number): string {
  return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

export default function CancelBookingButton({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showReason, setShowReason] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<CancellationEstimate | null>(null);

  // GOLIVE-13b: show the customer an estimated refund before they confirm.
  useEffect(() => {
    if (!showReason) return;
    let cancelled = false;
    getCancellationEstimate(bookingId).then((result) => {
      if (!cancelled) setEstimate(result);
    });
    return () => {
      cancelled = true;
    };
  }, [showReason, bookingId]);

  if (!showReason) {
    return (
      <button
        type="button"
        onClick={() => setShowReason(true)}
        className="focus-ring rounded-lg border border-red-200 px-2.5 py-1.5 text-[12px] font-semibold text-red-600 transition hover:bg-red-50"
      >
        Cancel
      </button>
    );
  }

  function handleConfirm() {
    setError(null);

    if (!reason.trim()) {
      setError('Please provide a reason.');
      return;
    }

    startTransition(async () => {
      try {
        await cancelMyBooking({ id: bookingId, reason: reason.trim() });
        router.refresh();
        setShowReason(false);
        setReason('');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to cancel booking');
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      {error && <p className="text-[11px] text-red-600">{error}</p>}
      {estimate && (
        <div className="max-w-[260px] rounded-lg bg-mist px-2.5 py-2 text-right text-[11px] leading-snug text-ink/70">
          {estimate.paidAmount > 0 ? (
            <>
              <p>
                You paid {rupees(estimate.paidAmount)}. Estimated refund if you cancel now:{' '}
                <strong className="text-deep">
                  {rupees(estimate.amount)}
                  {estimate.percent > 0 && estimate.percent < 100 ? ` (${estimate.percent}%)` : ''}
                </strong>
                .
              </p>
              <p className="mt-1">
                This is an estimate. Our team confirms the final amount after cancellation and
                sends it to your original payment method.{' '}
                <Link href="/refund-policy" className="underline">
                  Refund policy
                </Link>
              </p>
            </>
          ) : (
            <p>No payment has been made for this booking, so there is nothing to refund.</p>
          )}
        </div>
      )}
      <input
        type="text"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason for cancellation"
        className="focus-ring w-48 rounded-lg border border-deep/15 px-2.5 py-1.5 text-[12px] text-deep outline-none"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setShowReason(false)}
          className="focus-ring rounded-lg border border-deep/15 px-2.5 py-1.5 text-[12px] font-semibold text-deep transition hover:bg-mist"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isPending}
          className="focus-ring rounded-lg border border-red-200 px-2.5 py-1.5 text-[12px] font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
        >
          {isPending ? 'Cancelling...' : 'Confirm Cancel'}
        </button>
      </div>
    </div>
  );
}
