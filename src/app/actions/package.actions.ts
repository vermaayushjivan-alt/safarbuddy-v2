'use server';

import { createClient } from '@/lib/supabase/server';
import { PackageRepository, PackageRecord } from '@/lib/repositories/package.repository';

export async function getFeaturedPackages(): Promise<PackageRecord[]> {
  const supabase = await createClient();
  const repo = new PackageRepository(supabase);
  return repo.getFeaturedPackages(8);
}
