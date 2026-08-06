import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database.types";

export type HotelRecord = Database["public"]["Tables"]["hotels"]["Row"];
export type HotelInsert = Database["public"]["Tables"]["hotels"]["Insert"];
export type HotelUpdate = Database["public"]["Tables"]["hotels"]["Update"];

export type HotelImageRecord =
  Database["public"]["Tables"]["hotel_images"]["Row"];

export type HotelImageInsert =
  Database["public"]["Tables"]["hotel_images"]["Insert"];


export class HotelRepository {

  constructor(
    private readonly supabase: SupabaseClient<Database>
  ) {}


  // =========================
  // Public Hotel Queries
  // =========================


  async getAllHotels(): Promise<HotelRecord[]> {

    const { data, error } = await this.supabase
      .from("hotels")
      .select("*")
      .order("created_at", {
        ascending: false,
      });


    if (error) {
      throw new Error(
        `Failed to fetch hotels: ${error.message}`
      );
    }


    return data || [];
  }




  async getAllHotelsPaginated(
    page: number = 1,
    limit: number = 20
  ): Promise<{
    data: HotelRecord[];
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  }> {


    const offset = (page - 1) * limit;


    const { data, error, count } =
      await this.supabase
        .from("hotels")
        .select("*", {
          count: "exact",
        })
        .order("created_at", {
          ascending: false,
        })
        .range(
          offset,
          offset + limit - 1
        );


    if (error) {
      throw new Error(
        `Failed to fetch hotels: ${error.message}`
      );
    }


    const total = count ?? 0;

    const totalPages = Math.ceil(
      total / limit
    );


    return {
      data: data || [],
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }




  async getPublishedHotels(
    page: number = 1,
    limit: number = 10
  ): Promise<{
    data: HotelRecord[];
    count: number;
  }> {


    const offset =
      (page - 1) * limit;


    const {
      data,
      error,
      count,
    } = await this.supabase
      .from("hotels")
      .select("*", {
        count: "exact",
      })
      .eq(
        "is_published",
        true
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      )
      .range(
        offset,
        offset + limit - 1
      );


    if (error) {
      throw new Error(
        `Failed to fetch published hotels: ${error.message}`
      );
    }


    return {
      data: data || [],
      count: count ?? 0,
    };
  }




  async getHotelById(
    id: string
  ): Promise<HotelRecord | null> {


    const {
      data,
      error,
    } = await this.supabase
      .from("hotels")
      .select("*")
      .eq(
        "id",
        id
      )
      .maybeSingle();


    if (error) {
      throw new Error(
        `Failed to fetch hotel by id: ${error.message}`
      );
    }


    return data;
  }




  async getHotelBySlug(
    slug: string
  ): Promise<HotelRecord | null> {


    const {
      data,
      error,
    } = await this.supabase
      .from("hotels")
      .select("*")
      .eq(
        "slug",
        slug
      )
      .maybeSingle();


    if (error) {
      throw new Error(
        `Failed to fetch hotel by slug: ${error.message}`
      );
    }


    return data;
  }




  // =========================
  // Admin Hotel CRUD
  // =========================


  async createHotel(
    hotel: HotelInsert
  ): Promise<HotelRecord> {


    const {
      data,
      error,
    } = await this.supabase
      .from("hotels")
      .insert(hotel)
      .select()
      .single();


    if (error) {
      throw new Error(
        `Failed to create hotel: ${error.message}`
      );
    }


    return data;
  }




  async updateHotel(
    id: string,
    hotel: HotelUpdate
  ): Promise<HotelRecord> {


    const {
      data,
      error,
    } = await this.supabase
      .from("hotels")
      .update(hotel)
      .eq(
        "id",
        id
      )
      .select()
      .single();


    if (error) {
      throw new Error(
        `Failed to update hotel: ${error.message}`
      );
    }


    return data;
  }




  async deleteHotel(
    id: string
  ): Promise<void> {


    const {
      error,
    } = await this.supabase
      .from("hotels")
      .delete()
      .eq(
        "id",
        id
      );


    if (error) {
      throw new Error(
        `Failed to delete hotel: ${error.message}`
      );
    }
  }




  // =========================
  // ADMIN-07 Hotel Images
  // =========================


  async listHotelImages(
    hotelId: string
  ): Promise<HotelImageRecord[]> {


    const {
      data,
      error,
    } = await this.supabase
      .from("hotel_images")
      .select("*")
      .eq(
        "hotel_id",
        hotelId
      )
      .order(
        "sort_order",
        {
          ascending: true,
        }
      );


    if (error) {
      throw new Error(
        `Failed to fetch hotel images: ${error.message}`
      );
    }


    return data || [];
  }




  async insertHotelImageRow(
    image: HotelImageInsert
  ): Promise<HotelImageRecord> {


    const {
      data,
      error,
    } = await this.supabase
      .from("hotel_images")
      .insert(image)
      .select()
      .single();


    if (error) {
      throw new Error(
        `Failed to insert hotel image: ${error.message}`
      );
    }


    return data;
  }




  async setPrimaryHotelImage(
    hotelId: string,
    imageId: string
  ): Promise<void> {


    const {
      error: resetError,
    } = await this.supabase
      .from("hotel_images")
      .update({
        is_primary: false,
      })
      .eq(
        "hotel_id",
        hotelId
      );


    if (resetError) {
      throw new Error(
        `Failed to reset primary image: ${resetError.message}`
      );
    }



    const {
      error,
    } = await this.supabase
      .from("hotel_images")
      .update({
        is_primary: true,
      })
      .eq(
        "id",
        imageId
      );


    if (error) {
      throw new Error(
        `Failed to set primary image: ${error.message}`
      );
    }
  }





  async updateHotelImageSortOrder(
    imageId: string,
    sortOrder: number
  ): Promise<void> {


    const {
      error,
    } = await this.supabase
      .from("hotel_images")
      .update({
        sort_order: sortOrder,
      })
      .eq(
        "id",
        imageId
      );


    if (error) {
      throw new Error(
        `Failed to update image sort order: ${error.message}`
      );
    }
  }





  async deleteHotelImageRow(
    imageId: string
  ): Promise<void> {


    const {
      error,
    } = await this.supabase
      .from("hotel_images")
      .delete()
      .eq(
        "id",
        imageId
      );


    if (error) {
      throw new Error(
        `Failed to delete hotel image: ${error.message}`
      );
    }
  }

}
