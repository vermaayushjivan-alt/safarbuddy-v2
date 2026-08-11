import { BaseRepository } from "./base.repository";
import {
  SupabaseClientType,
  DatabaseRecord,
} from "./types";

/**
 * HotelRecord
 *
 * Mirrors the verified public.hotels database columns.
 *
 * IMPORTANT:
 * - Do not add fields here unless they exist in the database.
 * - thumbnail is a computed/read-time field generated from hotel_images.
 * - hotel_images is handled separately through HotelImageRow.
 */
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

  status: string;
  is_featured: boolean;
  is_verified: boolean;

  /**
   * Computed field.
   *
   * This is NOT read from public.hotels.
   * It is populated from hotel_images.storage_path
   * by resolveImages().
   */
  thumbnail?: string | null;
}

/**
 * hotel_images table shape.
 *
 * No created_at / updated_at / deleted_at fields are assumed.
 */
export interface HotelImageRow {
  id: string;
  hotel_id: string;
  storage_path: string;
  is_primary: boolean;
  sort_order: number;
}

export interface HotelImageWithUrl extends HotelImageRow {
  publicUrl: string;
}

const DEFAULT_HOTEL_PLACEHOLDER =
  "/images/placeholders/default-hotel.webp";

const STORAGE_BUCKET = "hotel-images";
const STORAGE_PREFIX = `${STORAGE_BUCKET}/`;

export class HotelRepository extends BaseRepository<HotelRecord> {
  constructor(supabase: SupabaseClientType) {
    super(supabase, {
      tableName: "hotels",
      softDelete: true,
      softDeleteColumn: "deleted_at",
    });
  }

  // ---------------------------------------------------------------------------
  // PUBLIC / HOME
  // ---------------------------------------------------------------------------

  /**
   * HOME-03
   *
   * Returns featured active hotels ordered by rating.
   */
  async getTrendingHotels(
    limit: number = 6
  ): Promise<HotelRecord[]> {
    const hotels = await this.findMany({
      filters: [
        {
          column: "status",
          operator: "eq",
          value: "ACTIVE",
        },
        {
          column: "is_featured",
          operator: "eq",
          value: true,
        },
      ],
      sort: {
        column: "star_rating",
        ascending: false,
      },
      pagination: {
        page: 1,
        limit,
      },
    });

    return this.resolveImages(hotels);
  }

  /**
   * Resolves primary hotel images at read time.
   *
   * Database stores:
   * hotel-images/<hotelId>/<uuid>.<ext>
   *
   * Supabase Storage getPublicUrl() receives:
   * <hotelId>/<uuid>.<ext>
   */
  private async resolveImages(
    hotels: HotelRecord[]
  ): Promise<HotelRecord[]> {
    if (hotels.length === 0) {
      return hotels;
    }

    const hotelIds = hotels.map((hotel) => hotel.id);

    const { data: images, error } = await this.supabase
      .from("hotel_images")
      .select(
        "hotel_id, storage_path, is_primary, sort_order"
      )
      .in("hotel_id", hotelIds)
      .order("sort_order", {
        ascending: true,
      });

    const primaryPathByHotelId = new Map<
      string,
      string
    >();

    if (!error && images) {
      for (const image of images as HotelImageRow[]) {
        const existing =
          primaryPathByHotelId.get(image.hotel_id);

        /**
         * Because the query is ordered by sort_order,
         * the first image becomes the fallback.
         *
         * If an explicitly primary image exists,
         * it replaces the fallback.
         */
        if (!existing || image.is_primary) {
          primaryPathByHotelId.set(
            image.hotel_id,
            image.storage_path
          );
        }
      }
    }

    return hotels.map((hotel) => {
      const storagePath =
        primaryPathByHotelId.get(hotel.id);

      if (!storagePath) {
        return {
          ...hotel,
          thumbnail: DEFAULT_HOTEL_PLACEHOLDER,
        };
      }

      const normalizedPath =
        storagePath.startsWith(STORAGE_PREFIX)
          ? storagePath.slice(STORAGE_PREFIX.length)
          : storagePath;

      const { data: publicUrlData } =
        this.supabase.storage
          .from(STORAGE_BUCKET)
          .getPublicUrl(normalizedPath);

      return {
        ...hotel,
        thumbnail:
          publicUrlData.publicUrl ||
          DEFAULT_HOTEL_PLACEHOLDER,
      };
    });
  }

  /**
   * PUBLIC-01
   */
  async getPublishedHotels(
    page: number = 1,
    limit: number = 20
  ): Promise<{
    data: HotelRecord[];
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  }> {
    const result = await this.findWithPagination({
      filters: [
        {
          column: "status",
          operator: "eq",
          value: "ACTIVE",
        },
      ],
      sort: {
        column: "created_at",
        ascending: false,
      },
      pagination: {
        page,
        limit,
      },
    });

    return {
      ...result,
      data: await this.resolveImages(result.data),
    };
  }

  /**
   * Public hotel detail page.
   */
  async getHotelBySlug(
    slug: string
  ): Promise<HotelRecord | null> {
    const { data, error } = await this.supabase
      .from("hotels")
      .select("*")
      .eq("slug", slug)
      .eq("status", "ACTIVE")
      .is("deleted_at", null)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }

      throw new Error(
        `Failed to get hotel by slug: ${error.message}`
      );
    }

    const [hotel] = await this.resolveImages([
      data as HotelRecord,
    ]);

    return hotel ?? null;
  }

  // ---------------------------------------------------------------------------
  // ADMIN — HOTELS
  // ---------------------------------------------------------------------------

  async getAllHotels(
    page: number = 1,
    limit: number = 20
  ) {
    return this.findWithPagination({
      sort: {
        column: "created_at",
        ascending: false,
      },
      pagination: {
        page,
        limit,
      },
    });
  }

  async getAllHotelsPaginated(
    page: number = 1,
    limit: number = 20
  ) {
    return this.getAllHotels(page, limit);
  }

  async getHotelById(
    id: string
  ): Promise<HotelRecord | null> {
    return this.findById(id);
  }

  async createHotel(
    data: Parameters<
      BaseRepository<HotelRecord>["create"]
    >[0]
  ) {
    return this.create(data);
  }

  async updateHotel(
    id: string,
    data: Parameters<
      BaseRepository<HotelRecord>["update"]
    >[1]
  ) {
    return this.update(id, data);
  }

  async deleteHotel(
    id: string
  ): Promise<boolean> {
    await this.softDeleteById(id);
    return true;
  }

  // ---------------------------------------------------------------------------
  // ADMIN — HOTEL IMAGES
  // ---------------------------------------------------------------------------

  async listHotelImages(
    hotelId: string
  ): Promise<HotelImageRow[]> {
    const { data, error } = await this.supabase
      .from("hotel_images")
      .select(
        "id, hotel_id, storage_path, is_primary, sort_order"
      )
      .eq("hotel_id", hotelId)
      .order("sort_order", {
        ascending: true,
      });

    if (error) {
      throw new Error(
        `Failed to list hotel images: ${error.message}`
      );
    }

    return (data ?? []) as HotelImageRow[];
  }

  async getHotelImageById(
    imageId: string
  ): Promise<HotelImageRow | null> {
    const { data, error } = await this.supabase
      .from("hotel_images")
      .select(
        "id, hotel_id, storage_path, is_primary, sort_order"
      )
      .eq("id", imageId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }

      throw new Error(
        `Failed to get hotel image: ${error.message}`
      );
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
      .from("hotel_images")
      .insert({
        hotel_id: hotelId,
        storage_path: storagePath,
        is_primary: isPrimary,
        sort_order: sortOrder,
      })
      .select(
        "id, hotel_id, storage_path, is_primary, sort_order"
      )
      .single();

    if (error) {
      throw new Error(
        `Failed to insert hotel image row: ${error.message}`
      );
    }

    return data as HotelImageRow;
  }

  async setPrimaryHotelImage(
    hotelId: string,
    imageId: string
  ): Promise<void> {
    const image =
      await this.getHotelImageById(imageId);

    if (!image) {
      throw new Error("Hotel image not found.");
    }

    if (image.hotel_id !== hotelId) {
      throw new Error(
        "Hotel image does not belong to this hotel."
      );
    }

    const { error: clearError } =
      await this.supabase
        .from("hotel_images")
        .update({
          is_primary: false,
        })
        .eq("hotel_id", hotelId);

    if (clearError) {
      throw new Error(
        `Failed to clear primary flags: ${clearError.message}`
      );
    }

    const { error: setError } =
      await this.supabase
        .from("hotel_images")
        .update({
          is_primary: true,
        })
        .eq("id", imageId)
        .eq("hotel_id", hotelId);

    if (setError) {
      throw new Error(
        `Failed to set primary image: ${setError.message}`
      );
    }
  }

  async updateHotelImageSortOrder(
    imageId: string,
    sortOrder: number
  ): Promise<void> {
    if (!Number.isFinite(sortOrder)) {
      throw new Error(
        "Sort order must be a valid number."
      );
    }

    const { error } = await this.supabase
      .from("hotel_images")
      .update({
        sort_order: sortOrder,
      })
      .eq("id", imageId);

    if (error) {
      throw new Error(
        `Failed to update sort order: ${error.message}`
      );
    }
  }

  async deleteHotelImageRow(
    imageId: string
  ): Promise<void> {
    const { error } = await this.supabase
      .from("hotel_images")
      .delete()
      .eq("id", imageId);

    if (error) {
      throw new Error(
        `Failed to delete hotel image row: ${error.message}`
      );
    }
  }
}
