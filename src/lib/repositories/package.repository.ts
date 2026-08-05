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

interface PackageImageRow {
  package_id: string;
  storage_path: string;
  is_primary: boolean;
  sort_order: number;
}

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

    return this.attachPrimaryImages(packages);
  }

  /**
   * Resolves each package's primary image from package_images (canonical
   * source per verified production schema) and populates it into the
   * existing `thumbnail` field for backward compatibility. Falls back to
   * the package's existing thumbnail value if no image row is found or
   * the storage lookup fails.
   */
  private async attachPrimaryImages(
    packages: PackageRecord[]
  ): Promise<PackageRecord[]> {
    if (packages.length === 0) return packages;

    const packageIds = packages.map((p) => p.id);

    const { data: images, error } = await this.supabase
      .from('package_images')
      .select('package_id, storage_path, is_primary, sort_order')
      .in('package_id', packageIds)
      .order('sort_order', { ascending: true });

    if (error || !images) {
      return packages;
    }

    const primaryPathByPackageId = new Map<string, string>();
    for (const img of images as PackageImageRow[]) {
      const current = primaryPathByPackageId.get(img.package_id);
      if (!current || img.is_primary) {
        primaryPathByPackageId.set(img.package_id, img.storage_path);
      }
    }

    return packages.map((pkg) => {
      const storagePath = primaryPathByPackageId.get(pkg.id);
      if (!storagePath) return pkg;

      const { data: publicUrlData } = this.supabase.storage
        .from('package-images')
        .getPublicUrl(storagePath);

      return {
        ...pkg,
        thumbnail: publicUrlData.publicUrl,
      };
    });
  }
}
