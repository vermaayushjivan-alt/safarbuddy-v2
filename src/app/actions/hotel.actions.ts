"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  HotelRepository,
  HotelRecord,
  HotelImageRecord,
} from "@/lib/repositories/hotel.repository";
import { requireRole } from "@/lib/auth/session";

// Public Actions
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

export async function getTrendingHotels(limit: number = 6): Promise<HotelRecord[]> {
  const supabase = await createClient();
  const repo = new HotelRepository(supabase);
  const result = await repo.getPublishedHotels(1, limit);
  return result.data;
}

// Admin Actions
export async function getAllHotelsAdmin(): Promise<HotelRecord[]> {
  await requireRole(["admin", "super_admin"]);
  const supabase = await createClient();
  const repo = new HotelRepository(supabase);
  return repo.getAllHotels();
}

export async function getHotelByIdAdmin(id: string): Promise<HotelRecord | null> {
  await requireRole(["admin", "super_admin"]);
  const supabase = await createClient();
  const repo = new HotelRepository(supabase);
  return repo.getHotelById(id);
}

export async function createHotelAdmin(formData: FormData) {
  await requireRole(["admin", "super_admin"]);
  const supabase = await createClient();
  const repo = new HotelRepository(supabase);

  const name = formData.get("name") as string;
  const slug = formData.get("slug") as string;
  const description = formData.get("description") as string;
  const city = formData.get("city") as string;
  const state = formData.get("state") as string;
  const country = formData.get("country") as string;
  const address = formData.get("address") as string;
  const star_rating = Number(formData.get("star_rating")) || 0;
  const price_per_night = Number(formData.get("price_per_night")) || 0;
  const is_published = formData.get("is_published") === "true";

  const hotel = await repo.createHotel({
    name,
    slug,
    description,
    city,
    state,
    country,
    address,
    star_rating,
    price_per_night,
    is_published,
  });

  revalidatePath("/admin/hotels");
  return hotel;
}

export async function updateHotelAdmin(id: string, formData: FormData) {
  await requireRole(["admin", "super_admin"]);
  const supabase = await createClient();
  const repo = new HotelRepository(supabase);

  const name = formData.get("name") as string;
  const slug = formData.get("slug") as string;
  const description = formData.get("description") as string;
  const city = formData.get("city") as string;
  const state = formData.get("state") as string;
  const country = formData.get("country") as string;
  const address = formData.get("address") as string;
  const star_rating = Number(formData.get("star_rating")) || 0;
  const price_per_night = Number(formData.get("price_per_night")) || 0;
  const is_published = formData.get("is_published") === "true";

  const hotel = await repo.updateHotel(id, {
    name,
    slug,
    description,
    city,
    state,
    country,
    address,
    star_rating,
    price_per_night,
    is_published,
  });

  revalidatePath("/admin/hotels");
  revalidatePath(`/admin/hotels/${id}/edit`);
  return hotel;
}

export async function deleteHotelAdmin(id: string) {
  await requireRole(["admin", "super_admin"]);
  const supabase = await createClient();
  const repo = new HotelRepository(supabase);

  await repo.deleteHotel(id);
  revalidatePath("/admin/hotels");
}

// Image Actions
export async function getHotelImagesAdmin(hotelId: string): Promise<HotelImageRecord[]> {
  await requireRole(["admin", "super_admin"]);
  const supabase = await createClient();
  const repo = new HotelRepository(supabase);
  return repo.listHotelImages(hotelId);
}

export async function uploadHotelImageAdmin(hotelId: string, image_url: string) {
  await requireRole(["admin", "super_admin"]);
  const supabase = await createClient();
  const repo = new HotelRepository(supabase);

  const image = await repo.insertHotelImageRow({
    hotel_id: hotelId,
    image_url,
  });

  revalidatePath(`/admin/hotels/${hotelId}/images`);
  return image;
}

export async function deleteHotelImageAdmin(hotelId: string, imageId: string) {
  await requireRole(["admin", "super_admin"]);
  const supabase = await createClient();
  const repo = new HotelRepository(supabase);

  await repo.deleteHotelImageRow(imageId);
  revalidatePath(`/admin/hotels/${hotelId}/images`);
}
