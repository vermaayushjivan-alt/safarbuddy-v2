// ROOT PATH: src/app/actions/hotel-facility.actions.ts
'use server';

// MOBILE-03: public read of the facilities ("Services & Amenities") linked
// to one hotel, for the public hotel detail page. Both tables are
// publicly readable by RLS (hotel_facilities_public_read /
// hotel_facility_links_public_read in 011_vendor03_hotel_facilities.sql),
// so this uses the normal session client — no service role, no auth.
// Two queries total (links for the hotel + active catalog), no N+1
// (RULE 37). Reuses the existing repositories (RULE 1/9).

import { createClient } from '@/lib/supabase/server';
import {
  HotelFacilityRepository,
  HotelFacilityLinkRepository,
} from '@/lib/repositories/hotel-facility.repository';

export interface PublicHotelFacility {
  id: string;
  code: string;
  label: string;
  category: string;
}

export async function getHotelFacilitiesPublic(
  hotelId: string
): Promise<PublicHotelFacility[]> {
  try {
    const supabase = await createClient();
    const linkRepo = new HotelFacilityLinkRepository(supabase);
    const catalogRepo = new HotelFacilityRepository(supabase);

    const [facilityIds, catalog] = await Promise.all([
      linkRepo.getFacilityIdsForHotel(hotelId),
      catalogRepo.getActiveFacilities(),
    ]);

    if (facilityIds.length === 0) return [];

    const selected = new Set(facilityIds);
    return catalog
      .filter((facility) => selected.has(facility.id))
      .sort((a, b) => a.display_order - b.display_order)
      .map((facility) => ({
        id: facility.id,
        code: facility.code,
        label: facility.label,
        category: facility.category,
      }));
  } catch (error) {
    // Non-fatal for a public page: render without the amenities block
    // rather than failing the whole hotel page. Logged (RULE 38).
    console.error('[hotel-facility] getHotelFacilitiesPublic failed', error);
    return [];
  }
}
