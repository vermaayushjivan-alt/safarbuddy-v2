import { BaseRepository } from './base.repository';
import { SupabaseClientType, DatabaseRecord } from './types';

// HotelRecord mirrors the actual public.hotels table shape verified
// against information_schema (SESSION 03). Do NOT add columns that are
// not present in the DB (RULE 7).
//
// LEGACY-COMPAT non-optional nullable fields (thumbnail, total_reviews,
// gallery) are NOT real DB columns. They are kept here as required
// nullable so pre-existing public/marketing UI code that references them
// continues to type-check with function signatures like
// formatReviews(n: number | null).
// - thumbnail is populated at read time by resolveImages() from
//   hotel_images.storage_path.
// - total_reviews and gallery are always null until a dedicated
//   milestone adds them to the DB and to the read path.
//
// HOTEL STATUS CONTRACT (SESSION 03):
// public.hotels.status is CHECK-constrained to exactly:
//   'pending' | 'active' | 'inactive' | 'suspended'
// (verified against pg_constraint.hotels_status_check).
// All status filters below MUST use these exact lowercase values.
export interface HotelRecord extends DatabaseRecord {
  id: string;
  vendor_id: string | null;
  hotel_name: string;
  slug: string;
  description: string | null;

  country_id: string | null;
  state_id: string | null;
  city_id: string | null;
  destination_id: string | null;

  city: string | null;
  state: string | null;
  country: string | null;

  address: string | null;
  latitude: number | null;
  longitude: number | null;
  star_rating: number | null;

  check_in_time: string;
  check_out_time: string;
  property_type: string;

  phone: string | null;
  email: string | null;
  website: string | null;

  starting_price: number | null;

  status: HotelStatus;
  is_featured: boolean;
  is_verified: boolean;

  // Legacy-compat non-optional nullable (not real DB columns) --
  // see comment above.
  thumbnail: string | null;
  total_reviews: number | null;
  gallery: string[] | null;
}

// Single source of truth for the DB-enforced status contract.
// Matches hotels_status_check exactly.
export const HOTEL_STATUS_VALUES = [
  'pending',
  'active',
  'inactive',
  'suspended',
] as const;

export type HotelStatus = (typeof HOTEL_STATUS_VALUES)[number];

export interface HotelImageRow {
  id: string;
  hotel_id: string;
  storage_path: string;
  is_primary: boolean;
  sort_order: number;
}

const DEFAULT_HOTEL_PLACEHOLDER = '/images/placeholders/default-hotel.webp';

// Ensures every HotelRecord returned to callers has the legacy-compat
// non-optional nullable fields populated (never undefined), even when
// the DB row does not contain them. resolveImages() will later overwrite
// `thumbnail` with a real public URL if a primary hotel image exists.
function withLegacyDefaults(hotel: HotelRecord): HotelRecord {
  return {
    ...hotel,
    thumbnail: hotel.thumbnail ?? null,
    total_reviews: hotel.total_reviews ?? null,
    gallery: hotel.gallery ?? null,
  };
}

export class HotelRepository extends BaseRepository<HotelRecord> {
  constructor(supabase: SupabaseClientType) {
    super(supabase, {
      tableName: 'hotels',
      softDelete: true,
      softDeleteColumn: 'deleted_at',
    });
  }

  // HOME-03: trending hotels for homepage.
  // SESSION 03: status filter updated from 'ACTIVE' to 'active' to match
  // the actual hotels_status_check DB constraint.
  async getTrendingHotels(limit: number = 6): Promise<HotelRecord[]> {
    const hotels = await this.findMany({
      filters: [
        { column: 'status', operator: 'eq', value: 'active' },
        { column: 'is_featured', operator: 'eq', value: true },
      ],
      sort: { column: 'star_rating', ascending: false },
      pagination: { page: 1, limit },
    });

    return this.resolveImages(hotels.map(withLegacyDefaults));
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

  // PUBLIC-01 marketing pages.
  // SESSION 03: status filter updated from 'ACTIVE' to 'active'.
  async getPublishedHotels(page: number = 1, limit: number = 20) {
    const result = await this.findWithPagination({
      filters: [{ column: 'status', operator: 'eq', value: 'active' }],
      sort: { column: 'created_at', ascending: false },
      pagination: { page, limit },
    });

    return {
      ...result,
      data: await this.resolveImages(result.data.map(withLegacyDefaults)),
    };
  }

  // SESSION 03: status filter updated from 'ACTIVE' to 'active'.
  async getHotelBySlug(slug: string): Promise<HotelRecord | null> {
    const { data, error } = await this.supabase
      .from('hotels')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'active')
      .is('deleted_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to get hotel by slug: ${error.message}`);
    }

    const [resolved] = await this.resolveImages([
      withLegacyDefaults(data as HotelRecord),
    ]);
    return resolved;
  }

  // ADMIN-02 CRUD.
  async getAllHotels(page: number = 1, limit: number = 20) {
    const result = await this.findWithPagination({
      sort: { column: 'created_at', ascending: false },
      pagination: { page, limit },
    });
    return { ...result, data: result.data.map(withLegacyDefaults) };
  }

  async getAllHotelsPaginated(page: number = 1, limit: number = 20) {
    return this.getAllHotels(page, limit);
  }

  async getHotelById(id: string): Promise<HotelRecord | null> {
    const hotel = await this.findById(id);
    return hotel ? withLegacyDefaults(hotel) : null;
  }

  async createHotel(data: Parameters<BaseRepository<HotelRecord>['create']>[0]) {
    const created = await this.create(data);
    return withLegacyDefaults(created);
  }

  async updateHotel(
    id: string,
    data: Parameters<BaseRepository<HotelRecord>['update']>[1]
  ) {
    const updated = await this.update(id, data);
    return withLegacyDefaults(updated);
  }

  async deleteHotel(id: string): Promise<boolean> {
    return this.softDeleteById(id).then(() => true);
  }

  // ADMIN-03 hotel_images table CRUD only. No Storage calls here.
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
