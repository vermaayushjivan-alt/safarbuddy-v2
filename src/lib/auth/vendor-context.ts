import "server-only";

// VENDOR-BOOKING-01 (vendor-facing booking visibility).
//
// requireOwnerVendor() (owner-context.ts) already resolves "which vendor
// row does the signed-in user own", but it is scoped to the hotel_owner
// self-service write flow (role allowlist: hotel_owner/admin/super_admin)
// and is used by actions that create/update a hotel_owner's own hotel,
// rooms, images and pricing. This file is deliberately separate rather
// than widening that allowlist: it exists only for a read-only view
// (a vendor account — role: 'vendor' — looking at their own bookings),
// so it also accepts the 'vendor' role, which owner-context.ts's write
// path intentionally does not. One helper, one purpose (Bible Rule 9)
// — do not reuse this for anything that writes to a hotel/room/pricing
// row; use requireOwnerVendor() for that.

import { requireRole } from "@/lib/auth/session";
import { resolvePublicUserId } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  VendorRepository,
  type VendorRecord,
} from "@/lib/repositories/vendor.repository";

/**
 * Requires a signed-in user holding the vendor or hotel_owner role
 * (admin/super_admin also pass, matching every other vendor/owner-area
 * layout's requireRole allowlist), then resolves their vendor row.
 *
 * Throws:
 * - UNAUTHENTICATED / FORBIDDEN — same as requireRole().
 * - NO_VENDOR_FOR_OWNER — the signed-in user has an eligible role but
 *   no vendors row references them yet (e.g. an admin/super_admin with
 *   no vendor of their own). Surfaced as a distinct, catchable error
 *   rather than crashing deeper in the caller.
 */
export async function requireVendorContext(): Promise<{
  vendor: VendorRecord;
  ownerUserId: string;
}> {
  const current = await requireRole([
    "vendor",
    "hotel_owner",
    "admin",
    "super_admin",
  ]);

  const supabase = await createClient();
  const ownerUserId = await resolvePublicUserId(supabase, current.id);

  const vendorRepo = new VendorRepository(supabase);
  const vendor = await vendorRepo.getVendorByOwnerUserId(ownerUserId);

  if (!vendor) {
    throw new Error("NO_VENDOR_FOR_OWNER");
  }

  return { vendor, ownerUserId };
}

