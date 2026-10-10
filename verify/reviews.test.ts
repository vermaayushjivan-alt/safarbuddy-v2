import { describe, expect, it } from 'vitest';
import { isReviewable, todayIST } from '@/lib/reviews/eligibility';
import { reviewerDisplayName } from '@/lib/reviews/display-name';

const base = { booking_type: 'hotel', status: 'confirmed', check_out_date: '2026-10-05' };

describe('isReviewable', () => {
  it('completed hotel booking -> yes', () => {
    expect(isReviewable({ ...base, status: 'completed', check_out_date: null }, '2026-10-01')).toBe(true);
  });
  it('confirmed and check-out day reached -> yes', () => {
    expect(isReviewable(base, '2026-10-05')).toBe(true);
    expect(isReviewable(base, '2026-10-09')).toBe(true);
  });
  it('confirmed but stay not over -> no', () => {
    expect(isReviewable(base, '2026-10-04')).toBe(false);
  });
  it('confirmed with no check-out date -> no', () => {
    expect(isReviewable({ ...base, check_out_date: null }, '2026-10-09')).toBe(false);
  });
  it('cancelled or pending -> never', () => {
    expect(isReviewable({ ...base, status: 'cancelled' }, '2026-12-01')).toBe(false);
    expect(isReviewable({ ...base, status: 'pending' }, '2026-12-01')).toBe(false);
  });
  it('package bookings are not reviewable yet', () => {
    expect(isReviewable({ ...base, booking_type: 'package' }, '2026-12-01')).toBe(false);
  });
});

describe('todayIST', () => {
  it('returns the Indian calendar date', () => {
    // 20:00 UTC on the 9th is already 01:30 on the 10th in India
    expect(todayIST(new Date('2026-10-09T20:00:00Z'))).toBe('2026-10-10');
  });
});

describe('reviewerDisplayName', () => {
  it('first name + last initial', () => {
    expect(reviewerDisplayName('Ayush Jivan Verma', false)).toBe('Ayush V.');
  });
  it('single name stays as is', () => {
    expect(reviewerDisplayName('Priya', false)).toBe('Priya');
  });
  it('deleted / empty -> generic', () => {
    expect(reviewerDisplayName('Deleted user', false)).toBe('SafarBuddy guest');
    expect(reviewerDisplayName(null, false)).toBe('SafarBuddy guest');
    expect(reviewerDisplayName('Ayush Verma', true)).toBe('SafarBuddy guest');
  });
});
