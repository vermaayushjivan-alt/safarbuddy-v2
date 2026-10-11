'use server';

// ROOT PATH: src/app/actions/cancel-booking.actions.ts
// Wrapper around cancelMyBooking(). In production Next.js hides the message
// of an error thrown from a Server Action, so the customer only saw a generic
// "Server Components render error". This wrapper catches it ON THE SERVER and
// returns the real message instead. It never throws.

import { cancelMyBooking } from '@/app/actions/booking.actions';

export type CancelBookingResult = { ok: true } | { ok: false; error: string };

function messageOf(err: unknown): string {
  if (err instanceof Error && err.message) {
    if (err.message === 'UNAUTHENTICATED') {
      return 'Please log in again and retry.';
    }
    return err.message;
  }
  // Supabase/PostgREST errors are plain objects, not Error instances.
  if (err && typeof err === 'object') {
    const message = (err as { message?: unknown }).message;
    if (typeof message === 'string' && message) return message;
  }
  return 'Could not cancel the booking. Please try again.';
}

export async function cancelMyBookingSafe(input: {
  id: string;
  reason: string;
}): Promise<CancelBookingResult> {
  try {
    await cancelMyBooking(input);
    return { ok: true };
  } catch (err) {
    console.error('[cancelMyBookingSafe] failed', err);
    return { ok: false, error: messageOf(err) };
  }
}
