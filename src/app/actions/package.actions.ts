'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/session';
import { PackageRepository, PackageRecord } from '@/lib/repositories/package.repository';

export async function getFeaturedPackages(): Promise<PackageRecord[]> {
  const supabase = await createClient();
  const repo = new PackageRepository(supabase);
  return repo.getFeaturedPackages(8);
}

// --- ADMIN-04: Package Management (CRUD) ---
// Only verified fields are validated. `status` is a non-empty string —
// no enum values are assumed, since only 'ACTIVE' is confirmed in
// production usage (see getFeaturedPackages above).

const packageInputSchema = z.object({
  package_name: z.string().min(1, 'Package name is required'),
  slug: z.string().min(1, 'Slug is required'),
  description: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  duration: z.string().nullable().optional(),
  starting_price: z.number().min(0).nullable().optional(),
  is_featured: z.boolean().optional(),
  status: z.string().min(1, 'Status is required'),
});

export type PackageInput = z.infer<typeof packageInputSchema>;

export async function getAllPackagesAdmin(page: number = 1, limit: number = 20) {
  await requireRole(['admin', 'super_admin']);
  const supabase = await createClient();
  const repo = new PackageRepository(supabase);
  return repo.getAllPackages(page, limit);
}

export async function getPackageByIdAdmin(id: string): Promise<PackageRecord | null> {
  await requireRole(['admin', 'super_admin']);
  const supabase = await createClient();
  const repo = new PackageRepository(supabase);
  return repo.getPackageById(id);
}

export async function createPackageAdmin(input: PackageInput) {
  await requireRole(['admin', 'super_admin']);
  const parsed = packageInputSchema.parse(input);
  const supabase = await createClient();
  const repo = new PackageRepository(supabase);
  return repo.createPackage(parsed);
}

export async function updatePackageAdmin(id: string, input: PackageInput) {
  await requireRole(['admin', 'super_admin']);
  const parsed = packageInputSchema.parse(input);
  const supabase = await createClient();
  const repo = new PackageRepository(supabase);
  return repo.updatePackage(id, parsed);
}

export async function deletePackageAdmin(id: string): Promise<boolean> {
  await requireRole(['admin', 'super_admin']);
  const supabase = await createClient();
  const repo = new PackageRepository(supabase);
  return repo.deletePackage(id);
}
