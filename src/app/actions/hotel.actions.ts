"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  HotelRepository,
  HotelRecord,
  HotelImageRecord,
} from "@/lib/repositories/hotel.repository";
import { requireRole } from "@/lib/auth/session";


// =========================
// PUBLIC ACTIONS
// =========================

export async function getPublishedHotels(
  page: number = 1,
  limit: number = 10
): Promise<{ data: HotelRecord[]; count: number }> {

  const supabase = await createClient();
  const repo = new HotelRepository(supabase);

  return repo.getPublishedHotels(page, limit);
}


export async function getHotelBySlug(
  slug: string
): Promise<HotelRecord | null> {

  const supabase = await createClient();
  const repo = new HotelRepository(supabase);

  return repo.getHotelBySlug(slug);
}


export async function getTrendingHotels(
  limit: number = 6
): Promise<HotelRecord[]> {

  const supabase = await createClient();
  const repo = new HotelRepository(supabase);

  const result = await repo.getPublishedHotels(1, limit);

  return result.data;
}



// =========================
// ADMIN HOTEL ACTIONS
// =========================

export async function getAllHotelsAdmin(
  page: number = 1,
  limit: number = 20
): Promise<{
  data: HotelRecord[];
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}> {

  await requireRole(["admin", "super_admin"]);

  const supabase = await createClient();
  const repo = new HotelRepository(supabase);

  return repo.getAllHotelsPaginated(page, limit);
}



export async function getHotelByIdAdmin(
  id: string
): Promise<HotelRecord | null> {

  await requireRole(["admin", "super_admin"]);

  const supabase = await createClient();
  const repo = new HotelRepository(supabase);

  return repo.getHotelById(id);
}



export async function createHotelAdmin(
  formData: FormData
) {

  await requireRole(["admin", "super_admin"]);

  const supabase = await createClient();
  const repo = new HotelRepository(supabase);


  const hotel = await repo.createHotel({

    name: String(formData.get("name") ?? ""),
    slug: String(formData.get("slug") ?? ""),
    description: String(formData.get("description") ?? ""),

    city: String(formData.get("city") ?? ""),
    state: String(formData.get("state") ?? ""),
    country: String(formData.get("country") ?? ""),
    address: String(formData.get("address") ?? ""),

    star_rating:
      Number(formData.get("star_rating")) || 0,

    price_per_night:
      Number(formData.get("price_per_night")) || 0,

    is_published:
      formData.get("is_published") === "true",

  });


  revalidatePath("/admin/hotels");

  return hotel;
}



export async function updateHotelAdmin(
  id: string,
  formData: FormData
) {

  await requireRole(["admin", "super_admin"]);

  const supabase = await createClient();
  const repo = new HotelRepository(supabase);


  const hotel = await repo.updateHotel(id, {

    name: String(formData.get("name") ?? ""),
    slug: String(formData.get("slug") ?? ""),
    description: String(formData.get("description") ?? ""),

    city: String(formData.get("city") ?? ""),
    state: String(formData.get("state") ?? ""),
    country: String(formData.get("country") ?? ""),
    address: String(formData.get("address") ?? ""),

    star_rating:
      Number(formData.get("star_rating")) || 0,

    price_per_night:
      Number(formData.get("price_per_night")) || 0,

    is_published:
      formData.get("is_published") === "true",

  });


  revalidatePath("/admin/hotels");
  revalidatePath(`/admin/hotels/${id}/edit`);

  return hotel;
}



export async function deleteHotelAdmin(
  id: string
) {

  await requireRole(["admin", "super_admin"]);

  const supabase = await createClient();
  const repo = new HotelRepository(supabase);

  await repo.deleteHotel(id);

  revalidatePath("/admin/hotels");
}



// =========================
// HOTEL IMAGE ADMIN ACTIONS
// =========================


export async function getHotelImagesAdmin(
  hotelId: string
): Promise<HotelImageRecord[]> {

  await requireRole(["admin", "super_admin"]);

  const supabase = await createClient();
  const repo = new HotelRepository(supabase);

  return repo.listHotelImages(hotelId);
}



export async function uploadHotelImageAdmin(
  hotelId: string,
  image_url: string
) {

  await requireRole(["admin", "super_admin"]);

  const supabase = await createClient();
  const repo = new HotelRepository(supabase);


  const image = await repo.insertHotelImageRow({

    hotel_id: hotelId,
    image_url,

  });


  revalidatePath(
    `/admin/hotels/${hotelId}/images`
  );


  return image;
}



export async function setPrimaryHotelImageAdmin(
  hotelId: string,
  imageId: string
) {

  await requireRole(["admin", "super_admin"]);

  const supabase = await createClient();
  const repo = new HotelRepository(supabase);


  await repo.setPrimaryHotelImage(
    hotelId,
    imageId
  );


  revalidatePath(
    `/admin/hotels/${hotelId}/images`
  );
}



export async function reorderHotelImageAdmin(
  hotelId: string,
  imageId: string,
  sortOrder: number
) {

  await requireRole(["admin", "super_admin"]);

  const supabase = await createClient();
  const repo = new HotelRepository(supabase);


  await repo.updateHotelImageSortOrder(
    imageId,
    sortOrder
  );


  revalidatePath(
    `/admin/hotels/${hotelId}/images`
  );
}



export async function deleteHotelImageAdmin(
  hotelId: string,
  imageId: string
) {

  await requireRole(["admin", "super_admin"]);

  const supabase = await createClient();
  const repo = new HotelRepository(supabase);


  await repo.deleteHotelImageRow(imageId);


  revalidatePath(
    `/admin/hotels/${hotelId}/images`
  );
}
