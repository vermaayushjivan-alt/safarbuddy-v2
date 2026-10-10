// ROOT PATH: src/components/public/HotelReviews.tsx
// GOLIVE-15 — public reviews block for the hotel page (server component).
// Shows ONLY published reviews. With none, says so plainly: no made-up rating.

import StarRow from '@/components/reviews/StarRow';
import { getHotelReviewSummary, getHotelReviews } from '@/app/actions/review.actions';

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

export default async function HotelReviews({ hotelId }: { hotelId: string }) {
  const [summary, reviews] = await Promise.all([
    getHotelReviewSummary(hotelId),
    getHotelReviews(hotelId, 10),
  ]);

  return (
    <section aria-labelledby="hotel-reviews-heading" className="mt-8">
      <h2 id="hotel-reviews-heading" className="font-heading text-[16px] font-semibold text-deep">
        Guest reviews
      </h2>

      {summary.count === 0 || summary.average == null ? (
        <p className="mt-2 text-[14px] text-ink/60">
          No reviews yet. Guests who have stayed here can review it from their bookings.
        </p>
      ) : (
        <>
          <div className="mt-2 flex items-center gap-3">
            <span className="font-display text-3xl text-deep">{summary.average.toFixed(1)}</span>
            <div>
              <StarRow rating={summary.average} size={16} />
              <p className="mt-0.5 text-[12px] text-ink/55">
                {summary.count} review{summary.count === 1 ? '' : 's'} from verified stays
              </p>
            </div>
          </div>

          <ul className="mt-4 space-y-3">
            {reviews.map((review) => (
              <li key={review.id} className="rounded-2xl border border-deep/10 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <StarRow rating={review.rating} />
                  <span className="text-[11px] text-ink/45">{formatDate(review.createdAt)}</span>
                </div>
                {review.title && (
                  <p className="mt-2 font-heading text-[14px] font-semibold text-deep">
                    {review.title}
                  </p>
                )}
                {review.comment && (
                  <p className="mt-1 whitespace-pre-line text-[13px] leading-relaxed text-ink/70">
                    {review.comment}
                  </p>
                )}
                <p className="mt-2 text-[12px] text-ink/50">{review.reviewerName}</p>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
