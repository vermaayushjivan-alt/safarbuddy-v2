import { BaseRepository } from "./base.repository";
import { SupabaseClientType, DatabaseRecord } from "./types";

/**
 * HotelRecord mirrors the verified public.hotels database shape.
 *
 * IMPORTANT:
 * - Only real public.hotels columns are queried from the database.
 * - thumbnail is a computed read-time field.
 * - total_reviews and gallery are compatibility fields only.
 * - total_reviews is NOT selected from public.hotels.
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
   * NOT a database column.
   */
  thumbnail: string | null;

  /**
   * Compatibility field for existing UI.
   *
   * NOT a database column.
   * Until the reviews system is implemented, this is null.
   */
  total_reviews: number | null;

  /**
   * Compatibility field.
   *
   * NOT a database column.
   */
  gallery: string[] | null;
}

export interface HotelImageRow {
  id: string;
  hotel_id: string;
  storage_path: string;
  is_primary: boolean;
  sort_order: number;
}

const DEFAULT_HOTEL_PLACEHOLDER =
  "/images/placeholders/default-hotel.webp";

export class HotelRepository extends BaseRepository<HotelRecord> {
  constructor(supabase: SupabaseClientType) {
    super(supabase, {
      tableName: "hotels",
      softDelete: true,
      softDeleteColumn: "deleted_at",
    });
  }

  // ---------------------------------------------------------------------------
  // HOME-03
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // IMAGE RESOLUTION
  // ---------------------------------------------------------------------------

  private async resolveImages(
    hotels: HotelRecord[]
  ): Promise<HotelRecord[]> {
    if (hotels.length === 0) {
      return hotels;
    }

    const hotelIds = hotels.map(
      (hotel) => hotel.id
    );

    const { data: images, error } =
      await this.supabase
        .from("hotel_images")
        .select(
          "hotel_id, storage_path, is_primary, sort_order"
        )
        .in("hotel_id", hotelIds)
        .order("sort_order", {
          ascending: true,
        });

    const primaryPathByHotelId =
      new Map<string, string>();

    if (!error && images) {
      for (const img of images as HotelImageRow[]) {
        const current =
          primaryPathByHotelId.get(
            img.hotel_id
          );

        if (!current || img.is_primary) {
          primaryPathByHotelId.set(
            img.hotel_id,
            img.storage_path
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
          thumbnail:
            DEFAULT_HOTEL_PLACEHOLDER,
          total_reviews:
            hotel.total_reviews ?? null,
          gallery:
            hotel.gallery ?? null,
        };
      }

      const normalizedPath =
        storagePath.startsWith(
          "hotel-images/"
        )
          ? storagePath.slice(
              "hotel-images/".length
            )
          : storagePath;

      const { data: publicUrlData } =
        this.supabase.storage
          .from("hotel-images")
          .getPublicUrl(
            normalizedPath
          );

      return {
        ...hotel,
        thumbnail:
          publicUrlData.publicUrl,
        total_reviews:
          hotel.total_reviews ?? null,
        gallery:
          hotel.gallery ?? null,
      };
    });
  }

  // ---------------------------------------------------------------------------
  // PUBLIC HOTEL PAGES
  // ---------------------------------------------------------------------------

  async getPublishedHotels(
    page: number = 1,
    limit: number = 20
  ) {
    const result =
      await this.findWithPagination({
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
      data: await this.resolveImages(
        result.data
      ),
    };
  }

  async getHotelBySlug(
    slug: string
  ): Promise<HotelRecord | null> {
    const { data, error } =
      await this.supabase
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

    const hotel = data as HotelRecord;

    const [resolved] =
      await this.resolveImages([
        {
          ...hotel,
          thumbnail:
            hotel.thumbnail ?? null,
          total_reviews:
            hotel.total_reviews ?? null,
          gallery:
            hotel.gallery ?? null,
        },
      ]);

    return resolved;
  }

  // ---------------------------------------------------------------------------
  // ADMIN HOTEL CRUD
  // ---------------------------------------------------------------------------

  async getAllHotels(
    page: number = 1,
    limit: number = 20
  ) {
    const result =
      await this.findWithPagination({
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
      data: result.data.map((hotel) => ({
        ...hotel,
        thumbnail:
          hotel.thumbnail ?? null,
        total_reviews:
          hotel.total_reviews ?? null,
        gallery:
          hotel.gallery ?? null,
      })),
    };
  }

  async getAllHotelsPaginated(
    page: number = 1,
    limit: number = 20
  ) {
    return this.getAllHotels(
      page,
      limit
    );
  }

  async getHotelById(
    id: string
  ): Promise<HotelRecord | null> {
    const hotel =
      await this.findById(id);

    if (!hotel) {
      return null;
    }

    return {
      ...hotel,
      thumbnail:
        hotel.thumbnail ?? null,
      total_reviews:
        hotel.total_reviews ?? null,
      gallery:
        hotel.gallery ?? null,
    };
  }

  async createHotel(
    data: Parameters<
      BaseRepository<HotelRecord>["create"]
    >[0]
  ) {
    const created =
      await this.create(data);

    return {
      ...created,
      thumbnail:
        created.thumbnail ?? null,
      total_reviews:
        created.total_reviews ?? null,
      gallery:
        created.gallery ?? null,
    };
  }

  async updateHotel(
    id: string,
    data: Parameters<
      BaseRepository<HotelRecord>["update"]
    >[1]
  ) {
    const updated =
      await this.update(
        id,
        data
      );

    return {
      ...updated,
      thumbnail:
        updated.thumbnail ?? null,
      total_reviews:
        updated.total_reviews ?? null,
      gallery:
        updated.gallery ?? null,
    };
  }

  async deleteHotel(
    id: string
  ): Promise<boolean> {
    await this.softDeleteById(id);
    return true;
  }

  // ---------------------------------------------------------------------------
  // ADMIN HOTEL IMAGES
  // ---------------------------------------------------------------------------

  async listHotelImages(
    hotelId: string
  ): Promise<HotelImageRow[]> {
    const { data, error } =
      await this.supabase
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

    return (data ??
      []) as HotelImageRow[];
  }

  async getHotelImageById(
    imageId: string
  ): Promise<HotelImageRow | null> {
    const { data, error } =
      await this.supabase
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
    const { data, error } =
      await this.supabase
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
    const { error } =
      await this.supabase
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
    const { error } =
      await this.supabase
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
