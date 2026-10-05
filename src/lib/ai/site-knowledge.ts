// src/lib/ai/site-knowledge.ts
// CHAT-03 — public catalog knowledge for the homepage AI assistant.
//
// Builds ONE plain-text snapshot of what is already public on the
// website: live hotels, live packages, destinations, live offers and
// the support contacts. It reuses the existing repositories (RULE 1/9)
// and the same "live" filters the public pages use.
//
// DELIBERATELY NOT INCLUDED (the assistant is a public, logged-out
// surface and can be prompted by anyone): bookings, payments, invoices,
// customer/vendor personal data, vendor payout/KYC, coupon codes,
// referral data, admin data. Do not add any of these here.
//
// Cached in memory for a few minutes so a busy chat does not hit the
// database on every message. Service-role client is used only to read
// the same public catalog rows (no user data).

import { createServiceRoleClient } from '@/lib/supabase/server';
import { HotelRepository } from '@/lib/repositories/hotel.repository';
import { PackageRepository } from '@/lib/repositories/package.repository';
import { DestinationRepository } from '@/lib/repositories/destination.repository';
import { OfferRepository } from '@/lib/repositories/offer.repository';
import { APP } from '@/lib/config/constants';

const CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_HOTELS = 40;
const MAX_PACKAGES = 30;
const MAX_DESTINATIONS = 40;
const MAX_OFFERS = 10;
const MAX_TEXT = 300; // per description, keeps the snapshot bounded

let cache: { text: string; builtAt: number } | null = null;

function clip(value: string | null | undefined): string {
  if (!value) return '';
  const flat = value.replace(/\s+/g, ' ').trim();
  return flat.length > MAX_TEXT ? `${flat.slice(0, MAX_TEXT)}...` : flat;
}

function price(value: number | null | undefined): string {
  return value != null ? `from INR ${Number(value).toLocaleString('en-IN')}` : 'price on the listing page';
}

async function buildSnapshot(): Promise<string> {
  const supabase = createServiceRoleClient();

  const [hotels, packages, destinations, offers] = await Promise.all([
    new HotelRepository(supabase).getPublishedHotels(1, MAX_HOTELS),
    new PackageRepository(supabase).getPublishedPackages(1, MAX_PACKAGES),
    new DestinationRepository(supabase).getAllPublicDestinations(1, MAX_DESTINATIONS),
    new OfferRepository(supabase).getActiveOffers(MAX_OFFERS),
  ]);

  const lines: string[] = [];

  lines.push(`HOTELS (${hotels.data.length} listed; page: /hotels/<slug>)`);
  for (const h of hotels.data) {
    const place = [h.city, h.state].filter(Boolean).join(', ');
    lines.push(
      `- ${h.hotel_name} | ${place || 'location n/a'} | ${h.star_rating ? `${h.star_rating} star` : 'unrated'} | ${h.property_type} | ${price(h.starting_price)} | check-in ${h.check_in_time}, check-out ${h.check_out_time} | link /hotels/${h.slug}` +
        (h.cancellation_policy ? ` | cancellation: ${clip(h.cancellation_policy)}` : '') +
        (h.house_rules ? ` | house rules: ${clip(h.house_rules)}` : '') +
        (h.description ? ` | about: ${clip(h.description)}` : '')
    );
  }

  lines.push('', `PACKAGES (${packages.data.length} listed; page: /packages/<id>)`);
  for (const p of packages.data) {
    lines.push(
      `- ${p.package_name} | ${p.city ?? 'multiple places'} | ${p.duration ?? 'duration on the page'} | ${price(p.starting_price)} | link /packages/${p.id}` +
        (p.description ? ` | about: ${clip(p.description)}` : '')
    );
  }

  lines.push('', `DESTINATIONS (${destinations.data.length}; page: /destinations/<slug>)`);
  for (const d of destinations.data) {
    lines.push(
      `- ${d.name}${d.state ? `, ${d.state}` : ''} | link /destinations/${d.slug}` +
        (d.description ? ` | about: ${clip(d.description)}` : '')
    );
  }

  lines.push('', `CURRENT OFFERS (${offers.length})`);
  for (const o of offers) {
    lines.push(
      `- ${o.title}${o.discount ? ` | ${o.discount}` : ''}${o.end_date ? ` | valid till ${o.end_date}` : ''}` +
        (o.description ? ` | ${clip(o.description)}` : '')
    );
  }

  lines.push(
    '',
    'SUPPORT',
    `- Email: ${APP.SUPPORT_EMAIL} | Phone: ${APP.SUPPORT_PHONE} | Contact page: /contact`
  );

  return lines.join('\n');
}

/**
 * Returns the public catalog snapshot, or an empty string if it could
 * not be built (the assistant then simply answers without catalog
 * data — a database hiccup must never break the chat).
 */
export async function getSiteKnowledge(): Promise<string> {
  if (cache && Date.now() - cache.builtAt < CACHE_TTL_MS) {
    return cache.text;
  }

  try {
    const text = await buildSnapshot();
    cache = { text, builtAt: Date.now() };
    return text;
  } catch (error) {
    console.error('[AI ASSISTANT] site knowledge build failed', error);
    return cache?.text ?? '';
  }
}
