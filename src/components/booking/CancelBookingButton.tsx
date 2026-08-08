'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { cancelMyBooking } from '@/app/actions/booking.actions';

export default function CancelBookingButton({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showReason, setShowReason] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

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
