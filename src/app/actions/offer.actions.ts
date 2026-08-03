'use server';

import { createClient } from '@/lib/supabase/server';
import { OfferRepository, OfferRecord } from '@/lib/repositories/offer.repository';

export async function getActiveOffers(): Promise<OfferRecord[]> {
  const supabase = await createClient();
  const repo = new OfferRepository(supabase);
  return repo.getActiveOffers(5);
}
