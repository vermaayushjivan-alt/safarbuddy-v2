'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/session';
import { DestinationRepository, DestinationRecord } from '@/lib/repositories/destination.repository';

export async function getFeaturedDestinations(): Promise<DestinationRecord[]> {
  const supabase = await createClient();
  const repo = new DestinationRepository(supabase);
  return repo.getFeaturedDestinations(8);
}

// --- ADMIN-06: Destination Management (CRUD) ---
// Mirrors hotel.actions.ts (ADMIN-02). status kept as a validated
// non-empty string (not a hardcoded enum) — same caution as
// package.actions.ts, since destinations.status has no DB-verified
// enum values on record.

const destinationInputSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().min(1, 'Slug is required'),
  state: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  is_featured: z.boolean().optional(),
  status: z.string().min(1, 'Status is required'),
});

export type DestinationInput = z.infer<typeof destinationInputSchema>;

export async function getAllDestinationsAdmin(page: number = 1, limit: number = 20) {
  await requireRole(['admin', 'super_admin']);
  const supabase = await createClient();
  const repo = new DestinationRepository(supabase);
  return repo.getAllDestinations(page, limit);
}

export async function getDestinationByIdAdmin(id: string): Promise<DestinationRecord | null> {
  await requireRole(['admin', 'super_admin']);
  const supabase = await createClient();
  const repo = new DestinationRepository(supabase);
  return repo.getDestinationById(id);
}

export async function createDestinationAdmin(input: DestinationInput) {
  await requireRole(['admin', 'super_admin']);
  const parsed = destinationInputSchema.parse(input);
  const supabase = await createClient();
  const repo = new DestinationRepository(supabase);
  return repo.createDestination(parsed);
}

export async function updateDestinationAdmin(id: string, input: DestinationInput) {
  await requireRole(['admin', 'super_admin']);
  const parsed = destinationInputSchema.parse(input);
  const supabase = await createClient();
  const repo = new DestinationRepository(supabase);
  return repo.updateDestination(id, parsed);
}

export async function deleteDestinationAdmin(id: string): Promise<boolean> {
  await requireRole(['admin', 'super_admin']);
  const supabase = await createClient();
  const repo = new DestinationRepository(supabase);
  return repo.deleteDestination(id);
}
