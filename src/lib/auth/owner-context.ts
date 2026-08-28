import "server-only";

// P0.3 (2026-08-28 session, see ULTRA_PRO_AUDIT.md Section 3 /
// SESSION_HANDOFF_2026-08-28_P0_FIXES.md).
//
// Every existing hotel/room action (hotel.actions.ts, room-type.actions.ts,
// etc.) is admin-only: requireRole(['admin','super_admin']), and takes a
// caller-supplied id with no ownership check at all. That's correct for
// the admin panel (an admin can touch any hotel), but it's the wrong
// contract for a hotel_owner's own self-service onboarding — a
// hotel_owner must ONLY ever be able to read/write their own hotel and
// its own rooms/images/pricing, never anyone else's, no matter what id
// they pass in.
//
// This file is the one place that resolves "who is the currently signed
// in owner, and which vendor/hotel do they actually own" — every
// owner-scoped Server Action (owner-hotel.actions.ts,
// owner-room-type.actions.ts, and future owner-image/owner-pricing
// actions) must go through requireOwnerVendor() and
// assertHotelOwnedByVendor() rather than re-implementing this check
// inline. One helper, one place to fix if the ownership rule ever needs
// to change (Bible Rule 9 — no scattered authorization logic).

import { requireRole } from "@/lib/auth/session";
import { resolvePublicUserId } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  VendorRepository,
  type VendorRecord,
} from "@/lib/repositories/vendor.repository";
import {
  HotelRepository,
  type HotelRecord,
} from "@/lib/repositories/hotel.repository";

/**
 * Requires a signed-in user holding the hotel_owner role (admin/
 * super_admin also pass, matching every other owner-area layout's
 * requireRole allowlist — see src/app/hotel-owner/layout.tsx), then
 * resolves their vendor row.
 *
 * Throws:
 * - UNAUTHENTICATED / FORBIDDEN — same as requireRole().
 * - NO_VENDOR_FOR_OWNER — the signed-in user has the hotel_owner role
 *   but no vendors row references them yet. In normal use this should
 *   not happen (submitPropertyListing() always creates the vendor
 *   before granting the role), but it's surfaced as a distinct,
 *   catchable error rather than silently returning someone else's
 *   vendor or crashing with a null-reference deeper in the caller.
 */
export async function requireOwnerVendor(): Promise<{
  vendor: VendorRecord;
  ownerUserId: string;
  supabase: Awaited<ReturnType<typeof createClient>>;
}> {
  const current = await requireRole(["hotel_owner", "admin", "super_admin"]);

  const supabase = await createClient();
  const ownerUserId = await resolvePublicUserId(supabase, current.id);

  const vendorRepo = new VendorRepository(supabase);
  const vendor = await vendorRepo.getVendorByOwnerUserId(ownerUserId);

  if (!vendor) {
    throw new Error("NO_VENDOR_FOR_OWNER");
  }

  return { vendor, ownerUserId, supabase };
}

/**
 * Loads a hotel and verifies it belongs to the given vendor. This is the
 * ownership gate every owner-scoped hotel/room/image/pricing action must
 * call before doing anything else with a caller-supplied hotelId.
 *
 * Throws FORBIDDEN for both "hotel does not exist" and "hotel belongs to
 * someone else" — deliberately the same error for both, so a hotel_owner
 * probing other hotels' ids can't distinguish "not found" from "not
 * yours" (same reasoning getBookableRoomById already uses for
 * cross-hotel room lookups).
 */
export async function assertHotelOwnedByVendor(
  hotelRepo: HotelRepository,
  hotelId: string,
  vendorId: string
): Promise<HotelRecord> {
  const hotel = await hotelRepo.getHotelById(hotelId);

  if (!hotel || hotel.vendor_id !== vendorId) {
    throw new Error("FORBIDDEN");
  }

  return hotel;
}
