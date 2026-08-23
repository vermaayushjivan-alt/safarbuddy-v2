// src/app/actions/room-availability.actions.ts
// ROOM-05 Phase J — public, read-only lookup used by the customer
// booking form to show which of a hotel's rooms can actually be booked
// for the dates they picked, and at what price.
//
// This does NOT create or reserve anything — it is a preview only. The
// authoritative check (same inventory/pricing logic) runs again inside
// createBooking() in booking.actions.ts at submit time, so a stale or
// tampered client value here can never bypass server-side validation.
//
// No requireRole() guard: this mirrors the existing public pattern used
// by getHotelBySlug() in hotel.actions.ts — anyone browsing a hotel page
// (logged in or not) needs to see room options before deciding to book.

"use server";

import { createClient } from "@/lib/supabase/server";
import { RoomTypeRepository } from "@/lib/repositories/room-type.repository";
import { RoomInventoryRepository } from "@/lib/repositories/room-inventory.repository";
import { RoomPriceRepository } from "@/lib/repositories/room-price.repository";

export interface BookableRoom {
  room_id: string;
  room_name: string;
  room_type: string;
  bed_type: string | null;
  capacity_adults: number;
  capacity_children: number;
  max_occupancy: number;

  // Total price for the whole stay (sum of each night's final_price),
  // or null if not available/priced — see `available` below.
  total_price: number | null;

  available: boolean;
  unavailable_reason: string | null;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Same night-enumeration rule used by createBooking() in
 * booking.actions.ts (check-in inclusive, check-out exclusive) — kept
 * as a local copy rather than a shared import so this file has no
 * dependency on that "use server" module's internals.
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

export async function getBookableRoomsForHotel(
  hotelId: string,
  checkInDate: string,
  checkOutDate: string
): Promise<BookableRoom[]> {
  if (
    !hotelId ||
    !DATE_PATTERN.test(checkInDate) ||
    !DATE_PATTERN.test(checkOutDate)
  ) {
    throw new Error("Invalid input");
  }

  if (checkOutDate <= checkInDate) {
    throw new Error(
      "check_out_date must be after check_in_date"
    );
  }

  const nights = getStayNights(checkInDate, checkOutDate);

  if (nights.length === 0) {
    throw new Error("Invalid stay duration");
  }

  const supabase = await createClient();

  const roomTypeRepo = new RoomTypeRepository(supabase);
  const inventoryRepo = new RoomInventoryRepository(supabase);
  const priceRepo = new RoomPriceRepository(supabase);

  const rooms = await roomTypeRepo.getRoomTypesByHotel(hotelId);
  const activeRooms = rooms.filter((room) => room.status === "active");

  const results: BookableRoom[] = [];

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

    let available = true;
    let unavailableReason: string | null = null;
    let totalPrice = 0;

    for (const night of nights) {
      const inv = inventoryByDate.get(night);

      if (!inv || inv.available_rooms < 1) {
        available = false;
        unavailableReason = "Not available for the selected dates.";
        break;
      }

      const rate = priceByDate.get(night);

      if (!rate) {
        available = false;
        unavailableReason = "Pricing not configured for the selected dates.";
        break;
      }

      totalPrice += Number(rate.final_price);
    }

    results.push({
      room_id: room.id,
      room_name: room.room_name,
      room_type: room.room_type,
      bed_type: room.bed_type,
      capacity_adults: room.capacity_adults,
      capacity_children: room.capacity_children,
      max_occupancy: room.max_occupancy,

      total_price: available ? totalPrice : null,

      available,
      unavailable_reason: unavailableReason,
    });
  }

  return results;
}
