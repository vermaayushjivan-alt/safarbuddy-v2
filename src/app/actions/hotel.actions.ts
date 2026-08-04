'use server';

import { createClient } from '@/lib/supabase/server';
import { HotelRepository, HotelRecord } from '@/lib/repositories/hotel.repository';

export async function getTrendingHotels(): Promise<HotelRecord[]> {
  const supabase = await createClient();
  const repo = new HotelRepository(supabase);
  return repo.getTrendingHotels(6);
}
