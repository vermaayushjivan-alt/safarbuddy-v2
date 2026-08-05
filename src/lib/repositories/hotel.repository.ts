// lib/repositories/hotel.repository.ts
import { BaseRepository } from './base.repository';
import { SupabaseClientType, DatabaseRecord } from './types';

export interface HotelRecord extends DatabaseRecord {
  id: string;
  vendor_id: string | null;
  hotel_name: string;
  slug: string;
  description: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  thumbnail: string | null;
  gallery: string[] | null;
  star_rating: number | null;
  total_reviews: number | null;
  starting_price: number | null;
  is_featured: boolean;
  status: string;
}

interface HotelImageRow {
  hotel_id: string;
  storage_path: string;
  is_primary: boolean;
  sort_order: number;
}

export class HotelRepository extends BaseRepository<HotelRecord> {
  constructor(supabase: SupabaseClientType) {
    super(supabase, {
      tableName: 'hotels',
      softDelete: true,
      softDeleteColumn: 'deleted_at',
    });
  }

  async getTrendingHotels(limit: number = 6): Promise<HotelRecord[]> {
    const hotels = await this.findMany({
      filters: [
        { column: 'status', operator: 'eq', value: 'ACTIVE' },
        { column: 'is_featured', operator: 'eq', value: true },
      ],
      sort: { column: 'star_rating', ascending: false },
      pagination: { page: 1, limit },
    });

    return this.attachPrimaryImages(hotels);
  }

  /**
   * Resolves each hotel's primary image from hotel_images (canonical source
   * per verified production schema) and populates it into the existing
   * `thumbnail` field for backward compatibility. If no image row is found,
   * or the storage lookup fails, the hotel's existing thumbnail value
   * (legacy field) is left untouched — never throws, never breaks listing.
   */
  private async attachPrimaryImages(
    hotels: HotelRecord[]
  ): Promise<HotelRecord[]> {
    if (hotels.length === 0) return hotels;

    const hotelIds = hotels.map((h) => h.id);

    const { data: images, error } = await this.supabase
      .from('hotel_images')
      .select('hotel_id, storage_path, is_primary, sort_order')
      .in('hotel_id', hotelIds)
      .order('sort_order', { ascending: true });

    if (error || !images) {
      return hotels;
    }

    const primaryPathByHotelId = new Map<string, string>();
    for (const img of images as HotelImageRow[]) {
      const current = primaryPathByHotelId.get(img.hotel_id);
      if (!current || img.is_primary) {
        primaryPathByHotelId.set(img.hotel_id, img.storage_path);
      }
    }

    return hotels.map((hotel) => {
      const storagePath = primaryPathByHotelId.get(hotel.id);
      if (!storagePath) return hotel;

      const { data: publicUrlData } = this.supabase.storage
        .from('hotel-images')
        .getPublicUrl(storagePath);

      return {
        ...hotel,
        thumbnail: publicUrlData.publicUrl,
      };
    });
  }
}
