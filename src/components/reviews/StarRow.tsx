import { Star } from 'lucide-react';

// GOLIVE-15 — read-only star display (works in server and client components).
export default function StarRow({ rating, size = 14 }: { rating: number; size?: number }) {
  const rounded = Math.round(rating);
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          aria-hidden
          className={n <= rounded ? 'fill-orange text-orange' : 'fill-transparent text-ink/20'}
        />
      ))}
    </span>
  );
}
