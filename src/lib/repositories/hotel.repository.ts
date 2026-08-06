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

export interface HotelImageRow {
  id: string;
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

  // --- PUBLIC-01: Public Marketing Pages (/hotels, /hotels/[slug]) ---
  // Mirrors DestinationRepository's getAllPublicDestinations /
  // getDestinationBySlug (PUBLIC-01). Only ACTIVE hotels are shown,
  // same filter already used by getTrendingHotels above. Images are
  // resolved the same way as getTrendingHotels so callers always get a
  // ready-to-render thumbnail URL, not a raw storage_path.

  async getPublishedHotels(page: number = 1, limit: number = 20) {
    const result = await this.findWithPagination({
      filters: [{ column: 'status', operator: 'eq', value: 'ACTIVE' }],
      sort: { column: 'created_at', ascending: false },
      pagination: { page, limit },
    });

    return { ...result, data: await this.resolveImages(result.data) };
  }

  async getHotelBySlug(slug: string): Promise<HotelRecord | null> {
    const { data, error } = await this.supabase
      .from('hotels')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'ACTIVE')
      .is('deleted_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to get hotel by slug: ${error.message}`);
    }

    const [resolved] = await this.resolveImages([data as HotelRecord]);
    return resolved;
  }

  // --- ADMIN-02: minimal public exposure of BaseRepository ---

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

  // --- ADMIN-03: hotel_images table CRUD only. No Storage calls here. ---

  async listHotelImages(hotelId: string): Promise<HotelImageRow[]> {
    const { data, error } = await this.supabase
      .from('hotel_images')
      .select('id, hotel_id, storage_path, is_primary, sort_order')
      .eq('hotel_id', hotelId)
      .order('sort_order', { ascending: true });

    if (error) {
      throw new Error(`Failed to list hotel images: ${error.message}`);
    }

    return (data ?? []) as HotelImageRow[];
  }

  async getHotelImageById(imageId: string): Promise<HotelImageRow | null> {
    const { data, error } = await this.supabase
      .from('hotel_images')
      .select('id, hotel_id, storage_path, is_primary, sort_order')
      .eq('id', imageId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to get hotel image: ${error.message}`);
    }

    return data as HotelImageRow;
  }

  async insertHotelImageRow(
    hotelId: string,
    storagePath: string,
    isPrimary: boolean,
    sortOrder: number
  ): Promise<HotelImageRow> {
    const { data, error } = await this.supabase
      .from('hotel_images')
      .insert({
        hotel_id: hotelId,
        storage_path: storagePath,
        is_primary: isPrimary,
        sort_order: sortOrder,
      })
      .select('id, hotel_id, storage_path, is_primary, sort_order')
      .single();

    if (error) {
      throw new Error(`Failed to insert hotel image row: ${error.message}`);
    }

    return data as HotelImageRow;
  }

  async setPrimaryHotelImage(hotelId: string, imageId: string): Promise<void> {
    const { error: clearError } = await this.supabase
      .from('hotel_images')
      .update({ is_primary: false })
      .eq('hotel_id', hotelId);

    if (clearError) {
      throw new Error(`Failed to clear primary flags: ${clearError.message}`);
    }

    const { error: setError } = await this.supabase
      .from('hotel_images')
      .update({ is_primary: true })
      .eq('id', imageId);

    if (setError) {
      throw new Error(`Failed to set primary image: ${setError.message}`);
    }
  }

  async updateHotelImageSortOrder(imageId: string, sortOrder: number): Promise<void> {
    const { error } = await this.supabase
      .from('hotel_images')
      .update({ sort_order: sortOrder })
      .eq('id', imageId);

    if (error) {
      throw new Error(`Failed to update sort order: ${error.message}`);
    }
  }

  async deleteHotelImageRow(imageId: string): Promise<void> {
    const { error } = await this.supabase
      .from('hotel_images')
      .delete()
      .eq('id', imageId);

    if (error) {
      throw new Error(`Failed to delete hotel image row: ${error.message}`);
    }
  }
}
