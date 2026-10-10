// ROOT PATH: src/app/dashboard/bookings/[id]/review/page.tsx
// GOLIVE-15 — customer "Rate your stay" page. Same auth/ownership pattern as
// the chat and invoice pages next to it; getReviewContext() re-checks
// ownership and eligibility on the server.

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth/session';
import { getReviewContext } from '@/app/actions/review.actions';
import ReviewForm from '@/components/reviews/ReviewForm';
import { toSafeErrorMessage } from '@/lib/actions/action-result';

export default async function ReviewBookingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const authUser = await getAuthUser();
  if (!authUser) redirect('/login');

  const result = await getReviewContext(id);

  return (
    <div className="mx-auto max-w-xl px-6 py-12">
      <Link
        href="/dashboard/bookings"
        className="focus-ring mb-6 inline-block text-[13px] font-semibold text-deep hover:underline"
      >
        ← My bookings
      </Link>

      <h1 className="font-display text-2xl text-deep">Rate your stay</h1>

      {!result.success ? (
        <p className="mt-4 text-[14px] text-ink/60">{toSafeErrorMessage(result.error)}</p>
      ) : result.data.canReview ? (
        <div className="mt-6">
          <ReviewForm bookingId={id} hotelName={result.data.hotelName} />
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-deep/15 bg-white p-5 text-[14px] text-ink/70">
          <p>{result.data.reason}</p>
          {result.data.existingStatus === 'pending' && (
            <p className="mt-2 text-[13px] text-ink/55">
              Your review is waiting for a quick check by our team.
            </p>
          )}
          {result.data.existingStatus === 'rejected' && (
            <p className="mt-2 text-[13px] text-ink/55">
              This review was not published because it did not meet our review guidelines.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
