// ROOT PATH: src/app/admin/reviews/page.tsx
// GOLIVE-15 — admin queue of customer reviews. New reviews are 'pending' until
// published here. POLICY: moderate for abuse, spam, or "not about this stay"
// only — never because a review is low or critical. Hiding bad ratings is
// misleading to customers and against consumer-protection rules.

import Link from 'next/link';
import { listReviewsAdmin, type ReviewStatus } from '@/app/actions/review.actions';
import StarRow from '@/components/reviews/StarRow';
import ReviewModerationButtons from '@/components/reviews/ReviewModerationButtons';

const TABS: { value: ReviewStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'published', label: 'Published' },
  { value: 'rejected', label: 'Rejected' },
];

function formatDate(value: string): string {
  return new Date(value).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const current = (TABS.find((t) => t.value === status)?.value ?? 'pending') as ReviewStatus;

  const result = await listReviewsAdmin(current);
  const reviews = result.success ? result.data : [];

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-deep">Reviews</h1>
          <p className="mt-2 max-w-xl text-[14px] text-ink/60">
            Publish genuine reviews. Reject only abuse, spam or reviews that are not about the
            stay. Never reject a review just because the rating is low.
          </p>
        </div>
        <Link
          href="/admin"
          className="focus-ring rounded-full border border-deep/15 px-4 py-2 text-[13px] font-semibold text-deep transition hover:bg-mist"
        >
          Back to Dashboard
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <Link
            key={tab.value}
            href={`/admin/reviews?status=${tab.value}`}
            className={`focus-ring rounded-full px-4 py-1.5 text-[13px] font-semibold ${
              tab.value === current
                ? 'bg-deep text-cream'
                : 'border border-deep/15 text-deep hover:bg-mist'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {!result.success && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          Could not load reviews: {result.error}
        </p>
      )}

      {result.success && reviews.length === 0 && (
        <p className="rounded-2xl border border-dashed border-deep/15 bg-mist-2 px-4 py-10 text-center text-[13px] text-ink/55">
          No {current} reviews.
        </p>
      )}

      <ul className="space-y-3">
        {reviews.map((review) => (
          <li key={review.id} className="rounded-2xl border border-deep/15 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-heading text-[14px] font-semibold text-deep">{review.hotelName}</p>
              <StarRow rating={review.rating} />
            </div>
            <p className="mt-0.5 text-[12px] text-ink/50">
              {review.reviewerLabel}
              {review.bookingNumber ? ` · Booking ${review.bookingNumber}` : ''} ·{' '}
              {formatDate(review.createdAt)}
            </p>

            {review.title && (
              <p className="mt-2 text-[14px] font-semibold text-deep">{review.title}</p>
            )}
            {review.comment && (
              <p className="mt-1 whitespace-pre-line text-[13px] leading-relaxed text-ink/70">
                {review.comment}
              </p>
            )}
            {!review.title && !review.comment && (
              <p className="mt-2 text-[12px] italic text-ink/45">Rating only, no text.</p>
            )}

            {review.status === 'rejected' && review.rejectionReason && (
              <p className="mt-2 text-[12px] text-red-600">Rejected: {review.rejectionReason}</p>
            )}

            <ReviewModerationButtons id={review.id} status={review.status} />
          </li>
        ))}
      </ul>
    </div>
  );
}
