'use server';

import { createClient } from '@/lib/supabase/server';
import { DestinationRepository, DestinationRecord } from '@/lib/repositories/destination.repository';

export async function getFeaturedDestinations(): Promise<DestinationRecord[]> {
  const supabase = await createClient();
  const repo = new DestinationRepository(supabase);
  return repo.getFeaturedDestinations(8);
}
