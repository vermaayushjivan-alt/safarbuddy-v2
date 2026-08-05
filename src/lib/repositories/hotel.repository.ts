// lib/repositories/hotel.repository.ts
import fs from 'fs';
import path from 'path';
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

const DEFAULT_HOTEL_PLACEHOLDER = '/images/placeholders/default-hotel.webp';
const HOTEL_PLACEHOLDER_DIR = path.join(
  process.cwd(),
  'public',
  'images',
  'placeholders',
  'hotels'
);

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

    return this.resolveImages(hotels);
  }

  /**
   * Populates the existing `thumbnail` field using a 3-tier fallback:
   * 1. Real image from hotel_images (Supabase Storage public URL)
   * 2. Local per-slug placeholder (public/images/placeholders/hotels/{slug}.webp)
   * 3. Default local placeholder
   *
   * This guarantees `thumbnail` is never null/broken. No new fields are
   * introduced; the UI continues reading `thumbnail` exactly as before.
   * When an admin later populates storage_path for a hotel, this method
   * automatically returns the real Supabase URL instead — no code change
   * required anywhere else.
   */
  private async resolveImages(hotels: HotelRecord[]): Promise<HotelRecord[]> {
    if (hotels.length === 0) return hotels;

    const hotelIds = hotels.map((h) => h.id);

    const { data: images, error } = await this.supabase
      .from('hotel_images')
      .select('hotel_id, storage_path, is_primary, sort_order')
      .in('hotel_id', hotelIds)
      .order('sort_order', { ascending: true });

    const primaryPathByHotelId = new Map<string, string>();
    if (!error && images) {
      for (const img of images as HotelImageRow[]) {
        const current = primaryPathByHotelId.get(img.hotel_id);
        if (!current || img.is_primary) {
          primaryPathByHotelId.set(img.hotel_id, img.storage_path);
        }
      }
    }

    return hotels.map((hotel) => {
      // Priority 1: real image from Supabase Storage
      const storagePath = primaryPathByHotelId.get(hotel.id);
      if (storagePath) {
        const { data: publicUrlData } = this.supabase.storage
          .from('hotel-images')
          .getPublicUrl(storagePath);

        return { ...hotel, thumbnail: publicUrlData.publicUrl };
      }

      // Priority 2: local per-slug placeholder, if it exists on disk
      if (hotel.slug) {
        const localPath = path.join(HOTEL_PLACEHOLDER_DIR, `${hotel.slug}.webp`);
        if (fs.existsSync(localPath)) {
          return {
            ...hotel,
            thumbnail: `/images/placeholders/hotels/${hotel.slug}.webp`,
          };
        }
      }

      // Priority 3: default placeholder
      return { ...hotel, thumbnail: DEFAULT_HOTEL_PLACEHOLDER };
    });
  }
}
