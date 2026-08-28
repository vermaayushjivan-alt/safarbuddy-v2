'use server';

// P0.3 (2026-08-28 session, see ULTRA_PRO_AUDIT.md Section 3 /
// SESSION_HANDOFF_2026-08-28_P0_FIXES.md).
//
// Owner-scoped counterpart to hotel.actions.ts's *Admin actions. Every
// function here resolves the caller's OWN vendor/hotel via
// requireOwnerVendor()/assertHotelOwnedByVendor() (owner-context.ts) —
// it never trusts a hotelId as proof of ownership by itself. Reuses
// HotelRepository directly (same repository the admin actions use), so
// there is exactly one place that knows how to read/write a hotels row —
// only the authorization layer differs between the admin and owner
// surfaces (Bible Rule 9).

import { z } from 'zod';
import {
  requireOwnerVendor,
  assertHotelOwnedByVendor,
} from '@/lib/auth/owner-context';
import { HotelRepository, type HotelRecord } from '@/lib/repositories/hotel.repository';
import {
  runAction,
  emptyToNull,
  type ActionResult,
} from '@/lib/actions/action-result';

// Same numeric bound as hotel.actions.ts's MAX_BOOKING_AMOUNT —
// starting_price feeds the same numeric(10,2) column.
const MAX_STARTING_PRICE = 99_999_999.99;

// Deliberately narrower than admin's hotelInputSchema: an owner may
// describe/price/contact-info their own property, but must never change
// vendor_id, status (admin-only approval gate), is_featured, or
// is_verified via this action.
const ownerHotelUpdateSchema = z.object({
  hotel_name: z.string().min(2, 'Property name is required.'),
  description: z.preprocess(emptyToNull, z.string().nullable().optional()),
  city: z.preprocess(emptyToNull, z.string().nullable().optional()),
  state: z.preprocess(emptyToNull, z.string().nullable().optional()),
  country: z.preprocess(emptyToNull, z.string().nullable().optional()),
  address: z.preprocess(emptyToNull, z.string().nullable().optional()),
  star_rating: z.preprocess(
    emptyToNull,
    z.number().min(0).max(5).nullable().optional()
  ),
  starting_price: z.preprocess(
    emptyToNull,
    z
      .number()
      .min(0)
      .max(MAX_STARTING_PRICE, 'The amount is too large.')
      .nullable()
      .optional()
  ),
  phone: z.preprocess(
    emptyToNull,
    z.string().trim().min(7, 'Enter a valid phone number').max(20).nullable().optional()
  ),
  email: z.preprocess(
    emptyToNull,
    z.string().trim().email('Enter a valid email address').nullable().optional()
  ),
  website: z.preprocess(
    emptyToNull,
    z.string().trim().url('Enter a valid URL, e.g. https://example.com').nullable().optional()
  ),
});

export type OwnerHotelUpdateInput = z.infer<typeof ownerHotelUpdateSchema>;

/**
 * Returns the signed-in owner's own hotel. Assumes one hotel per vendor
 * (matches the current self-service onboarding flow, which creates
 * exactly one hotel per submission) — if multi-property support is ever
 * added, this becomes getMyHotels() returning a list instead.
 */
export async function getMyHotel(): Promise<HotelRecord | null> {
  const { vendor, supabase } = await requireOwnerVendor();
  const hotelRepo = new HotelRepository(supabase);

  const { data, error } = await supabase
    .from('hotels')
    .select('*')
    .eq('vendor_id', vendor.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load your property: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  // Route through getHotelById so the legacy-compat thumbnail/gallery
  // defaults are applied consistently with every other read path.
  return hotelRepo.getHotelById((data as HotelRecord).id);
}

export async function updateMyHotel(
  hotelId: string,
  input: OwnerHotelUpdateInput
): Promise<ActionResult<HotelRecord>> {
  return runAction(async () => {
    const { vendor, supabase } = await requireOwnerVendor();
    const hotelRepo = new HotelRepository(supabase);

    await assertHotelOwnedByVendor(hotelRepo, hotelId, vendor.id);

    const parsed = ownerHotelUpdateSchema.parse(input);

    return hotelRepo.updateHotel(hotelId, parsed);
  });
}
