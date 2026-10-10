'use server';

// GOLIVE-14 — hotels near the visitor. Public (no login), read-only.
// The visitor's coordinates are used for this one query only: they are NOT
// stored, and not written to the database or logs.

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { HotelRepository, type HotelRecord } from '@/lib/repositories/hotel.repository';
import { checkRateLimit, getClientIp } from '@/lib/security/rate-limit';

export interface NearbyHotel {
  hotel: HotelRecord;
  distanceKm: number;
}

export type NearbyResult =
  | { ok: true; hotels: NearbyHotel[] }
  | { ok: false; error: string };

const inputSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  radiusKm: z.number().min(1).max(500).default(50),
  limit: z.number().int().min(1).max(50).default(8),
});

export async function getHotelsNearMe(input: {
  lat: number;
  lng: number;
  radiusKm?: number;
  limit?: number;
}): Promise<NearbyResult> {
  try {
    const parsed = inputSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: 'Invalid location.' };

    const limit = await checkRateLimit('near-me', await getClientIp(), {
      limit: 30,
      windowSeconds: 60,
    });
    if (!limit.allowed) {
      return { ok: false, error: 'Too many requests. Please try again in a minute.' };
    }

    const { lat, lng, radiusKm, limit: max } = parsed.data;
    const supabase = await createClient();

    const { data, error } = await supabase.rpc('hotels_near', {
      p_lat: lat,
      p_lng: lng,
      p_radius_km: radiusKm,
      p_limit: max,
    });
    if (error) throw error;

    const rows = (data ?? []) as Array<{ hotel_id: string; distance_km: number }>;
    if (rows.length === 0) return { ok: true, hotels: [] };

    const hotels = await new HotelRepository(supabase).getPublishedHotelsByIds(
      rows.map((r) => r.hotel_id)
    );
    const byId = new Map(hotels.map((h) => [h.id, h]));

    // The repository sorts by star rating; put them back nearest-first.
    const ordered: NearbyHotel[] = [];
    for (const row of rows) {
      const hotel = byId.get(row.hotel_id);
      if (hotel) ordered.push({ hotel, distanceKm: row.distance_km });
    }

    return { ok: true, hotels: ordered };
  } catch (err) {
    console.error('[near-me] failed', err);
    return { ok: false, error: 'Could not load nearby hotels. Please try again.' };
  }
}

