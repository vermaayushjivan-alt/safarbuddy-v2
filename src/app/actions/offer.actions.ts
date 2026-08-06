'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/session';
import { OfferRepository, OfferRecord } from '@/lib/repositories/offer.repository';

export async function getActiveOffers(): Promise<OfferRecord[]> {
  const supabase = await createClient();
  const repo = new OfferRepository(supabase);
  return repo.getActiveOffers(5);
}

// --- ADMIN-08: Offer Management (CRUD) ---
// Mirrors destination.actions.ts (ADMIN-06). status kept as a validated
// non-empty string (not a hardcoded enum) — no enum is confirmed for
// offers.status anywhere in the codebase (only the literal 'ACTIVE' is
// used as a filter value in getActiveOffers). image is left as a plain
// optional string passthrough — no Storage/bucket logic is added here;
// that is out of scope for this milestone per explicit instruction.

const offerInputSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().nullable().optional(),
  discount: z.string().nullable().optional(),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
  status: z.string().min(1, 'Status is required'),
  image: z.string().nullable().optional(),
});

export type OfferInput = z.infer<typeof offerInputSchema>;

export async function getAllOffersAdmin(page: number = 1, limit: number = 20) {
  await requireRole(['admin', 'super_admin']);
  const supabase = await createClient();
  const repo = new OfferRepository(supabase);
  return repo.getAllOffers(page, limit);
}

export async function getOfferByIdAdmin(id: string): Promise<OfferRecord | null> {
  await requireRole(['admin', 'super_admin']);
  const supabase = await createClient();
  const repo = new OfferRepository(supabase);
  return repo.getOfferById(id);
}

export async function createOfferAdmin(input: OfferInput) {
  await requireRole(['admin', 'super_admin']);
  const parsed = offerInputSchema.parse(input);
  const supabase = await createClient();
  const repo = new OfferRepository(supabase);
  return repo.createOffer(parsed);
}

export async function updateOfferAdmin(id: string, input: OfferInput) {
  await requireRole(['admin', 'super_admin']);
  const parsed = offerInputSchema.parse(input);
  const supabase = await createClient();
  const repo = new OfferRepository(supabase);
  return repo.updateOffer(id, parsed);
}

export async function deleteOfferAdmin(id: string): Promise<boolean> {
  await requireRole(['admin', 'super_admin']);
  const supabase = await createClient();
  const repo = new OfferRepository(supabase);
  return repo.deleteOffer(id);
}
