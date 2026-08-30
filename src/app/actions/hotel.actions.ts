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
import { VendorRepository } from '@/lib/repositories/vendor.repository';
import {
  runAction,
  emptyToNull,
  type ActionResult,
} from '@/lib/actions/action-result';
import { slugify } from '@/lib/utils/format';

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

  // ROOT CAUSE FIX (public hotel 404): the admin Slug field was raw free
  // text with no canonicalization anywhere in the write path, so it could
  // (and did) get saved with spaces/mixed case — e.g. "shri sitaram seva
  // trust" — which the public /hotels/[slug] route then failed to match
  // via an exact-value lookup. Every create/update now runs the value
  // through the project's existing slugify() (src/lib/utils/format.ts,
  // previously unused) so a canonical, URL-safe slug is guaranteed
  // regardless of what staff types.
  slug: z
    .string()
    .min(1, 'Slug is required')
    .transform((value) => slugify(value))
    .refine((value) => value.length > 0, {
      message: 'Slug must contain at least one letter or number.',
    }),

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

  // CONTACT-01: hotels.phone/email/website already existed as live DB
  // columns (verified against information_schema, SESSION 03 — see
  // HotelRecord comment) but were never exposed on this form, so a
  // standalone hotel (no vendor_id) had no way to record how it should
  // be contacted for booking notifications. All three are optional,
  // matching the DB's nullable columns.
  phone: z.preprocess(
    emptyToNull,
    z
      .string()
      .trim()
      .min(7, 'Enter a valid phone number')
      .max(20, 'Phone number is too long')
      .nullable()
      .optional()
  ),

  email: z.preprocess(
    emptyToNull,
    z
      .string()
      .trim()
      .email('Enter a valid email address')
      .nullable()
      .optional()
  ),

  website: z.preprocess(
    emptyToNull,
    z
      .string()
      .trim()
      .url('Enter a valid URL, e.g. https://example.com')
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

// --- VENDOR-03 M4: Admin Approval Queue for Self-Service Listings ---
//
// RULE 15 audit: M2 (/list-your-property, property-listing.actions.ts)
// has been creating hotels+vendors with status='pending' since
// 2026-08-28, but no admin-facing review/approve/reject flow existed
// anywhere in the repo (confirmed by grep across src/ for
// approve|reject|pending before writing this) -- the only way to flip
// hotel.status was the generic Edit Hotel form, which never touches
// the linked vendor row, so "approving" a listing that way could leave
// its vendor stuck on 'pending' indefinitely. This adds the missing
// queue, per the M4 scope already named in PROJECT_STATUS.md.
//
// Reject uses 'suspended' -- HOTEL_STATUS_VALUES (hotels_status_check)
// has no 'rejected' member, and RULE 8 forbids inventing one.

export async function getPendingHotelsAdmin(page: number = 1, limit: number = 20) {
  await requireRole(['admin', 'super_admin']);

  const supabase = await createClient();
  const repo = new HotelRepository(supabase);

  return repo.getHotelsByStatus('pending', page, limit);
}

export async function approveHotelAdmin(
  id: string
): Promise<ActionResult<HotelRecord>> {
  return runAction(async () => {
    await requireRole(['admin', 'super_admin']);

    const supabase = await createClient();
    const hotelRepo = new HotelRepository(supabase);

    const hotel = await hotelRepo.getHotelById(id);
    if (!hotel) {
      throw new Error('Hotel not found.');
    }

    const updated = await hotelRepo.updateHotel(id, { status: 'active' });

    // Also activate the linked vendor -- but only if it's still
    // 'pending'. Never overwrite a vendor status an admin may have
    // already changed some other way (e.g. suspended for a different
    // reason).
    if (hotel.vendor_id) {
      const vendorRepo = new VendorRepository(supabase);
      const vendor = await vendorRepo.getVendorById(hotel.vendor_id);
      if (vendor && vendor.status === 'pending') {
        await vendorRepo.updateVendor(hotel.vendor_id, { status: 'active' });
      }
    }

    return updated;
  });
}

export async function rejectHotelAdmin(
  id: string
): Promise<ActionResult<HotelRecord>> {
  return runAction(async () => {
    await requireRole(['admin', 'super_admin']);

    const supabase = await createClient();
    const hotelRepo = new HotelRepository(supabase);

    const hotel = await hotelRepo.getHotelById(id);
    if (!hotel) {
      throw new Error('Hotel not found.');
    }

    // Vendor status intentionally left untouched on reject -- a
    // rejected listing does not mean the vendor account itself should
    // be suspended (they may have, or may later submit, other
    // properties).
    return hotelRepo.updateHotel(id, { status: 'suspended' });
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

// PUBLIC-02 — public read for the hotel gallery. Root cause this fixes:
// the public detail page only ever had `hotel.thumbnail` (a single
// image resolved from whichever row is is_primary), because no public
// action ever called HotelRepository.listHotelImages — that method was
// only ever exposed via the admin-gated getHotelImagesAdmin above. This
// is the same "admin-only read" pattern that also hid rooms/prices from
// the public site. No auth required, matches getHotelBySlug's public
// pattern. Does not modify HotelRepository or the admin action.
export async function getHotelGalleryImages(
  hotelId: string
): Promise<HotelImageWithUrl[]> {
  const supabase = await createClient();
  const repo = new HotelRepository(supabase);

  const rows = await repo.listHotelImages(hotelId);

  return rows.map((row) => {
    const normalizedPath = normalizeHotelStoragePath(row.storage_path);

    const { data: publicUrlData } = supabase.storage
      .from('hotel-images')
      .getPublicUrl(normalizedPath);

    return {
      ...row,
      publicUrl: publicUrlData.publicUrl,
    };
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
  
