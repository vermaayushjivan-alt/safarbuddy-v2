'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/session';
import { HotelRepository, HotelRecord } from '@/lib/repositories/hotel.repository';

export async function getTrendingHotels(): Promise<HotelRecord[]> {
  const supabase = await createClient();
  const repo = new HotelRepository(supabase);
  return repo.getTrendingHotels(6);
}

// --- ADMIN-02: Hotel Management (CRUD) ---
// Every admin action below is gated by requireRole(["admin","super_admin"]),
// reusing the existing DB-01-backed session helper (no new auth system).

const hotelInputSchema = z.object({
  hotel_name: z.string().min(1, 'Hotel name is required'),
  slug: z.string().min(1, 'Slug is required'),
  description: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  star_rating: z.number().min(0).max(5).nullable().optional(),
  starting_price: z.number().min(0).nullable().optional(),
  is_featured: z.boolean().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'DRAFT']).default('DRAFT'),
});

export type HotelInput = z.infer<typeof hotelInputSchema>;

export async function getAllHotelsAdmin(page: number = 1, limit: number = 20) {
  await requireRole(['admin', 'super_admin']);

  const supabase = await createClient();
  const repo = new HotelRepository(supabase);
  return repo.getAllHotels(page, limit);
}

export async function getHotelByIdAdmin(id: string): Promise<HotelRecord | null> {
  await requireRole(['admin', 'super_admin']);

  const supabase = await createClient();
  const repo = new HotelRepository(supabase);
  return repo.getHotelById(id);
}

export async function createHotelAdmin(input: HotelInput) {
  await requireRole(['admin', 'super_admin']);

  const parsed = hotelInputSchema.parse(input);

  const supabase = await createClient();
  const repo = new HotelRepository(supabase);
  return repo.createHotel(parsed);
}

export async function updateHotelAdmin(id: string, input: HotelInput) {
  await requireRole(['admin', 'super_admin']);

  const parsed = hotelInputSchema.parse(input);

  const supabase = await createClient();
  const repo = new HotelRepository(supabase);
  return repo.updateHotel(id, parsed);
}

export async function deleteHotelAdmin(id: string): Promise<boolean> {
  await requireRole(['admin', 'super_admin']);

  const supabase = await createClient();
  const repo = new HotelRepository(supabase);
  return repo.deleteHotel(id);
}
