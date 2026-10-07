// GOLIVE-04 — room inventory reservation (fixes overbooking).
//
// Thin TypeScript wrapper over the DB functions created by
// src/db/sql/032_golive04_room_reservation.sql. All counting and locking
// happens inside Postgres (atomic, all-nights-or-nothing); this file only
// calls those functions with the SERVICE-ROLE client (the functions are not
// executable by anon/authenticated) and maps their error codes.
//
// Rules this file follows:
//  * Holding fails CLOSED  — if we cannot prove the room is free, the booking
//    is not allowed to continue.
//  * Releasing fails OPEN  — it never throws, so a cancel never fails because
//    of inventory bookkeeping; the error is logged for manual follow-up.
//  * Both are idempotent per booking (bookings.room_inventory_held flag).

import { createServiceRoleClient } from "@/lib/supabase/server";

export type RoomHoldFailureCode =
  | "SOLD_OUT"
  | "NO_INVENTORY"
  | "INVALID_RANGE"
  | "UNKNOWN";

export class RoomHoldError extends Error {
  readonly code: RoomHoldFailureCode;

  constructor(code: RoomHoldFailureCode, message: string) {
    super(message);
    this.name = "RoomHoldError";
    this.code = code;
  }
}

const USER_MESSAGES: Record<RoomHoldFailureCode, string> = {
  SOLD_OUT:
    "Sorry, this room is sold out for the selected dates. Please choose different dates or another room.",
  NO_INVENTORY:
    "This room is not open for booking on the selected dates. Please choose different dates or another room.",
  INVALID_RANGE:
    "The selected dates are not valid. Please check your check-in and check-out dates.",
  UNKNOWN:
    "We could not reserve this room right now. Please try again in a moment.",
};

function codeFromMessage(message: string): RoomHoldFailureCode {
  if (message.includes("SOLD_OUT")) return "SOLD_OUT";
  if (message.includes("NO_INVENTORY")) return "NO_INVENTORY";
  if (message.includes("INVALID_RANGE")) return "INVALID_RANGE";
  return "UNKNOWN";
}

/**
 * Reserves the booking's room for every night of its stay.
 * Returns true when a hold exists afterwards, false when the booking has
 * nothing to hold (package booking, or hotel booking without a specific room).
 * Throws RoomHoldError when the room cannot be reserved.
 */
export async function holdRoomForBooking(bookingId: string): Promise<boolean> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase.rpc("hold_room_for_booking", {
    p_booking: bookingId,
  });

  if (error) {
    const code = codeFromMessage(error.message ?? "");
    if (code === "UNKNOWN") {
      console.error("[inventory] hold_room_for_booking failed", {
        bookingId,
        code: error.code,
        message: error.message,
      });
    }
    throw new RoomHoldError(code, USER_MESSAGES[code]);
  }

  return data === true;
}

/**
 * Gives the booking's room back. Safe to call any number of times; only the
 * first call after a hold does anything. Never throws.
 */
export async function releaseRoomForBooking(bookingId: string): Promise<boolean> {
  try {
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase.rpc("release_booking_room", {
      p_booking: bookingId,
    });

    if (error) {
      // TODO: alerting (GOLIVE-18). A failed release leaves a room blocked.
      console.error("[inventory] release_booking_room failed — MANUAL CHECK", {
        bookingId,
        code: error.code,
        message: error.message,
      });
      return false;
    }

    return data === true;
  } catch (err) {
    console.error("[inventory] release_booking_room threw — MANUAL CHECK", {
      bookingId,
      message: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

/**
 * Called when a hold was refused right after the booking row was inserted:
 * closes that row so it can never be paid or listed as live. Works for guests
 * too (service-role). Never throws.
 */
export async function abandonBookingAfterHoldFailure(
  bookingId: string,
  reason: string
): Promise<void> {
  try {
    const supabase = createServiceRoleClient();

    const { error } = await supabase
      .from("bookings")
      .update({
        booking_status: "cancelled",
        cancellation_status: "cancelled",
        cancellation_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId)
      .eq("booking_status", "pending");

    if (error) {
      console.error("[inventory] could not close booking after failed hold", {
        bookingId,
        message: error.message,
      });
    }
  } catch (err) {
    console.error("[inventory] abandonBookingAfterHoldFailure threw", {
      bookingId,
      message: err instanceof Error ? err.message : String(err),
    });
  }
}
