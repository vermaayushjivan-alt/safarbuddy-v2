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

const DEFAULT_HOTEL_PLACEHOLDER = '/images/placeholders/default-hotel.webp';

export class HotelRepository extends BaseRepository<HotelRecord> {
  constructor(supabase: SupabaseClientType) {
    super(supabase, {
      tableName: 'hotels',
      softDelete: true,
      softDeleteColumn: 'deleted_at',
    });
  }

  // --- Existing HOME-03 method (unchanged) ---

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
      const storagePath = primaryPathByHotelId.get(hotel.id);
      if (storagePath) {
        const normalizedPath = storagePath.startsWith('hotel-images/')
          ? storagePath.slice('hotel-images/'.length)
          : storagePath;

        const { data: publicUrlData } = this.supabase.storage
          .from('hotel-images')
          .getPublicUrl(normalizedPath);

        return { ...hotel, thumbnail: publicUrlData.publicUrl };
      }

      return { ...hotel, thumbnail: DEFAULT_HOTEL_PLACEHOLDER };
    });
  }

  // --- ADMIN-02: minimal public exposure of BaseRepository, no extra logic ---

  async getAllHotels(page: number = 1, limit: number = 20) {
    return this.findWithPagination({
      sort: { column: 'created_at', ascending: false },
      pagination: { page, limit },
    });
  }

  async getHotelById(id: string): Promise<HotelRecord | null> {
    return this.findById(id);
  }

  async createHotel(data: Parameters<BaseRepository<HotelRecord>['create']>[0]) {
    return this.create(data);
  }

  async updateHotel(
    id: string,
    data: Parameters<BaseRepository<HotelRecord>['update']>[1]
  ) {
    return this.update(id, data);
  }

  async deleteHotel(id: string): Promise<boolean> {
    return this.softDeleteById(id).then(() => true);
  }
}
