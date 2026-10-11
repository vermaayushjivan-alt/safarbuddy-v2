// ROOT PATH: src/lib/hotels/search.ts
// GOLIVE-16 — server-side advanced hotel search for /hotels (sort, budget,
// star category, nearest first, real pagination). Calls the hotels_search SQL
// function (migration 043) and then loads the full hotel records with the same
// "public hotels only" rule as every other public read.
//
// Plain server module (NOT a server action): only the /hotels page calls it,
// so it is not exposed as a public endpoint of its own.

import 'server-only';

import { createClient } from '@/lib/supabase/server';
import { HotelRepository, type HotelRecord } from '@/lib/repositories/hotel.repository';
import type { HotelSearchFilters } from '@/lib/hotels/search-params';

export interface HotelSearchResult {
  hotels: HotelRecord[];
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  error?: string;
}

const NEAR_RADIUS_KM = 100;

export async function searchHotelsAdvanced(input: {
  city: string;
  filters: HotelSearchFilters;
  page: number;
  pageSize?: number;
}): Promise<HotelSearchResult> {
  const pageSize = Math.min(Math.max(1, input.pageSize ?? 16), 50);
  const page = Math.max(1, Math.floor(input.page) || 1);
  const { filters } = input;

  const empty: HotelSearchResult = {
    hotels: [],
    total: 0,
    totalPages: 1,
    hasNext: false,
    hasPrev: page > 1,
  };

  try {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc('hotels_search', {
      p_city: input.city.trim() || null,
      p_min_price: filters.minPrice,
      p_max_price: filters.maxPrice,
      p_min_stars: filters.minStars,
      p_sort: filters.sort,
      p_lat: filters.nearMe?.lat ?? null,
      p_lng: filters.nearMe?.lng ?? null,
      p_radius_km: filters.nearMe ? NEAR_RADIUS_KM : null,
      p_limit: pageSize,
      p_offset: (page - 1) * pageSize,
    });
    if (error) throw error;

    const rows = (data ?? []) as Array<{
      hotel_id: string;
      distance_km: number | null;
      total_count: number | string;
    }>;
    if (rows.length === 0) return empty;

    const total = Number(rows[0].total_count) || rows.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    const records = await new HotelRepository(supabase).getPublishedHotelsByIds(
      rows.map((r) => r.hotel_id)
    );
    const byId = new Map(records.map((h) => [h.id, h]));

    // The repository returns its own order; restore the order the SQL chose.
    const hotels: HotelRecord[] = [];
    for (const row of rows) {
      const hotel = byId.get(row.hotel_id);
      if (hotel) hotels.push(hotel);
    }

    return { hotels, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 };
  } catch (err) {
    console.error('[hotel-search] failed', err);
    return { ...empty, error: 'Could not load hotels right now. Please try again.' };
  }
}
