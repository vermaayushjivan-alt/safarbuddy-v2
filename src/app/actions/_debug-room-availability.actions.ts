// src/app/actions/_debug-room-availability.actions.ts
//
// TEMPORARY DIAGNOSTIC PAGE — ROOM-05. Delete this file (and page.tsx
// and RoomAvailabilityDebugClient.tsx in
// src/app/debug/room-availability/) once the empty-room-picker issue
// is root-caused and fixed. No auth guard intentionally kept minimal
// since this is temporary and read-only, but delete promptly once
// you're done — don't leave a debug route live in production longer
// than needed.
//
// Server action for the diagnostic page. Reuses the same repositories
// and night-enumeration rule as getBookableRoomsForHotel() in
// room-availability.actions.ts, but instead of filtering rooms down to
// the bookable subset, it reports on every active room and every
// reason a room did or didn't make the cut — so the empty-picker bug
// can be seen directly instead of inferred.

"use server";

import { createClient } from "@/lib/supabase/server";
import { RoomTypeRepository } from "@/lib/repositories/room-type.repository";
import { RoomInventoryRepository } from "@/lib/repositories/room-inventory.repository";
import { RoomPriceRepository } from "@/lib/repositories/room-price.repository";

export interface RoomAvailabilityDiagnosticRoom {
  room_id: string;
  room_name: string;
  room_type: string;
  status: string;

  // Per-night breakdown for the requested stay.
  nights_checked: number;
  nights_with_inventory_row: number;
  nights_with_available_rooms: number;
  nights_with_price_row: number;

  bookable: boolean;
  unavailable_reason: string | null;
}

export interface RoomAvailabilityDiagnosticReport {
  hotel_id: string;
  check_in_date: string;
  check_out_date: string;
  nights: string[];

  total_rooms_for_hotel: number;
  active_rooms_count: number;
  bookable_rooms_count: number;

  rooms: RoomAvailabilityDiagnosticRoom[];

  error: string | null;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Same night-enumeration rule used by getBookableRoomsForHotel() in
 * room-availability.actions.ts and createBooking() in
 * booking.actions.ts (check-in inclusive, check-out exclusive) — kept
 * as a local copy rather than a shared import so this debug-only file
 * has no dependency on those "use server" modules' internals.
 */
function getStayNights(
  checkInDate: string,
  checkOutDate: string
): string[] {
  const nights: string[] = [];

  let cursor = new Date(`${checkInDate}T00:00:00Z`);
  const end = new Date(`${checkOutDate}T00:00:00Z`);

  while (cursor < end) {
    nights.push(cursor.toISOString().slice(0, 10));
    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
  }

  return nights;
}

export async function diagnoseRoomAvailability(
  hotelId: string,
  checkInDate: string,
  checkOutDate: string
): Promise<RoomAvailabilityDiagnosticReport> {
  const baseReport: RoomAvailabilityDiagnosticReport = {
    hotel_id: hotelId,
    check_in_date: checkInDate,
    check_out_date: checkOutDate,
    nights: [],
    total_rooms_for_hotel: 0,
    active_rooms_count: 0,
    bookable_rooms_count: 0,
    rooms: [],
    error: null,
  };

  if (
    !hotelId ||
    !DATE_PATTERN.test(checkInDate) ||
    !DATE_PATTERN.test(checkOutDate)
  ) {
    return { ...baseReport, error: "Invalid input." };
  }

  if (checkOutDate <= checkInDate) {
    return {
      ...baseReport,
      error: "check_out_date must be after check_in_date.",
    };
  }

  const nights = getStayNights(checkInDate, checkOutDate);

  if (nights.length === 0) {
    return { ...baseReport, error: "Invalid stay duration." };
  }

  try {
    const supabase = await createClient();

    const roomTypeRepo = new RoomTypeRepository(supabase);
    const inventoryRepo = new RoomInventoryRepository(supabase);
    const priceRepo = new RoomPriceRepository(supabase);

    const allRooms = await roomTypeRepo.getRoomTypesByHotel(hotelId);
    const activeRooms = allRooms.filter((room) => room.status === "active");

    const diagnosticRooms: RoomAvailabilityDiagnosticRoom[] = [];

    for (const room of activeRooms) {
      const [inventoryRows, priceRows] = await Promise.all([
        inventoryRepo.getInventoryForRange(
          room.id,
          nights[0],
          nights[nights.length - 1]
        ),
        priceRepo.getPricesForDateRange(
          room.id,
          nights[0],
          nights[nights.length - 1]
        ),
      ]);

      const inventoryByDate = new Map(
        inventoryRows.map((row) => [row.inventory_date, row])
      );

      const priceByDate = new Map(
        priceRows.map((row) => [row.price_date, row])
      );

      let nightsWithInventoryRow = 0;
      let nightsWithAvailableRooms = 0;
      let nightsWithPriceRow = 0;

      let bookable = true;
      let unavailableReason: string | null = null;

      for (const night of nights) {
        const inv = inventoryByDate.get(night);

        if (inv) {
          nightsWithInventoryRow += 1;

          if (inv.available_rooms >= 1) {
            nightsWithAvailableRooms += 1;
          }
        }

        const rate = priceByDate.get(night);

        if (rate) {
          nightsWithPriceRow += 1;
        }

        if (bookable) {
          if (!inv || inv.available_rooms < 1) {
            bookable = false;
            unavailableReason = "Not available for the selected dates.";
          } else if (!rate) {
            bookable = false;
            unavailableReason =
              "Pricing not configured for the selected dates.";
          }
        }
      }

      diagnosticRooms.push({
        room_id: room.id,
        room_name: room.room_name,
        room_type: room.room_type,
        status: room.status,

        nights_checked: nights.length,
        nights_with_inventory_row: nightsWithInventoryRow,
        nights_with_available_rooms: nightsWithAvailableRooms,
        nights_with_price_row: nightsWithPriceRow,

        bookable,
        unavailable_reason: unavailableReason,
      });
    }

    return {
      ...baseReport,
      nights,
      total_rooms_for_hotel: allRooms.length,
      active_rooms_count: activeRooms.length,
      bookable_rooms_count: diagnosticRooms.filter((r) => r.bookable).length,
      rooms: diagnosticRooms,
    };
  } catch (err) {
    return {
      ...baseReport,
      nights,
      error: err instanceof Error ? err.message : "Unknown error.",
    };
  }
}
  
