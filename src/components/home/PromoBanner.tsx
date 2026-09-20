'use client';

// PROMO-01 — inline auto-sliding banner-ad carousel for one homepage
// slot. Explicitly NOT a popup (decided against popups for UX reasons
// — see SESSION_HANDOFF.md). One <PromoBanner slot="..."/> is placed
// at each of the three agreed homepage positions in page.tsx; a slot
// with no active promotions renders nothing (no empty card, no
// layout shift).
//
// SIZE: deliberately a large, full-width display-ad banner (not a
// thin row-card) — sponsors pay more for a bigger, more visible
// placement, so the whole uploaded logo/banner image fills the card
// as a background, with company name + CTA overlaid at the bottom,
// same visual weight as a real ad unit rather than a small chip.

import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import {
  getActivePromotionsForSlot,
  trackPromotionImpression,
  trackPromotionClick,
} from '@/app/actions/promotion.actions';
import type {
  PromotionRecord,
  PromotionSlot,
} from '@/lib/repositories/promotion.repository';

const AUTO_SLIDE_MS = 6000;

export default function PromoBanner({ slot }: { slot: PromotionSlot }) {
  const [promotions, setPromotions] = useState<PromotionRecord[] | null>(
    null
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const impressionsSent = useRef(new Set<string>());

  useEffect(() => {
    let cancelled = false;
    getActivePromotionsForSlot(slot).then((rows) => {
      if (!cancelled) setPromotions(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [slot]);

  // Auto-slide, only when there's more than one card to rotate.
  useEffect(() => {
    if (!promotions || promotions.length < 2) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % promotions.length);
    }, AUTO_SLIDE_MS);
    return () => clearInterval(timer);
  }, [promotions]);

  // Fire one impression per card the first time it's actually shown,
  // not on every re-render (impressionsSent guards that).
  useEffect(() => {
    if (!promotions || promotions.length === 0) return;
    const current = promotions[activeIndex];
    if (!current || impressionsSent.current.has(current.id)) return;
    impressionsSent.current.add(current.id);
    trackPromotionImpression(current.id);
  }, [promotions, activeIndex]);

  if (!promotions || promotions.length === 0) return null;

  const current = promotions[activeIndex];

  return (
    <div className="mx-auto max-w-6xl px-6 py-6">
      <a
        href={current.click_url}
        target="_blank"
        rel="noopener noreferrer sponsored"
        onClick={() => trackPromotionClick(current.id)}
        className="focus-ring group relative block h-56 w-full overflow-hidden rounded-3xl border border-deep/10 bg-deep shadow-[0_24px_48px_-20px_rgba(11,47,92,0.45)] transition hover:-translate-y-0.5 hover:shadow-[0_28px_54px_-18px_rgba(11,47,92,0.5)] sm:h-64 md:h-72"
      >
        {current.logo_image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={current.logo_image}
            alt={current.company_name}
            className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-deep via-deep-2 to-ink" />
        )}

        {/* Bottom gradient so text stays readable over any image */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        <span className="absolute right-4 top-4 rounded-full bg-white/90 px-3 py-1 font-heading text-[11px] font-semibold uppercase tracking-wide text-deep">
          Sponsored
        </span>

        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 sm:p-7">
          <div className="min-w-0">
            <p className="truncate font-display text-2xl text-white sm:text-3xl">
              {current.company_name}
            </p>
            <p className="mt-1 truncate text-[13px] text-white/70">
              {current.click_url.replace(/^https?:\/\//, '')}
            </p>
          </div>

          <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-white px-4 py-2.5 font-heading text-[13px] font-semibold text-deep transition group-hover:bg-cream">
            Visit
            <ArrowUpRight size={15} aria-hidden />
          </span>
        </div>
      </a>

      {promotions.length > 1 && (
        <div className="mt-3 flex justify-center gap-1.5">
          {promotions.map((p, i) => (
            <span
              key={p.id}
              className={`h-1.5 rounded-full transition-all ${
                i === activeIndex ? 'w-6 bg-deep/60' : 'w-1.5 bg-deep/20'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
