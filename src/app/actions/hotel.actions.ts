'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/session';
import {
  HotelRepository,
  HotelRecord,
  HotelImageRow,
  HOTEL_STATUS_VALUES,
} from '@/lib/repositories/hotel.repository';
import {
  runAction,
  emptyToNull,
  type ActionResult,
} from '@/lib/actions/action-result';

// bookings.price_snapshot is numeric(10,2) — max representable value.
// hotel/package starting_price is copied into price_snapshot at booking
// time, so it must never be allowed to exceed this bound upstream.
const MAX_BOOKING_AMOUNT = 99_999_999.99;

// --- HOME-03: Trending Hotels (public, homepage) ---

export async function getTrendingHotels(
  limit: number = 6
): Promise<HotelRecord[]> {
  const supabase = await createClient();
  const repo = new HotelRepository(supabase);

  return repo.getTrendingHotels(limit);
}

// --- PUBLIC-01: Public Marketing Pages (/hotels, /hotels/[slug]) ---

export async function getPublishedHotels(
  page: number = 1,
  limit: number = 20
) {
  const supabase = await createClient();
  const repo = new HotelRepository(supabase);

  return repo.getPublishedHotels(page, limit);
}

export async function getHotelBySlug(
  slug: string
): Promise<HotelRecord | null> {
  const supabase = await createClient();
  const repo = new HotelRepository(supabase);

  return repo.getHotelBySlug(slug);
}

// --- ADMIN-02: Hotel Management (CRUD) ---

// HOTEL STATUS CONTRACT:
// public.hotels.status is CHECK-constrained to exactly:
// 'pending' | 'active' | 'inactive' | 'suspended'
//
// HOTEL_STATUS_VALUES comes directly from hotel.repository.ts,
// where it matches the verified Supabase database constraint.
const hotelInputSchema = z.object({
  hotel_name: z.string().min(1, 'Hotel name is required'),

  slug: z.string().min(1, 'Slug is required'),

  description: z.preprocess(
    emptyToNull,
    z.string().nullable().optional()
  ),

  city: z.preprocess(
    emptyToNull,
    z.string().nullable().optional()
  ),

  state: z.preprocess(
    emptyToNull,
    z.string().nullable().optional()
  ),

  country: z.preprocess(
    emptyToNull,
    z.string().nullable().optional()
  ),

  address: z.preprocess(
    emptyToNull,
    z.string().nullable().optional()
  ),

  latitude: z.preprocess(
    emptyToNull,
    z.number().nullable().optional()
  ),

  longitude: z.preprocess(
    emptyToNull,
    z.number().nullable().optional()
  ),

  star_rating: z.preprocess(
    emptyToNull,
    z
      .number()
      .min(0)
      .max(5)
      .nullable()
      .optional()
  ),

  starting_price: z.preprocess(
    emptyToNull,
    z
      .number()
      .min(0)
      .max(
        MAX_BOOKING_AMOUNT,
        'The amount is too large. Please enter a smaller value.'
      )
      .nullable()
      .optional()
  ),

  is_featured: z.boolean().optional(),

  // IMPORTANT:
  // Zod version in this project does not support `errorMap`
  // in z.enum() options. Use `message` instead.
  status: z.enum(HOTEL_STATUS_VALUES, {
    message: `Status must be one of: ${HOTEL_STATUS_VALUES.join(', ')}.`,
  }),

  // hotels.vendor_id is nullable.
  vendor_id: z.preprocess(
    emptyToNull,
    z
      .string()
      .uuid('Vendor must be a valid selection')
      .nullable()
      .optional()
  ),
});

export type HotelInput = z.infer<typeof hotelInputSchema>;

export async function getAllHotelsAdmin(
  page: number = 1,
  limit: number = 20
) {
  await requireRole(['admin', 'super_admin']);

  const supabase = await createClient();
  const repo = new HotelRepository(supabase);

  return repo.getAllHotelsPaginated(page, limit);
}

export async function getHotelByIdAdmin(
  id: string
): Promise<HotelRecord | null> {
  await requireRole(['admin', 'super_admin']);

  const supabase = await createClient();
  const repo = new HotelRepository(supabase);

  return repo.getHotelById(id);
}

export async function createHotelAdmin(
  input: HotelInput
): Promise<ActionResult<HotelRecord>> {
  return runAction(async () => {
    await requireRole(['admin', 'super_admin']);

    const parsed = hotelInputSchema.parse(input);

    const supabase = await createClient();
    const repo = new HotelRepository(supabase);

    return repo.createHotel(parsed);
  });
}

export async function updateHotelAdmin(
  id: string,
  input: HotelInput
): Promise<ActionResult<HotelRecord>> {
  return runAction(async () => {
    await requireRole(['admin', 'super_admin']);

    const parsed = hotelInputSchema.parse(input);

    const supabase = await createClient();
    const repo = new HotelRepository(supabase);

    return repo.updateHotel(id, parsed);
  });
}

export async function deleteHotelAdmin(
  id: string
): Promise<ActionResult<boolean>> {
  return runAction(async () => {
    await requireRole(['admin', 'super_admin']);

    const supabase = await createClient();
    const repo = new HotelRepository(supabase);

    return repo.deleteHotel(id);
  });
}

// --- ADMIN-03: Hotel Image Upload / Management ---

const HOTEL_ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

const HOTEL_MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

export interface HotelImageWithUrl extends HotelImageRow {
  publicUrl: string;
}

function normalizeHotelStoragePath(
  storagePath: string
): string {
  return storagePath.startsWith('hotel-images/')
    ? storagePath.slice('hotel-images/'.length)
    : storagePath;
}

function hotelExtensionFromMimeType(
  mimeType: string
): string {
  switch (mimeType) {
    case 'image/jpeg':
    case 'image/jpg':
      return 'jpg';

    case 'image/png':
      return 'png';

    case 'image/webp':
      return 'webp';

    default:
      return 'webp';
  }
}

// Image admin actions consistently return ActionResult<T>
// so Supabase / Storage / RLS errors surface to the client.

export async function getHotelImagesAdmin(
  hotelId: string
): Promise<ActionResult<HotelImageWithUrl[]>> {
  return runAction(async () => {
    await requireRole(['admin', 'super_admin']);

    const supabase = await createClient();
    const repo = new HotelRepository(supabase);

    const rows = await repo.listHotelImages(hotelId);

    return rows.map((row) => {
      const normalizedPath = normalizeHotelStoragePath(
        row.storage_path
      );

      const { data: publicUrlData } = supabase.storage
        .from('hotel-images')
        .getPublicUrl(normalizedPath);

      return {
        ...row,
        publicUrl: publicUrlData.publicUrl,
      };
    });
  });
}

export async function uploadHotelImageAdmin(
  hotelId: string,
  file: File,
  isPrimary: boolean
): Promise<ActionResult<HotelImageWithUrl>> {
  return runAction(async () => {
    await requireRole(['admin', 'super_admin']);

    if (!HOTEL_ALLOWED_IMAGE_TYPES.includes(file.type)) {
      throw new Error(
        'Only jpg, jpeg, png, and webp files are allowed.'
      );
    }

    if (file.size > HOTEL_MAX_IMAGE_SIZE_BYTES) {
      throw new Error(
        'Image must be 5MB or smaller.'
      );
    }

    const supabase = await createClient();
    const repo = new HotelRepository(supabase);

    const ext = hotelExtensionFromMimeType(file.type);

    const objectKey =
      `${hotelId}/${crypto.randomUUID()}.${ext}`;

    const storedPath = `hotel-images/${objectKey}`;

    const { error: uploadError } =
      await supabase.storage
        .from('hotel-images')
        .upload(objectKey, file, {
          contentType: file.type,
          upsert: false,
        });

    if (uploadError) {
      throw new Error(
        `Failed to upload image: ${uploadError.message}`
      );
    }

    const existing =
      await repo.listHotelImages(hotelId);

    const nextSortOrder =
      existing.length > 0
        ? Math.max(
            ...existing.map(
              (img) => img.sort_order
            )
          ) + 1
        : 0;

    const shouldBePrimary =
      isPrimary || existing.length === 0;

    const row =
      await repo.insertHotelImageRow(
        hotelId,
        storedPath,
        shouldBePrimary,
        nextSortOrder
      );

    if (
      shouldBePrimary &&
      existing.length > 0
    ) {
      await repo.setPrimaryHotelImage(
        hotelId,
        row.id
      );
    }

    const { data: publicUrlData } =
      supabase.storage
        .from('hotel-images')
        .getPublicUrl(objectKey);

    return {
      ...row,
      publicUrl:
        publicUrlData.publicUrl,
    };
  });
}

export async function setPrimaryHotelImageAdmin(
  hotelId: string,
  imageId: string
): Promise<ActionResult<true>> {
  return runAction(async () => {
    await requireRole(['admin', 'super_admin']);

    const supabase = await createClient();
    const repo = new HotelRepository(supabase);

    await repo.setPrimaryHotelImage(
      hotelId,
      imageId
    );

    return true as const;
  });
}

export async function reorderHotelImageAdmin(
  imageId: string,
  sortOrder: number
): Promise<ActionResult<true>> {
  return runAction(async () => {
    await requireRole(['admin', 'super_admin']);

    const supabase = await createClient();
    const repo = new HotelRepository(supabase);

    await repo.updateHotelImageSortOrder(
      imageId,
      sortOrder
    );

    return true as const;
  });
}

export async function deleteHotelImageAdmin(
  imageId: string
): Promise<ActionResult<true>> {
  return runAction(async () => {
    await requireRole(['admin', 'super_admin']);

    const supabase = await createClient();
    const repo = new HotelRepository(supabase);

    const row =
      await repo.getHotelImageById(imageId);

    if (!row) {
      throw new Error('Image not found.');
    }

    const normalizedPath =
      normalizeHotelStoragePath(
        row.storage_path
      );

    const { error: removeError } =
      await supabase.storage
        .from('hotel-images')
        .remove([normalizedPath]);

    if (removeError) {
      throw new Error(
        `Failed to delete image from storage: ${removeError.message}`
      );
    }

    await repo.deleteHotelImageRow(
      imageId
    );

    return true as const;
  });
}

// --- Pre-existing exports ---

export async function addHotelImageAction(
  hotelId: string,
  storagePath: string,
  isPrimary: boolean = false,
  sortOrder: number = 0
) {
  const supabase = await createClient();
  const repo = new HotelRepository(supabase);

  try {
    const newImage =
      await repo.insertHotelImageRow(
        hotelId,
        storagePath,
        isPrimary,
        sortOrder
      );

    return {
      success: true,
      data: newImage,
    };
  } catch (error: unknown) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Unknown error',
    };
  }
}

export async function createHotelImage(
  hotelId: string,
  storagePath: string,
  isPrimary: boolean = false,
  sortOrder: number = 0
) {
  const supabase = await createClient();
  const repo = new HotelRepository(supabase);

  try {
    const image =
      await repo.insertHotelImageRow(
        hotelId,
        storagePath,
        isPrimary,
        sortOrder
      );

    return {
      success: true,
      data: image,
    };
  } catch (error: unknown) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Unknown error',
    };
  }
}

export async function getHotelsAction(
  page: number = 1,
  limit: number = 20
) {
  const supabase = await createClient();
  const repo = new HotelRepository(supabase);

  try {
    const result =
      await repo.getAllHotelsPaginated(
        page,
        limit
      );

    return {
      success: true,
      data: result,
    };
  } catch (error: unknown) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Unknown error',
    };
  }
}

export async function getPublishedHotelsAction(
  page: number = 1,
  limit: number = 20
) {
  const supabase = await createClient();
  const repo = new HotelRepository(supabase);

  try {
    const result =
      await repo.getPublishedHotels(
        page,
        limit
      );

    return {
      success: true,
      data: result,
    };
  } catch (error: unknown) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Unknown error',
    };
  }
}

export async function getHotelBySlugAction(
  slug: string
) {
  const supabase = await createClient();
  const repo = new HotelRepository(supabase);

  try {
    const hotel =
      await repo.getHotelBySlug(slug);

    return {
      success: true,
      data: hotel,
    };
  } catch (error: unknown) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Unknown error',
    };
  }
}

export async function deleteHotelImageAction(
  imageId: string
) {
  const supabase = await createClient();
  const repo = new HotelRepository(supabase);

  try {
    await repo.deleteHotelImageRow(
      imageId
    );

    return {
      success: true,
    };
  } catch (error: unknown) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Unknown error',
    };
  }
}

export async function setPrimaryHotelImageAction(
  hotelId: string,
  imageId: string
) {
  const supabase = await createClient();
  const repo = new HotelRepository(supabase);

  try {
    await repo.setPrimaryHotelImage(
      hotelId,
      imageId
    );

    return {
      success: true,
    };
  } catch (error: unknown) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Unknown error',
    };
  }
}
