'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { moderateReview } from '@/app/actions/review.actions';

// GOLIVE-15 — admin: publish or reject one review.
export default function ReviewModerationButtons({
  id,
  status,
}: {
  id: string;
  status: 'pending' | 'published' | 'rejected';
}) {
  const router = useRouter();
  const [working, setWorking] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function decide(decision: 'published' | 'rejected') {
    setError(null);
    setWorking(true);
    try {
      const result = await moderateReview({
        id,
        decision,
        reason: decision === 'rejected' ? reason : undefined,
      });
      if (!result.success) {
        setError(result.error ?? 'Could not update this review.');
        return;
      }
      setRejecting(false);
      setReason('');
      router.refresh();
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="mt-3 space-y-2">
      {error && <p className="text-[12px] text-red-600">{error}</p>}

      {rejecting ? (
        <div className="space-y-2">
          <input
            type="text"
            value={reason}
            maxLength={300}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (e.g. abusive language, not about this stay)"
            className="focus-ring w-full rounded-lg border border-deep/15 px-3 py-2 text-[13px]"
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={working || reason.trim().length === 0}
              onClick={() => decide('rejected')}
              className="focus-ring rounded-lg bg-red-600 px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-50"
            >
              Confirm reject
            </button>
            <button
              type="button"
              onClick={() => setRejecting(false)}
              className="focus-ring rounded-lg border border-deep/15 px-3 py-1.5 text-[12px] font-semibold text-deep"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          {status !== 'published' && (
            <button
              type="button"
              disabled={working}
              onClick={() => decide('published')}
              className="focus-ring rounded-lg bg-deep px-3 py-1.5 text-[12px] font-semibold text-cream disabled:opacity-50"
            >
              Publish
            </button>
          )}
          {status !== 'rejected' && (
            <button
              type="button"
              disabled={working}
              onClick={() => setRejecting(true)}
              className="focus-ring rounded-lg border border-red-300 px-3 py-1.5 text-[12px] font-semibold text-red-700 disabled:opacity-50"
            >
              Reject
            </button>
          )}
        </div>
      )}
    </div>
  );
}
