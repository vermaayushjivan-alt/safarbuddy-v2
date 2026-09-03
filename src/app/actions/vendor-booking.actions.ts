"use server";

// VENDOR-BOOKING-01: read-only booking visibility for vendor/hotel_owner
// accounts, closing the "vendor-facing booking access" gap named in
// PROJECT_STATUS.md's Booking deferred-scope list.
//
// Deliberately read-only for this first pass: a vendor can see their
// own bookings (dates, guests, price, status) but cannot confirm/
// cancel/complete them here — that stays admin-only
// (booking.actions.ts's *Admin actions) until a vendor-write workflow
// is explicitly scoped and audited. No schema change: public.bookings
// already has a vendor_id column populated at booking-creation time
// (see booking.actions.ts createBooking()), so this is purely a new
// read path scoped by that existing column.

import { createClient } from "@/lib/supabase/server";
import { requireVendorContext } from "@/lib/auth/vendor-context";
import {
  BookingRepository,
  type BookingStatus,
} from "@/lib/repositories/booking.repository";

export async function getMyVendorBookings(
  page: number = 1,
  limit: number = 20,
  status?: BookingStatus
) {
  const { vendor } = await requireVendorContext();

  const supabase = await createClient();
  const repo = new BookingRepository(supabase);

  return repo.getBookingsByVendorId(vendor.id, page, limit, status);
}

