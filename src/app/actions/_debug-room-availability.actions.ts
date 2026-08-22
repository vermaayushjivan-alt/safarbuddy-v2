// src/app/actions/_debug-room-availability.actions.ts
//
// TEMPORARY DIAGNOSTIC — ROOM-05. Delete this file (and the matching
// debug page) once the empty-room-picker issue is root-caused and
// fixed. Purely read-only: does not write to any table, does not
// change any schema, does not touch hotel_rooms / room_inventory /
// room_prices in any way other than SELECT. Uses the exact same
// repositories and column names as getBookableRoomsForHotel() in
// room-availability.actions.ts — this file only exists to expose every
// intermediate value that function collapses into a single
// available/unavailable boolean.

"use server";

import { createClient } from "@/lib/supabase/server";
import { RoomTypeRepository } from "@/lib/repositories/room-type.repository";
import { RoomInventoryRepository } from "@/lib/repositories/room-inventory.repository";
import { RoomPriceRepository } from "@/lib/repositories/room-price.repository";

export interface RoomDiagnostic {
  room_id: string;
  room_name: string;
  status: string;
  hotel_id: string;

  inventory_rows_found: number;
  inventory_by_date: Record<
    string,
    { available_rooms: number } | "MISSING"
  >;

  price_rows_found: number;
  price_by_date: Record<
    string,
    { final_price: number } | "MISSING"
  >;

  unavailable_reason: string | null;
  would_be_available: boolean;
}

export interface RoomAvailabilityDiagnosticReport {
  hotel_id: string;
  check_in_date: string;
  check_out_date: string;
  nights: string[];

  // Raw count from getRoomTypesByHotel(), before any status filter —
  // if this is 0, the hotel has no hotel_rooms rows at all, or
  // hotel_id doesn't match what's actually stored on those rows.
  total_rooms_for_hotel: number;

  // Count after status === 'active' filter — same filter
  // getBookableRoomsForHotel() applies.
  active_rooms_count: number;

  rooms: RoomDiagnostic[];

  error: string | null;
}

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
  const nights = getStayNights(checkInDate, checkOutDate);

  const report: RoomAvailabilityDiagnosticReport = {
    hotel_id: hotelId,
    check_in_date: checkInDate,
    check_out_date: checkOutDate,
    nights,
    total_rooms_for_hotel: 0,
    active_rooms_count: 0,
    rooms: [],
    error: null,
  };

  if (nights.length === 0) {
    report.error =
      "Invalid date range — check_out_date must be after check_in_date.";
    return report;
  }

  try {
    const supabase = await createClient();

    const roomTypeRepo = new RoomTypeRepository(supabase);
    const inventoryRepo = new RoomInventoryRepository(supabase);
    const priceRepo = new RoomPriceRepository(supabase);

    const allRooms = await roomTypeRepo.getRoomTypesByHotel(hotelId);

    report.total_rooms_for_hotel = allRooms.length;
    report.active_rooms_count = allRooms.filter(
      (room) => room.status === "active"
    ).length;

    for (const room of allRooms) {
      if (room.status !== "active") {
        report.rooms.push({
          room_id: room.id,
          room_name: room.room_name,
          status: room.status,
          hotel_id: room.hotel_id,
          inventory_rows_found: 0,
          inventory_by_date: {},
          price_rows_found: 0,
          price_by_date: {},
          unavailable_reason: `status is "${room.status}", not "active" — excluded before inventory/price were even checked.`,
          would_be_available: false,
        });

        continue;
      }

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

      const inventoryByDateReport: RoomDiagnostic["inventory_by_date"] = {};
      const priceByDateReport: RoomDiagnostic["price_by_date"] = {};

      let unavailableReason: string | null = null;

      for (const night of nights) {
        const inv = inventoryByDate.get(night);

        inventoryByDateReport[night] = inv
          ? { available_rooms: inv.available_rooms }
          : "MISSING";

        if (!unavailableReason && (!inv || inv.available_rooms < 1)) {
          unavailableReason = !inv
            ? `no room_inventory row for ${night}`
            : `available_rooms is ${inv.available_rooms} on ${night}`;
        }

        const rate = priceByDate.get(night);

        priceByDateReport[night] = rate
          ? { final_price: rate.final_price }
          : "MISSING";

        if (!unavailableReason && !rate) {
          unavailableReason = `no room_prices row for ${night}`;
        }
      }

      report.rooms.push({
        room_id: room.id,
        room_name: room.room_name,
        status: room.status,
        hotel_id: room.hotel_id,
        inventory_rows_found: inventoryRows.length,
        inventory_by_date: inventoryByDateReport,
        price_rows_found: priceRows.length,
        price_by_date: priceByDateReport,
        unavailable_reason: unavailableReason,
        would_be_available: unavailableReason === null,
      });
    }
  } catch (err) {
    report.error =
      err instanceof Error ? err.message : String(err);
  }

  return report;
}
