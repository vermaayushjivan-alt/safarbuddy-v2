"use server";

import { createClient } from "@/lib/supabase/server";
import { HotelRepository, HotelRecord } from "@/lib/repositories/hotel.repository";

export async function getPublishedHotels(
  page: number = 1,
  limit: number = 10
): Promise<{ data: HotelRecord[]; count: number }> {
  const supabase = await createClient();
  const repo = new HotelRepository(supabase);
  return repo.getPublishedHotels(page, limit);
}

export async function getHotelBySlug(slug: string): Promise<HotelRecord | null> {
  const supabase = await createClient();
  const repo = new HotelRepository(supabase);
  return repo.getHotelBySlug(slug);
}

export async function getAllHotelsAdmin(): Promise<HotelRecord[]> {
  const supabase = await createClient();
  const repo = new HotelRepository(supabase);
  return repo.getAllHotels();
}

export async function getHotelByIdAdmin(id: string): Promise<HotelRecord | null> {
  const supabase = await createClient();
  const repo = new HotelRepository(supabase);
  return repo.getHotelById(id);
}
