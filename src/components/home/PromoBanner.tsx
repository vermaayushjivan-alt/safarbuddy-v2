'use client';

// PROMO-01 — inline auto-sliding banner-ad carousel for one homepage
// slot. Explicitly NOT a popup (decided against popups for UX reasons
// — see SESSION_HANDOFF.md). One <PromoBanner slot="..."/> is placed
// at each of the three agreed homepage positions in page.tsx; a slot
// with no active promotions renders nothing (no empty card, no
// layout shift).
//
// Styling matches Offers.tsx's card shape (rounded-2xl, white card,
// soft shadow) and Trending's hover-lift, so this doesn't read as a
// bolted-on design system.

import { useEffect, useRef, useState } from 'react';
import { ExternalLink } from 'lucide-react';
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
    <div className="mx-auto max-w-6xl px-6 py-4">
      <a
        href={current.click_url}
        target="_blank"
        rel="noopener noreferrer sponsored"
        onClick={() => trackPromotionClick(current.id)}
        className="focus-ring group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-deep/10 bg-white px-5 py-4 shadow-[0_16px_30px_-18px_rgba(11,47,92,0.4)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_36px_-16px_rgba(11,47,92,0.45)]"
      >
        <span className="absolute right-3 top-3 rounded-full bg-mist px-2 py-0.5 font-heading text-[10px] font-semibold uppercase tracking-wide text-ink/50">
          Sponsored
        </span>

        {current.logo_image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={current.logo_image}
            alt={current.company_name}
            className="h-12 w-12 shrink-0 rounded-xl object-contain"
          />
        ) : (
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-mist font-heading text-[14px] font-bold text-deep">
            {current.company_name.slice(0, 1).toUpperCase()}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate font-heading text-[14px] font-semibold text-deep">
            {current.company_name}
          </p>
          <p className="truncate text-[12px] text-ink/55">
            {current.click_url.replace(/^https?:\/\//, '')}
          </p>
        </div>

        <ExternalLink
          size={16}
          className="shrink-0 text-deep/40 transition group-hover:text-deep"
          aria-hidden
        />
      </a>

      {promotions.length > 1 && (
        <div className="mt-2 flex justify-center gap-1.5">
          {promotions.map((p, i) => (
            <span
              key={p.id}
              className={`h-1.5 rounded-full transition-all ${
                i === activeIndex ? 'w-4 bg-deep/60' : 'w-1.5 bg-deep/20'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

