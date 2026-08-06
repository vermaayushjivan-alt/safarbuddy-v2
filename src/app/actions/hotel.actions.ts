'use server';

import { createClient } from '@/lib/supabase/server';
import { HotelRepository } from '@/lib/repositories/hotel.repository';

export async function addHotelImageAction(
  hotelId: string,
  storagePath: string,
  isPrimary: boolean = false,
  sortOrder: number = 0
) {
  const supabase = await createClient();
  const repo = new HotelRepository(supabase);

  try {
    const newImage = await repo.insertHotelImageRow(
      hotelId,
      storagePath,
      isPrimary,
      sortOrder
    );
    return { success: true, data: newImage };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createHotelImage(
  hotelId: string,
  storagePath: string,
  isPrimary: boolean = false,
  sortOrder: number = 0
) {
  const supabase = await createClient();
  const repo = new HotelRepository(supabase);

  try {
    const image = await repo.insertHotelImageRow(
      hotelId,
      storagePath,
      isPrimary,
      sortOrder
    );
    return { success: true, data: image };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getHotelsAction(page: number = 1, limit: number = 20) {
  const supabase = await createClient();
  const repo = new HotelRepository(supabase);

  try {
    const result = await repo.getAllHotelsPaginated(page, limit);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getPublishedHotelsAction(page: number = 1, limit: number = 20) {
  const supabase = await createClient();
  const repo = new HotelRepository(supabase);

  try {
    const result = await repo.getPublishedHotels(page, limit);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getHotelBySlugAction(slug: string) {
  const supabase = await createClient();
  const repo = new HotelRepository(supabase);

  try {
    const hotel = await repo.getHotelBySlug(slug);
    return { success: true, data: hotel };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteHotelImageAction(imageId: string) {
  const supabase = await createClient();
  const repo = new HotelRepository(supabase);

  try {
    await repo.deleteHotelImageRow(imageId);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function setPrimaryHotelImageAction(hotelId: string, imageId: string) {
  const supabase = await createClient();
  const repo = new HotelRepository(supabase);

  try {
    await repo.setPrimaryHotelImage(hotelId, imageId);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
