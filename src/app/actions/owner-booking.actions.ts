'use server';

// CHAT-01 prerequisite — the hotel_owner surface had NO bookings view
// at all before this (confirmed by listing src/app/hotel-owner/ this
// session: only images/ and the property page existed). A chat link
// needs somewhere to live, so this adds the minimum needed: a plain
// list, not a full booking-management page (no cancel/confirm actions
// here — those remain admin-only, unchanged, in booking.actions.ts).
//
// Follows the same requireOwnerVendor() pattern as every other
// owner-*.actions.ts file this project has (owner-context.ts) —
// resolves the CALLER's own vendor, never trusts a caller-supplied
// vendorId.

import { requireOwnerVendor } from '@/lib/auth/owner-context';
import { BookingRepository } from '@/lib/repositories/booking.repository';
import { runAction, type ActionResult } from '@/lib/actions/action-result';

export async function getMyHotelBookings(
  page: number = 1
): Promise<ActionResult<Awaited<ReturnType<BookingRepository['getBookingsByVendorId']>>>> {
  return runAction(async () => {
    const { vendor, supabase } = await requireOwnerVendor();
    const bookingRepo = new BookingRepository(supabase);
    return bookingRepo.getBookingsByVendorId(vendor.id, page, 20);
  });
}

