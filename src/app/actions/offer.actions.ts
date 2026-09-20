'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/session';
import { OfferRepository, OfferRecord } from '@/lib/repositories/offer.repository';
import { runAction, emptyToNull, type ActionResult } from '@/lib/actions/action-result';

export async function getActiveOffers(): Promise<OfferRecord[]> {
  const supabase = await createClient();
  const repo = new OfferRepository(supabase);
  return repo.getActiveOffers(5);
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
  status: z.string().min(1, 'Status is required'),
  banner_image: z.preprocess(emptyToNull, z.string().nullable().optional()),
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
    const supabase = await createClient();
    const repo = new OfferRepository(supabase);
    return repo.createOffer(parsed);
  });
}

export async function updateOfferAdmin(
  id: string,
  input: OfferInput
): Promise<ActionResult<OfferRecord>> {
  return runAction(async () => {
    await requireRole(['admin', 'super_admin']);
    const parsed = offerInputSchema.parse(input);
    const supabase = await createClient();
    const repo = new OfferRepository(supabase);
    return repo.updateOffer(id, parsed);
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
