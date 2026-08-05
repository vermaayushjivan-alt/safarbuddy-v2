// lib/repositories/package.repository.ts
import fs from 'fs';
import path from 'path';
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
const PACKAGE_PLACEHOLDER_DIR = path.join(
  process.cwd(),
  'public',
  'images',
  'placeholders',
  'packages'
);

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
   * Populates the existing `thumbnail` field using a 3-tier fallback:
   * 1. Real image from package_images (Supabase Storage public URL)
   * 2. Local per-slug placeholder (public/images/placeholders/packages/{slug}.webp)
   * 3. Default local placeholder
   *
   * No new fields introduced. When storage_path is populated later via the
   * Admin Panel, this automatically returns the real URL — no code change
   * required anywhere else.
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
      // Priority 1: real image from Supabase Storage
      const storagePath = primaryPathByPackageId.get(pkg.id);
      if (storagePath) {
        const { data: publicUrlData } = this.supabase.storage
          .from('package-images')
          .getPublicUrl(storagePath);

        return { ...pkg, thumbnail: publicUrlData.publicUrl };
      }

      // Priority 2: local per-slug placeholder, if it exists on disk
      if (pkg.slug) {
        const localPath = path.join(PACKAGE_PLACEHOLDER_DIR, `${pkg.slug}.webp`);
        if (fs.existsSync(localPath)) {
          return {
            ...pkg,
            thumbnail: `/images/placeholders/packages/${pkg.slug}.webp`,
          };
        }
      }

      // Priority 3: default placeholder
      return { ...pkg, thumbnail: DEFAULT_PACKAGE_PLACEHOLDER };
    });
  }
}
