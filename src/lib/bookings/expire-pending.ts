// ROOT PATH: src/lib/bookings/expire-pending.ts
// GOLIVE-05 — pending-booking expiry.
//
// A guest who opens checkout and walks away leaves a "pending" booking that,
// since GOLIVE-04, also holds a room. This job closes such bookings and gives
// the room back. Run by the same cron as payment reconciliation, AFTER it (so
// payments Cashfree has expired are already closed and no longer block).
//
// A booking is expired only when ALL of these hold:
//   * booking_status = 'pending' and older than BOOKING.PENDING_EXPIRY_MINUTES
//   * it has NO payment that is 'pending', 'success' or refunded
//     (a failed/cancelled-only payment history is fine to expire)
// The cancel itself is a conditional UPDATE (still 'pending'), so a webhook
// that confirms the booking at the same moment simply wins. The room is
// released only if the cancel actually happened. Release is idempotent.
//
// Per-booking failures are counted and logged, never stop the run (RULE 38).

import { BOOKING } from "@/lib/config/constants";
import { BookingRepository } from "@/lib/repositories/booking.repository";
import { PaymentRepository } from "@/lib/repositories/payment.repository";
import type { SupabaseClientType } from "@/lib/repositories/types";
import { releaseRoomForBooking } from "@/lib/inventory/room-reservation";

export const EXPIRY_REASON = "Payment not completed in time";

export interface ExpireSummary {
  candidates: number;
  skippedLivePayment: number;
  expired: number;
  roomsReleased: number;
  errors: number;
}

export async function expireStalePendingBookings(
  supabase: SupabaseClientType,
  now: Date = new Date()
): Promise<ExpireSummary> {
  const summary: ExpireSummary = {
    candidates: 0,
    skippedLivePayment: 0,
    expired: 0,
    roomsReleased: 0,
    errors: 0,
  };

  try {
    const bookingRepo = new BookingRepository(supabase);
    const paymentRepo = new PaymentRepository(supabase);

    const olderThan = new Date(
      now.getTime() - BOOKING.PENDING_EXPIRY_MINUTES * 60_000
    ).toISOString();

    const ids = await bookingRepo.getExpirablePendingBookingIds(
      olderThan,
      BOOKING.PENDING_EXPIRY_BATCH
    );
    summary.candidates = ids.length;
    if (ids.length === 0) return summary;

    const blocked = await paymentRepo.getBookingIdsWithLivePayments(ids);

    for (const id of ids) {
      if (blocked.has(id)) {
        summary.skippedLivePayment++;
        continue;
      }

      try {
        const cancelled = await bookingRepo.cancelPendingBookingIfStillPending(
          id,
          EXPIRY_REASON
        );
        if (!cancelled) continue; // confirmed/cancelled by someone else meanwhile

        summary.expired++;
        if (await releaseRoomForBooking(id)) summary.roomsReleased++;
      } catch (error) {
        summary.errors++;
        console.error(`[expire-pending] failed for booking ${id}`, error);
        // TODO: alerting (GOLIVE-18).
      }
    }
  } catch (error) {
    summary.errors++;
    console.error("[expire-pending] run failed", error);
    // TODO: alerting (GOLIVE-18).
  }

  return summary;
}
