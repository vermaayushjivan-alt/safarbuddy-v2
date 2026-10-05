// ROOT PATH: src/components/home/PromoBanner.tsx
'use client';

// PROMO-01 — inline auto-sliding banner-ad carousel for one homepage
// slot. Explicitly NOT a popup (decided against popups for UX reasons
// — see SESSION_HANDOFF.md). One <PromoBanner slot="..."/> is placed
// at each of the three agreed homepage positions in page.tsx; a slot
// with no active promotions renders nothing (no empty card, no
// layout shift).
//
// LOOK (PROMO-02): the uploaded creative IS the ad. The image is shown
// edge-to-edge at its own natural aspect ratio (no crop, no dark
// gradient, no overlaid company name / Visit button) — the CTA text
// ("Apply Now", "Abhi Search Karein", ...) is part of the uploaded
// image, like a normal display-ad unit. Only a tiny "Ad" tag is kept
// for ad-labelling. A promotion with NO image falls back to the old
// text card so it never renders blank.

import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import {
  getActivePromotionsForSlot,
  trackPromotionImpression,
  trackPromotionClick,
} from '@/app/actions/promotion.actions';
import { demoAds, SHOW_HOME_DEMO } from '@/data/home-demo';
import DemoAdCarousel from '@/components/home/DemoAdCarousel';
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

  if (!promotions) return null;

  // HOME-REDESIGN-01: no real campaign in this slot yet -> show a SAMPLE ad
  // so the layout looks full. Real promotions (admin) always win; set
  // SHOW_HOME_DEMO=false in src/data/home-demo.ts to render nothing instead.
  if (promotions.length === 0) {
    if (!SHOW_HOME_DEMO) return null;
    return <DemoAdCarousel ads={demoAds[slot]} />;
  }

  const current = promotions[activeIndex];

  return (
    <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-6">
      <a
        href={current.click_url}
        target="_blank"
        rel="noopener noreferrer sponsored"
        onClick={() => trackPromotionClick(current.id)}
        aria-label={`${current.company_name} — sponsored`}
        className="focus-ring group relative block w-full overflow-hidden rounded-3xl bg-deep shadow-[0_12px_30px_-14px_rgba(11,47,92,0.45)] transition hover:-translate-y-0.5"
      >
        {current.logo_image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={current.logo_image}
            alt={current.company_name}
            className="block h-auto w-full"
          />
        ) : (
          <div className="flex h-40 items-end justify-between gap-4 bg-gradient-to-br from-deep via-deep-2 to-ink p-5 sm:h-52 sm:p-7">
            <p className="min-w-0 truncate font-display text-2xl text-white sm:text-3xl">
              {current.company_name}
            </p>
            <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-white px-4 py-2.5 font-heading text-[13px] font-semibold text-deep">
              Visit
              <ArrowUpRight size={15} aria-hidden />
            </span>
          </div>
        )}

        <span className="absolute right-3 top-3 rounded-full bg-black/45 px-2 py-0.5 font-heading text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
          Ad
        </span>
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
