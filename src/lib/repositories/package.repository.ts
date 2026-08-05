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
}
