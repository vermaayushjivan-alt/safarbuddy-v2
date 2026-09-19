'use server';

import { z } from 'zod';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/session';
import {
  PromotionRepository,
  PromotionRecord,
  PROMOTION_SLOT_VALUES,
  type PromotionSlot,
} from '@/lib/repositories/promotion.repository';
import {
  runAction,
  emptyToNull,
  type ActionResult,
} from '@/lib/actions/action-result';

// --- PROMO-01: Public homepage read + click/impression tracking ---
//
// No requireRole() on any of the three functions below — an
// anonymous homepage visitor must be able to see banners and have
// their view/click counted. Safety comes from: (1) the public-read
// RLS policy on `promotions` already scopes SELECT to active/in-range
// rows only, so createClient() (session/anon client) is enough here,
// no service-role needed for reads; (2) the two counters are bumped
// only through the SECURITY DEFINER SQL functions
// (increment_promotion_impression/click), never a direct column
// UPDATE, so this path can never let a visitor rewrite a promotion's
// title/click_url/slot.

export async function getActivePromotionsForSlot(
  slot: PromotionSlot
): Promise<PromotionRecord[]> {
  const supabase = await createClient();
  const repo = new PromotionRepository(supabase);
  return repo.getActivePromotionsForSlot(slot);
}

export async function trackPromotionImpression(id: string): Promise<void> {
  try {
    const supabase = await createClient();
    const repo = new PromotionRepository(supabase);
    await repo.incrementImpression(id);
  } catch (error) {
    // Best-effort, same resilience contract as CONTACT-02's
    // notification dispatch — a tracking failure must never break the
    // homepage for the visitor.
    console.error('[trackPromotionImpression]', error);
  }
}

export async function trackPromotionClick(id: string): Promise<void> {
  try {
    const supabase = await createClient();
    const repo = new PromotionRepository(supabase);
    await repo.incrementClick(id);
  } catch (error) {
    console.error('[trackPromotionClick]', error);
  }
}

// --- PROMO-01: Admin Management (CRUD) — mirrors offer.actions.ts (ADMIN-08) ---

const promotionInputSchema = z.object({
  hotel_id: z.preprocess(emptyToNull, z.string().uuid().nullable().optional()),
  company_name: z.string().min(1, 'Company name is required'),
  logo_image: z.preprocess(emptyToNull, z.string().nullable().optional()),
  click_url: z.string().url('Enter a valid URL'),
  slot_position: z.enum(PROMOTION_SLOT_VALUES),
  start_date: z.preprocess(emptyToNull, z.string().nullable().optional()),
  end_date: z.preprocess(emptyToNull, z.string().nullable().optional()),
  is_active: z.boolean(),
});

export type PromotionInput = z.infer<typeof promotionInputSchema>;

export async function getAllPromotionsAdmin(
  page: number = 1,
  limit: number = 20
) {
  await requireRole(['admin', 'super_admin']);
  // Admin list intentionally uses the service-role client (not
  // createClient()) so it also shows inactive/expired rows, which the
  // public-read RLS policy above would otherwise hide from an admin
  // trying to re-enable or review a past promotion.
  const supabase = createServiceRoleClient();
  const repo = new PromotionRepository(supabase);
  return repo.getAllPromotions(page, limit);
}

export async function getPromotionByIdAdmin(
  id: string
): Promise<PromotionRecord | null> {
  await requireRole(['admin', 'super_admin']);
  const supabase = createServiceRoleClient();
  const repo = new PromotionRepository(supabase);
  return repo.getPromotionById(id);
}

export async function createPromotionAdmin(
  input: PromotionInput
): Promise<ActionResult<PromotionRecord>> {
  return runAction(async () => {
    await requireRole(['admin', 'super_admin']);
    const parsed = promotionInputSchema.parse(input);
    const supabase = createServiceRoleClient();
    const repo = new PromotionRepository(supabase);
    return repo.createPromotion(parsed);
  });
}

export async function updatePromotionAdmin(
  id: string,
  input: PromotionInput
): Promise<ActionResult<PromotionRecord>> {
  return runAction(async () => {
    await requireRole(['admin', 'super_admin']);
    const parsed = promotionInputSchema.parse(input);
    const supabase = createServiceRoleClient();
    const repo = new PromotionRepository(supabase);
    return repo.updatePromotion(id, parsed);
  });
}

export async function deletePromotionAdmin(
  id: string
): Promise<ActionResult<boolean>> {
  return runAction(async () => {
    await requireRole(['admin', 'super_admin']);
    const supabase = createServiceRoleClient();
    const repo = new PromotionRepository(supabase);
    return repo.deletePromotion(id);
  });
}
