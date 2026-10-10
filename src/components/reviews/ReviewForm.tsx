'use client';

// GOLIVE-15 — "Rate your stay" form (customer, after check-out).
// Everyone is asked the same way: we never route only happy guests to a public
// review site. The Google link is shown to every guest after submitting.

import { useState } from 'react';
import Link from 'next/link';
import { Star } from 'lucide-react';
import { submitReview } from '@/app/actions/review.actions';

const LABELS = ['Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

// Optional: your Google Business Profile "write a review" link.
const GOOGLE_REVIEW_URL = process.env.NEXT_PUBLIC_GOOGLE_REVIEW_URL ?? '';

export default function ReviewForm({
  bookingId,
  hotelName,
}: {
  bookingId: string;
  hotelName: string;
}) {
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (rating < 1) {
      setError('Please choose a star rating.');
      return;
    }

    setWorking(true);
    try {
      const result = await submitReview({
        bookingId,
        rating,
        title: title.trim() || undefined,
        comment: comment.trim() || undefined,
      });

      if (!result.success) {
        setError(result.error ?? 'Could not save your review.');
        return;
      }
      setDone(true);
    } finally {
      setWorking(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-5 text-[14px] text-green-800">
        <p className="font-heading font-semibold">Thank you for your review!</p>
        <p className="mt-1">It will appear on the hotel page after a quick check by our team.</p>

        <div className="mt-4 flex flex-wrap gap-3">
          {GOOGLE_REVIEW_URL && (
            <a
              href={GOOGLE_REVIEW_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="focus-ring rounded-full bg-deep px-5 py-2.5 text-[13px] font-semibold text-cream transition hover:bg-deep-2"
            >
              Rate SafarBuddy on Google
            </a>
          )}
          <Link
            href="/dashboard/bookings"
            className="focus-ring rounded-full border border-deep/15 bg-white px-5 py-2.5 text-[13px] font-semibold text-deep transition hover:bg-mist"
          >
            Back to my bookings
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-deep/15 bg-white p-6">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          {error}
        </div>
      )}

      <div>
        <p className="mb-2 text-sm font-semibold text-deep">How was your stay at {hotelName}?</p>
        <div className="flex items-center gap-1" role="radiogroup" aria-label="Star rating">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={`${n} star${n === 1 ? '' : 's'}: ${LABELS[n - 1]}`}
              onClick={() => setRating(n)}
              className="focus-ring rounded p-1"
            >
              <Star
                size={30}
                aria-hidden
                className={n <= rating ? 'fill-orange text-orange' : 'fill-transparent text-ink/25'}
              />
            </button>
          ))}
          {rating > 0 && <span className="ml-2 text-[13px] text-ink/60">{LABELS[rating - 1]}</span>}
        </div>
      </div>

      <div>
        <label htmlFor="review-title" className="mb-1.5 block text-sm font-semibold text-deep">
          Headline <span className="font-normal text-ink/45">(optional)</span>
        </label>
        <input
          id="review-title"
          type="text"
          value={title}
          maxLength={100}
          onChange={(e) => setTitle(e.target.value)}
          className="focus-ring w-full rounded-xl border border-deep/15 bg-white px-4 py-3 text-sm text-deep outline-none"
          placeholder="Sum up your stay"
        />
      </div>

      <div>
        <label htmlFor="review-comment" className="mb-1.5 block text-sm font-semibold text-deep">
          Your review <span className="font-normal text-ink/45">(optional)</span>
        </label>
        <textarea
          id="review-comment"
          value={comment}
          maxLength={1500}
          rows={5}
          onChange={(e) => setComment(e.target.value)}
          className="focus-ring w-full rounded-xl border border-deep/15 bg-white px-4 py-3 text-sm text-deep outline-none"
          placeholder="What did you like? What could be better?"
        />
        <p className="mt-1 text-right text-[11px] text-ink/40">{comment.length}/1500</p>
      </div>

      <button
        type="submit"
        disabled={working}
        className="focus-ring rounded-full bg-deep px-6 py-3 text-sm font-semibold text-cream transition hover:bg-deep-2 disabled:opacity-60"
      >
        {working ? 'Submitting...' : 'Submit review'}
      </button>
    </form>
  );
}
