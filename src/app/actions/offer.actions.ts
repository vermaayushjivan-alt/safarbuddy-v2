'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/session';
import { OfferRepository, OfferRecord } from '@/lib/repositories/offer.repository';
import {
  HotelRepository,
  type HotelRecord,
  type HotelOption,
} from '@/lib/repositories/hotel.repository';
import { runAction, emptyToNull, type ActionResult } from '@/lib/actions/action-result';

// Homepage strip uses the default (5); the public /offers page passes a
// larger limit so "View all offers" really shows all of them.
export async function getActiveOffers(limit: number = 5): Promise<OfferRecord[]> {
  const supabase = await createClient();
  const repo = new OfferRepository(supabase);
  return repo.getActiveOffers(limit);
}

// --- OFFER-HOTELS-01: offer -> hotels ---
//
// Public (no requireRole, by design — same as getActiveOffers above): the
// homepage "Book now" button and /offers/[id] are visited by anonymous
// users. Only a LIVE offer is returned, and only its ACTIVE, non-deleted
// hotels (HotelRepository.getPublishedHotelsByIds), so linking a hotel to
// an offer can never expose a hotel that is not already public.
export async function getActiveOfferWithHotels(
  offerId: string
): Promise<{ offer: OfferRecord; hotels: HotelRecord[] } | null> {
  const supabase = await createClient();
  const offerRepo = new OfferRepository(supabase);

  const offer = await offerRepo.getActiveOfferById(offerId);
  if (!offer) return null;

  const hotelIds = await offerRepo.getHotelIdsForOffer(offer.id);
  const hotelRepo = new HotelRepository(supabase);
  const hotels = await hotelRepo.getPublishedHotelsByIds(hotelIds);

  return { offer, hotels };
}

// --- ADMIN-08 follow-up: Image Upload ---
//
// The milestone's own original note above (offerInputSchema comment)
// said Storage/bucket logic was explicitly out of scope. That
// instruction has changed per chat — this mirrors
// uploadPromotionLogoAdmin's (PROMO-01) validation/upload pattern,
// but uses createClient() rather than createServiceRoleClient(), to
// stay consistent with the rest of this file's admin writes (all of
// which already use the session client, unlike promotion.actions.ts).
// Requires migration 026 (offer-images public bucket) to be run first.

const OFFER_IMAGE_ALLOWED_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

const OFFER_IMAGE_MAX_SIZE_BYTES = 5 * 1024 * 1024;

function offerImageExtensionFromMimeType(mimeType: string): string {
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

export async function uploadOfferImageAdmin(
  file: File
): Promise<ActionResult<{ url: string }>> {
  return runAction(async () => {
    await requireRole(['admin', 'super_admin']);

    if (!OFFER_IMAGE_ALLOWED_TYPES.includes(file.type)) {
      throw new Error('Only jpg, jpeg, png, and webp files are allowed.');
    }

    if (file.size > OFFER_IMAGE_MAX_SIZE_BYTES) {
      throw new Error('Image must be 5MB or smaller.');
    }

    const supabase = await createClient();

    const ext = offerImageExtensionFromMimeType(file.type);
    const objectKey = `${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('offer-images')
      .upload(objectKey, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Failed to upload image: ${uploadError.message}`);
    }

    const { data: publicUrlData } = supabase.storage
      .from('offer-images')
      .getPublicUrl(objectKey);

    return { url: publicUrlData.publicUrl };
  });
}

// --- ADMIN-08: Offer Management (CRUD) ---
// Mirrors destination.actions.ts (ADMIN-06). status kept as a validated
// non-empty string (not a hardcoded enum) — no enum is confirmed for
// offers.status anywhere in the codebase (only the literal 'ACTIVE' is
// used as a filter value in getActiveOffers). image is left as a plain
// optional string passthrough — no Storage/bucket logic is added here;
// that is out of scope for this milestone per explicit instruction.

// SCHEMA-FIX-01 (this session): the live `offers` table's actual
// column is `banner_image`, confirmed via information_schema — this
// schema/action previously used `image` throughout (form, this Zod
// schema, OfferRecord), which is why saving/editing an offer failed
// with "Could not find the 'image' column of 'offers' in the schema
// cache" (same class of error the project owner also hit for
// `discount`, which genuinely does exist — that one was a stale
// PostgREST cache, not a real mismatch; this one is a real mismatch).
// Renamed end-to-end (this file, offer.repository.ts, OfferForm.tsx,
// components/home/Offers.tsx) rather than aliasing, to match this
// project's stated preference for one true name over a translation
// layer for a field this simple.
const offerInputSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.preprocess(emptyToNull, z.string().nullable().optional()),
  discount: z.preprocess(emptyToNull, z.string().nullable().optional()),
  start_date: z.preprocess(emptyToNull, z.string().nullable().optional()),
  end_date: z.preprocess(emptyToNull, z.string().nullable().optional()),
  // Normalised to lowercase: the offers_public_read RLS policy only allows
  // status IN ('active','approved','published') (case-sensitive), so anything
  // else is invisible to public visitors.
  status: z
    .string()
    .trim()
    .min(1, 'Status is required')
    .transform((v) => v.toLowerCase()),
  banner_image: z.preprocess(emptyToNull, z.string().nullable().optional()),
  // OFFER-HOTELS-01: hotels this offer applies to (public.offer_hotels).
  // NOT a column on `offers` — split off before the row is written, see
  // createOfferAdmin/updateOfferAdmin.
  hotel_ids: z.array(z.string().uuid()).max(500).default([]),
});

export type OfferInput = z.infer<typeof offerInputSchema>;

export async function getAllOffersAdmin(page: number = 1, limit: number = 20) {
  await requireRole(['admin', 'super_admin']);
  const supabase = await createClient();
  const repo = new OfferRepository(supabase);
  return repo.getAllOffers(page, limit);
}

export async function getOfferByIdAdmin(id: string): Promise<OfferRecord | null> {
  await requireRole(['admin', 'super_admin']);
  const supabase = await createClient();
  const repo = new OfferRepository(supabase);
  return repo.getOfferById(id);
}

export async function createOfferAdmin(input: OfferInput): Promise<ActionResult<OfferRecord>> {
  return runAction(async () => {
    await requireRole(['admin', 'super_admin']);
    const parsed = offerInputSchema.parse(input);
    const { hotel_ids, ...offerData } = parsed;
    const supabase = await createClient();
    const repo = new OfferRepository(supabase);
    const created = await repo.createOffer(offerData);
    // If linking fails the offer already exists (without hotels); the
    // admin sees the error and can just open Edit and re-select hotels.
    await repo.setOfferHotels(created.id, hotel_ids);
    return created;
  });
}

export async function updateOfferAdmin(
  id: string,
  input: OfferInput
): Promise<ActionResult<OfferRecord>> {
  return runAction(async () => {
    await requireRole(['admin', 'super_admin']);
    const parsed = offerInputSchema.parse(input);
    const { hotel_ids, ...offerData } = parsed;
    const supabase = await createClient();
    const repo = new OfferRepository(supabase);
    const updated = await repo.updateOffer(id, offerData);
    await repo.setOfferHotels(id, hotel_ids);
    return updated;
  });
}

export async function deleteOfferAdmin(id: string): Promise<ActionResult<boolean>> {
  return runAction(async () => {
    await requireRole(['admin', 'super_admin']);
    const supabase = await createClient();
    const repo = new OfferRepository(supabase);
    return repo.deleteOffer(id);
  });
}

// --- OFFER-HOTELS-01: admin form helpers ---

export async function getOfferHotelIdsAdmin(offerId: string): Promise<string[]> {
  await requireRole(['admin', 'super_admin']);
  const supabase = await createClient();
  const repo = new OfferRepository(supabase);
  return repo.getHotelIdsForOffer(offerId);
}

export async function getHotelOptionsAdmin(): Promise<HotelOption[]> {
  await requireRole(['admin', 'super_admin']);
  const supabase = await createClient();
  const repo = new HotelRepository(supabase);
  return repo.listHotelOptions();
}
