'use server';

// ROOT PATH: src/app/actions/review.actions.ts
// GOLIVE-15 — customer reviews for hotel stays.
//
// reviews is service-role only (RULE 24, see 042_golive15_reviews.sql), so every
// read/write goes through here. Who the caller is, whether the stay is over and
// whether they own the booking are decided on the SERVER on every call.
// A new review is 'pending'; it is public only after an admin publishes it.
// Staff = admin or super_admin.

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { getAuthUser, resolvePublicUserId, getUserRoles } from '@/lib/auth/session';
import { BookingRepository } from '@/lib/repositories/booking.repository';
import { runAction, type ActionResult } from '@/lib/actions/action-result';
import { checkRateLimit, tooManyRequestsMessage } from '@/lib/security/rate-limit';
import { isReviewable } from '@/lib/reviews/eligibility';
import { reviewerDisplayName } from '@/lib/reviews/display-name';

export type ReviewStatus = 'pending' | 'published' | 'rejected';

export interface PublicReview {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  reviewerName: string;
  createdAt: string;
}

export interface ReviewSummary {
  average: number | null;
  count: number;
}

export interface ReviewContext {
  hotelName: string;
  canReview: boolean;
  reason: string | null; // why not, in customer language
  existingStatus: ReviewStatus | null;
}

export interface AdminReviewRow {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  status: ReviewStatus;
  rejectionReason: string | null;
  createdAt: string;
  hotelName: string;
  reviewerLabel: string;
  bookingNumber: string | null;
}

const submitSchema = z.object({
  bookingId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().max(100).optional(),
  comment: z.string().trim().max(1500).optional(),
});

const moderateSchema = z.object({
  id: z.string().uuid(),
  decision: z.enum(['published', 'rejected']),
  reason: z.string().trim().max(300).optional(),
});

/* -------------------------------------------------------------------------- */
/* Caller                                                                     */
/* -------------------------------------------------------------------------- */

async function getCaller() {
  const authUser = await getAuthUser();
  if (!authUser) throw new Error('UNAUTHENTICATED');

  const supabase = await createClient();
  const userRowId = await resolvePublicUserId(supabase, authUser.id);
  const roles = await getUserRoles(userRowId);
  const isStaff = roles.includes('admin') || roles.includes('super_admin');

  return { supabase, userRowId, isStaff };
}

/* -------------------------------------------------------------------------- */
/* Customer                                                                   */
/* -------------------------------------------------------------------------- */

/** Can this customer review this booking, and what is the state of any review? */
export async function getReviewContext(
  bookingId: string
): Promise<ActionResult<ReviewContext>> {
  return runAction(async () => {
    const caller = await getCaller();
    const id = z.string().uuid().parse(bookingId);

    const booking = await new BookingRepository(caller.supabase).getBookingById(id);
    if (!booking || booking.customer_id !== caller.userRowId) {
      throw new Error('Booking not found');
    }

    const admin = createServiceRoleClient();

    let hotelName = 'your stay';
    if (booking.hotel_id) {
      const { data } = await admin
        .from('hotels')
        .select('hotel_name')
        .eq('id', booking.hotel_id)
        .maybeSingle();
      if (data?.hotel_name) hotelName = data.hotel_name as string;
    }

    const { data: existing } = await admin
      .from('reviews')
      .select('status')
      .eq('booking_id', id)
      .maybeSingle();

    if (existing) {
      return {
        hotelName,
        canReview: false,
        reason: 'You have already reviewed this stay.',
        existingStatus: existing.status as ReviewStatus,
      };
    }

    if (booking.booking_type !== 'hotel' || !booking.hotel_id) {
      return {
        hotelName,
        canReview: false,
        reason: 'Only hotel stays can be reviewed right now.',
        existingStatus: null,
      };
    }

    if (!isReviewable(booking)) {
      return {
        hotelName,
        canReview: false,
        reason: 'You can review your stay after check-out.',
        existingStatus: null,
      };
    }

    return { hotelName, canReview: true, reason: null, existingStatus: null };
  });
}

export async function submitReview(input: {
  bookingId: string;
  rating: number;
  title?: string;
  comment?: string;
}): Promise<ActionResult<{ submitted: true }>> {
  return runAction(async () => {
    const caller = await getCaller();

    const limit = await checkRateLimit('review-submit', caller.userRowId, {
      limit: 5,
      windowSeconds: 3_600,
    });
    if (!limit.allowed) {
      throw new Error(tooManyRequestsMessage(limit.retryAfterSeconds, 'review attempts'));
    }

    const parsed = submitSchema.parse(input);

    const booking = await new BookingRepository(caller.supabase).getBookingById(
      parsed.bookingId
    );
    if (!booking || booking.customer_id !== caller.userRowId) {
      throw new Error('Booking not found');
    }
    if (booking.booking_type !== 'hotel' || !booking.hotel_id) {
      throw new Error('Only hotel stays can be reviewed right now.');
    }
    if (!isReviewable(booking)) {
      throw new Error('You can review your stay after check-out.');
    }

    const admin = createServiceRoleClient();
    const { error } = await admin.from('reviews').insert({
      booking_id: parsed.bookingId,
      hotel_id: booking.hotel_id,
      user_id: caller.userRowId,
      rating: parsed.rating,
      title: parsed.title ? parsed.title : null,
      comment: parsed.comment ? parsed.comment : null,
      status: 'pending',
    });

    if (error) {
      if (error.code === '23505') throw new Error('You have already reviewed this stay.');
      console.error('[reviews] insert failed', error);
      throw new Error('We could not save your review right now. Please try again.');
    }

    revalidatePath('/admin/reviews');
    revalidatePath('/dashboard/bookings');
    return { submitted: true as const };
  });
}

/** For the My Bookings page: review status per booking id (missing = not reviewed). */
export async function getMyReviewStatuses(
  bookingIds: string[]
): Promise<Record<string, ReviewStatus>> {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return {};

    const ids = z.array(z.string().uuid()).max(50).parse(bookingIds);
    if (ids.length === 0) return {};

    const admin = createServiceRoleClient();
    const userId = await resolvePublicUserId(admin, authUser.id);

    const { data, error } = await admin
      .from('reviews')
      .select('booking_id, status')
      .eq('user_id', userId)
      .in('booking_id', ids);
    if (error) throw error;

    const result: Record<string, ReviewStatus> = {};
    for (const row of data ?? []) {
      result[row.booking_id as string] = row.status as ReviewStatus;
    }
    return result;
  } catch (err) {
    console.error('[reviews] getMyReviewStatuses failed', err);
    return {};
  }
}

/* -------------------------------------------------------------------------- */
/* Public (hotel page)                                                        */
/* -------------------------------------------------------------------------- */

export async function getHotelReviewSummary(hotelId: string): Promise<ReviewSummary> {
  try {
    const id = z.string().uuid().parse(hotelId);
    const admin = createServiceRoleClient();

    const { data, error } = await admin.rpc('hotel_review_summary', { p_hotel_id: id });
    if (error) throw error;

    const row = (Array.isArray(data) ? data[0] : data) as
      | { average_rating: number | string | null; review_count: number | string }
      | undefined;

    const count = Number(row?.review_count ?? 0);
    const average = row?.average_rating != null ? Number(row.average_rating) : null;
    return { average: count > 0 ? average : null, count };
  } catch (err) {
    // Display-only: a hotel page must never break because of reviews.
    console.error('[reviews] getHotelReviewSummary failed', err);
    return { average: null, count: 0 };
  }
}

export async function getHotelReviews(
  hotelId: string,
  limit: number = 10
): Promise<PublicReview[]> {
  try {
    const id = z.string().uuid().parse(hotelId);
    const max = Math.min(Math.max(1, limit), 50);
    const admin = createServiceRoleClient();

    const { data, error } = await admin
      .from('reviews')
      .select('id, user_id, rating, title, comment, created_at')
      .eq('hotel_id', id)
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(max);
    if (error) throw error;

    const rows = data ?? [];
    if (rows.length === 0) return [];

    const userIds = [...new Set(rows.map((r) => r.user_id as string))];
    const { data: users } = await admin
      .from('users')
      .select('id, full_name, deleted_at')
      .in('id', userIds);

    const names = new Map<string, string>();
    for (const u of (users ?? []) as Array<Record<string, unknown>>) {
      names.set(
        u.id as string,
        reviewerDisplayName(
          typeof u.full_name === 'string' ? u.full_name : null,
          u.deleted_at != null
        )
      );
    }

    // Only these fields ever leave the server: no user id, no email.
    return rows.map((r) => ({
      id: r.id as string,
      rating: Number(r.rating),
      title: (r.title as string | null) ?? null,
      comment: (r.comment as string | null) ?? null,
      reviewerName: names.get(r.user_id as string) ?? 'SafarBuddy guest',
      createdAt: r.created_at as string,
    }));
  } catch (err) {
    console.error('[reviews] getHotelReviews failed', err);
    return [];
  }
}

/* -------------------------------------------------------------------------- */
/* Admin                                                                      */
/* -------------------------------------------------------------------------- */

export async function listReviewsAdmin(
  status: ReviewStatus = 'pending'
): Promise<ActionResult<AdminReviewRow[]>> {
  return runAction(async () => {
    const caller = await getCaller();
    if (!caller.isStaff) throw new Error('FORBIDDEN');

    const admin = createServiceRoleClient();
    const { data, error } = await admin
      .from('reviews')
      .select(
        'id, booking_id, hotel_id, user_id, rating, title, comment, status, rejection_reason, created_at'
      )
      .eq('status', status)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw error;

    const rows = data ?? [];
    if (rows.length === 0) return [];

    const hotelIds = [...new Set(rows.map((r) => r.hotel_id as string))];
    const userIds = [...new Set(rows.map((r) => r.user_id as string))];
    const bookingIds = [...new Set(rows.map((r) => r.booking_id as string))];

    const [hotelsRes, usersRes, bookingsRes] = await Promise.all([
      admin.from('hotels').select('id, hotel_name').in('id', hotelIds),
      admin.from('users').select('id, full_name, email').in('id', userIds),
      admin.from('bookings').select('id, booking_number').in('id', bookingIds),
    ]);

    const hotelNames = new Map(
      (hotelsRes.data ?? []).map((h) => [h.id as string, h.hotel_name as string])
    );
    const reviewerLabels = new Map<string, string>();
    for (const u of (usersRes.data ?? []) as Array<Record<string, unknown>>) {
      const label =
        (typeof u.full_name === 'string' && u.full_name) ||
        (typeof u.email === 'string' && u.email) ||
        'Unknown';
      reviewerLabels.set(u.id as string, label);
    }
    const bookingNumbers = new Map(
      (bookingsRes.data ?? []).map((b) => [b.id as string, b.booking_number as string])
    );

    return rows.map((r) => ({
      id: r.id as string,
      rating: Number(r.rating),
      title: (r.title as string | null) ?? null,
      comment: (r.comment as string | null) ?? null,
      status: r.status as ReviewStatus,
      rejectionReason: (r.rejection_reason as string | null) ?? null,
      createdAt: r.created_at as string,
      hotelName: hotelNames.get(r.hotel_id as string) ?? 'Unknown hotel',
      reviewerLabel: reviewerLabels.get(r.user_id as string) ?? 'Unknown',
      bookingNumber: bookingNumbers.get(r.booking_id as string) ?? null,
    }));
  });
}

export async function moderateReview(input: {
  id: string;
  decision: 'published' | 'rejected';
  reason?: string;
}): Promise<ActionResult<{ done: true }>> {
  return runAction(async () => {
    const caller = await getCaller();
    if (!caller.isStaff) throw new Error('FORBIDDEN');

    const parsed = moderateSchema.parse(input);
    if (parsed.decision === 'rejected' && !parsed.reason) {
      throw new Error('Give a short reason when rejecting a review.');
    }

    const admin = createServiceRoleClient();
    const { error } = await admin
      .from('reviews')
      .update({
        status: parsed.decision,
        rejection_reason: parsed.decision === 'rejected' ? parsed.reason : null,
        moderated_by: caller.userRowId,
        moderated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', parsed.id);

    if (error) {
      console.error('[reviews] moderate failed', error);
      throw new Error('Could not update this review.');
    }

    revalidatePath('/admin/reviews');
    return { done: true as const };
  });
}
