// lib/repositories/package.repository.ts
import { BaseRepository } from './base.repository';
import { SupabaseClientType, DatabaseRecord } from './types';

export interface PackageRecord extends DatabaseRecord {
  id: string;
  package_name: string;
  slug: string;
  thumbnail: string | null;
  description: string | null;
  city: string | null;
  duration: string | null;
  starting_price: number | null;
  is_featured: boolean;
  status: string;
}

export interface PackageImageRow {
  id: string;
  package_id: string;
  storage_path: string;
  is_primary: boolean;
  sort_order: number;
}

const DEFAULT_PACKAGE_PLACEHOLDER = '/images/placeholders/default-package.webp';

export class PackageRepository extends BaseRepository<PackageRecord> {
  constructor(supabase: SupabaseClientType) {
    super(supabase, {
      tableName: 'packages',
      softDelete: false,
    });
  }

  async getFeaturedPackages(limit: number = 8): Promise<PackageRecord[]> {
    const packages = await this.findMany({
      filters: [
        { column: 'status', operator: 'eq', value: 'ACTIVE' },
        { column: 'is_featured', operator: 'eq', value: true },
      ],
      sort: { column: 'package_name', ascending: true },
      pagination: { page: 1, limit },
    });

    return this.resolveImages(packages);
  }

  // P1 fix — PACKAGE-PUBLIC-01: public paginated listing for the new
  // /packages page (src/app/packages/page.tsx). Mirrors
  // HotelRepository.getPublishedHotels exactly (same filter/sort/
  // pagination shape); uses 'ACTIVE' per the status convention already
  // established by getFeaturedPackages above.
  async getPublishedPackages(page: number = 1, limit: number = 20) {
    const result = await this.findWithPagination({
      filters: [{ column: 'status', operator: 'eq', value: 'ACTIVE' }],
      sort: { column: 'created_at', ascending: false },
      pagination: { page, limit },
    });

    return {
      ...result,
      data: await this.resolveImages(result.data),
    };
  }

  /**
   * Populates the existing `thumbnail` field using a 2-tier fallback:
   * 1. Real image from package_images (Supabase Storage public URL)
   * 2. Default local placeholder
   *
   * No filesystem dependency. No new fields. When storage_path is
   * populated later via the Admin Panel, this automatically returns the
   * real URL — no code change required anywhere else.
   */
  private async resolveImages(
    packages: PackageRecord[]
  ): Promise<PackageRecord[]> {
    if (packages.length === 0) return packages;

    const packageIds = packages.map((p) => p.id);

    const { data: images, error } = await this.supabase
      .from('package_images')
      .select('package_id, storage_path, is_primary, sort_order')
      .in('package_id', packageIds)
      .order('sort_order', { ascending: true });

    const primaryPathByPackageId = new Map<string, string>();
    if (!error && images) {
      for (const img of images as PackageImageRow[]) {
        const current = primaryPathByPackageId.get(img.package_id);
        if (!current || img.is_primary) {
          primaryPathByPackageId.set(img.package_id, img.storage_path);
        }
      }
    }

    return packages.map((pkg) => {
      const storagePath = primaryPathByPackageId.get(pkg.id);
      if (storagePath) {
        const { data: publicUrlData } = this.supabase.storage
          .from('package-images')
          .getPublicUrl(storagePath);

        return { ...pkg, thumbnail: publicUrlData.publicUrl };
      }

      return { ...pkg, thumbnail: DEFAULT_PACKAGE_PLACEHOLDER };
    });
  }

  // --- ADMIN-04: minimal public exposure of BaseRepository ---
  // Mirrors ADMIN-02's HotelRepository wrapper pattern. Package uses
  // softDelete: false, so deletePackage() calls the hard delete() rather
  // than softDeleteById().

  async getAllPackages(page: number = 1, limit: number = 20) {
    return this.findWithPagination({
      sort: { column: 'created_at', ascending: false },
      pagination: { page, limit },
    });
  }

  async getPackageById(id: string): Promise<PackageRecord | null> {
    return this.findById(id);
  }

  async createPackage(
    data: Parameters<BaseRepository<PackageRecord>['create']>[0]
  ) {
    return this.create(data);
  }

  async updatePackage(
    id: string,
    data: Parameters<BaseRepository<PackageRecord>['update']>[1]
  ) {
    return this.update(id, data);
  }

  async deletePackage(id: string): Promise<boolean> {
    return this.delete(id);
  }

  // --- ADMIN-05: package_images table CRUD only. No Storage calls here. ---

  async listPackageImages(packageId: string): Promise<PackageImageRow[]> {
    const { data, error } = await this.supabase
      .from('package_images')
      .select('id, package_id, storage_path, is_primary, sort_order')
      .eq('package_id', packageId)
      .order('sort_order', { ascending: true });

    if (error) {
      throw new Error(`Failed to list package images: ${error.message}`);
    }

    return (data ?? []) as PackageImageRow[];
  }

  async getPackageImageById(imageId: string): Promise<PackageImageRow | null> {
    const { data, error } = await this.supabase
      .from('package_images')
      .select('id, package_id, storage_path, is_primary, sort_order')
      .eq('id', imageId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to get package image: ${error.message}`);
    }

    return data as PackageImageRow;
  }

  async insertPackageImageRow(
    packageId: string,
    storagePath: string,
    isPrimary: boolean,
    sortOrder: number
  ): Promise<PackageImageRow> {
    const { data, error } = await this.supabase
      .from('package_images')
      .insert({
        package_id: packageId,
        storage_path: storagePath,
        is_primary: isPrimary,
        sort_order: sortOrder,
      })
      .select('id, package_id, storage_path, is_primary, sort_order')
      .single();

    if (error) {
      throw new Error(`Failed to insert package image row: ${error.message}`);
    }

    return data as PackageImageRow;
  }

  async setPrimaryPackageImage(packageId: string, imageId: string): Promise<void> {
    const { error: clearError } = await this.supabase
      .from('package_images')
      .update({ is_primary: false })
      .eq('package_id', packageId);

    if (clearError) {
      throw new Error(`Failed to clear primary flags: ${clearError.message}`);
    }

    const { error: setError } = await this.supabase
      .from('package_images')
      .update({ is_primary: true })
      .eq('id', imageId);

    if (setError) {
      throw new Error(`Failed to set primary image: ${setError.message}`);
    }
  }

  async updatePackageImageSortOrder(imageId: string, sortOrder: number): Promise<void> {
    const { error } = await this.supabase
      .from('package_images')
      .update({ sort_order: sortOrder })
      .eq('id', imageId);

    if (error) {
      throw new Error(`Failed to update sort order: ${error.message}`);
    }
  }

  async deletePackageImageRow(imageId: string): Promise<void> {
    const { error } = await this.supabase
      .from('package_images')
      .delete()
      .eq('id', imageId);

    if (error) {
      throw new Error(`Failed to delete package image row: ${error.message}`);
    }
  }
}
