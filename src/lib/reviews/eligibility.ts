// ROOT PATH: src/lib/reviews/eligibility.ts
// GOLIVE-15 — pure helpers (no I/O, no imports): who may review, and today's
// date in India. Unit-tested in verify/reviews.test.ts.

export interface ReviewableBooking {
  booking_type: string;
  status: string;
  check_out_date: string | null; // YYYY-MM-DD
}

/** Today's date (YYYY-MM-DD) in Indian Standard Time. */
export function todayIST(now: Date = new Date()): string {
  return now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

/**
 * A hotel stay can be reviewed once it is over: either an admin marked the
 * booking completed, or it is confirmed and the check-out day has arrived.
 * Cancelled / pending bookings can never be reviewed.
 */
export function isReviewable(booking: ReviewableBooking, today: string = todayIST()): boolean {
  if (booking.booking_type !== 'hotel') return false;
  if (booking.status === 'completed') return true;
  if (booking.status === 'confirmed' && booking.check_out_date) {
    return booking.check_out_date <= today;
  }
  return false;
}
