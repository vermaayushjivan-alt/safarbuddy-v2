import { BaseRepository } from './base.repository';
import { SupabaseClientType, DatabaseRecord } from './types';

export interface DestinationRecord extends DatabaseRecord {
  id: string;
  name: string;
  slug: string;
  state: string | null;
  thumbnail: string | null;
  banner: string | null;
  description: string | null;
  is_featured: boolean;
  status: string;
}

export interface DestinationImageRow {
  id: string;
  destination_id: string;
  storage_path: string;
  is_primary: boolean;
  sort_order: number;
}

export class DestinationRepository extends BaseRepository<DestinationRecord> {
  constructor(supabase: SupabaseClientType) {
    super(supabase, {
      tableName: 'destinations',
      softDelete: false,
    });
  }

  // --- HOME-03 ---

  // DEST-IMG-01: the destinations table has no thumbnail/banner columns.
  // Both are filled here, at read time, from the destination's primary
  // photo in destination_images (same approach as hotels). If the table
  // is missing or a query fails, the destinations are returned unchanged
  // (thumbnail/banner null -> gradient fallback) so public pages never
  // break because of photos.
  private async withImages(
    rows: DestinationRecord[]
  ): Promise<DestinationRecord[]> {
    if (rows.length === 0) return rows;

    const { data, error } = await this.supabase
      .from('destination_images')
      .select('destination_id, storage_path, is_primary, sort_order')
      .in('destination_id', rows.map((row) => row.id))
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('[destinations] withImages failed', error.message);
      return rows.map((row) => ({
        ...row,
        thumbnail: row.thumbnail ?? null,
        banner: row.banner ?? null,
      }));
    }

    const pathByDestination = new Map<string, string>();
    for (const img of (data ?? []) as {
      destination_id: string;
      storage_path: string;
      is_primary: boolean;
    }[]) {
      // First image by sort order wins, unless a primary image exists.
      if (!pathByDestination.has(img.destination_id) || img.is_primary) {
        pathByDestination.set(img.destination_id, img.storage_path);
      }
    }

    return rows.map((row) => {
      const storagePath = pathByDestination.get(row.id);
      if (!storagePath) {
        return {
          ...row,
          thumbnail: row.thumbnail ?? null,
          banner: row.banner ?? null,
        };
      }

      const normalizedPath = storagePath.startsWith('destination-images/')
        ? storagePath.slice('destination-images/'.length)
        : storagePath;

      const { data: publicUrlData } = this.supabase.storage
        .from('destination-images')
        .getPublicUrl(normalizedPath);

      return {
        ...row,
        thumbnail: publicUrlData.publicUrl,
        banner: publicUrlData.publicUrl,
      };
    });
  }

  async getFeaturedDestinations(
    limit: number = 8
  ): Promise<DestinationRecord[]> {
    const rows = await this.findMany({
      filters: [
        { column: 'is_featured', operator: 'eq', value: true },
      ],
      sort: { column: 'name', ascending: true },
      pagination: { page: 1, limit },
    });

    return this.withImages(rows);
  }


  // --- PUBLIC-01: Public Marketing Pages ---

  async getAllPublicDestinations(
    page: number = 1,
    limit: number = 20
  ) {
    return this.findWithPagination({
      sort: { column: 'name', ascending: true },
      pagination: { page, limit },
    });
  }


  async getDestinationBySlug(
    slug: string
  ): Promise<DestinationRecord | null> {

    const { data, error } = await this.supabase
      .from('destinations')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }

      throw new Error(
        `Failed to get destination by slug: ${error.message}`
      );
    }

    const [withImage] = await this.withImages([data as DestinationRecord]);
    return withImage;
  }


  // --- ADMIN-06: Destination CRUD ---

  async getAllDestinations(
    page: number = 1,
    limit: number = 20
  ) {
    const result = await this.findWithPagination({
      sort: { column: 'created_at', ascending: false },
      pagination: { page, limit },
    });

    return { ...result, data: await this.withImages(result.data) };
  }


  async getDestinationById(
    id: string
  ): Promise<DestinationRecord | null> {
    return this.findById(id);
  }


  async createDestination(
    data: Parameters<BaseRepository<DestinationRecord>['create']>[0]
  ) {
    return this.create(data);
  }


  async updateDestination(
    id: string,
    data: Parameters<BaseRepository<DestinationRecord>['update']>[1]
  ) {
    return this.update(id, data);
  }


  async deleteDestination(
    id: string
  ): Promise<boolean> {
    return this.delete(id);
  }


  // --- ADMIN-07: Destination Image Management ---

  async listDestinationImages(
    destinationId: string
  ): Promise<DestinationImageRow[]> {

    const { data, error } = await this.supabase
      .from('destination_images')
      .select(
        'id, destination_id, storage_path, is_primary, sort_order'
      )
      .eq('destination_id', destinationId)
      .order('sort_order', { ascending: true });


    if (error) {
      throw new Error(
        `Failed to list destination images: ${error.message}`
      );
    }

    return (data ?? []) as DestinationImageRow[];
  }


  async getDestinationImageById(
    imageId: string
  ): Promise<DestinationImageRow | null> {

    const { data, error } = await this.supabase
      .from('destination_images')
      .select(
        'id, destination_id, storage_path, is_primary, sort_order'
      )
      .eq('id', imageId)
      .single();


    if (error) {
      if (error.code === 'PGRST116') return null;

      throw new Error(
        `Failed to get destination image: ${error.message}`
      );
    }

    return data as DestinationImageRow;
  }


  async insertDestinationImageRow(
    destinationId: string,
    storagePath: string,
    isPrimary: boolean,
    sortOrder: number
  ): Promise<DestinationImageRow> {

    const { data, error } = await this.supabase
      .from('destination_images')
      .insert({
        destination_id: destinationId,
        storage_path: storagePath,
        is_primary: isPrimary,
        sort_order: sortOrder,
      })
      .select(
        'id, destination_id, storage_path, is_primary, sort_order'
      )
      .single();


    if (error) {
      throw new Error(
        `Failed to insert destination image row: ${error.message}`
      );
    }

    return data as DestinationImageRow;
  }


  async setPrimaryDestinationImage(
    destinationId: string,
    imageId: string
  ): Promise<void> {

    const { error: clearError } = await this.supabase
      .from('destination_images')
      .update({ is_primary: false })
      .eq('destination_id', destinationId);


    if (clearError) {
      throw new Error(
        `Failed to clear primary flags: ${clearError.message}`
      );
    }


    const { error: setError } = await this.supabase
      .from('destination_images')
      .update({ is_primary: true })
      .eq('id', imageId);


    if (setError) {
      throw new Error(
        `Failed to set primary image: ${setError.message}`
      );
    }
  }


  async updateDestinationImageSortOrder(
    imageId: string,
    sortOrder: number
  ): Promise<void> {

    const { error } = await this.supabase
      .from('destination_images')
      .update({ sort_order: sortOrder })
      .eq('id', imageId);


    if (error) {
      throw new Error(
        `Failed to update sort order: ${error.message}`
      );
    }
  }


  async deleteDestinationImageRow(
    imageId: string
  ): Promise<void> {

    const { error } = await this.supabase
      .from('destination_images')
      .delete()
      .eq('id', imageId);


    if (error) {
      throw new Error(
        `Failed to delete destination image row: ${error.message}`
      );
    }
  }
}
