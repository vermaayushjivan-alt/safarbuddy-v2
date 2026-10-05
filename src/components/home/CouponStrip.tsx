// ROOT PATH: src/components/home/CouponStrip.tsx
"use client";

// HOME-REDESIGN-02 — premium swipeable coupon tickets: scenic value stub,
// punched notches, gold tap-to-copy chip, shimmer. DEMO DATA for now
// (src/data/home-demo.ts). TODO: feed from real public coupons once a public
// read action exists; hidden when SHOW_HOME_DEMO is off.

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import SceneArt from "@/components/home/SceneArt";
import { demoCoupons, SHOW_HOME_DEMO } from "@/data/home-demo";

export default function CouponStrip() {
  const [copied, setCopied] = useState<string | null>(null);

  if (!SHOW_HOME_DEMO) return null;

  async function copy(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      window.setTimeout(() => setCopied(null), 1800);
    } catch {
      /* clipboard blocked — ignore */
    }
  }

  return (
    <section aria-labelledby="coupons-heading" className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
      <div className="flex items-baseline justify-between">
        <h2 id="coupons-heading" className="font-display text-[20px] text-deep">
          Coupons for you
        </h2>
        <span className="text-[11px] text-ink/40">Sample</span>
      </div>
      <div className="mt-3 flex snap-x snap-mandatory gap-3.5 overflow-x-auto pb-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {demoCoupons.map((c) => (
          <div
            key={c.code}
            className="sb-shine relative flex h-[118px] w-[300px] shrink-0 snap-start overflow-hidden rounded-2xl bg-white shadow-[0_14px_28px_-16px_rgba(11,47,92,0.55)] ring-1 ring-deep/10"
          >
            {/* value stub */}
            <div className="relative w-[104px] shrink-0 overflow-hidden">
              <SceneArt variant={c.scene} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-black/5" />
              <div className="relative z-10 flex h-full flex-col items-center justify-center text-center">
                <span className="font-display text-[34px] leading-none text-white drop-shadow">
                  {c.value}
                </span>
                <span className="mt-1 font-heading text-[11px] font-bold tracking-[0.2em] text-[#f0cf84]">
                  OFF
                </span>
              </div>
            </div>

            {/* punched notches on the divider */}
            <span aria-hidden className="absolute left-[96px] -top-2.5 h-5 w-5 rounded-full bg-cream" />
            <span aria-hidden className="absolute left-[96px] -bottom-2.5 h-5 w-5 rounded-full bg-cream" />

            {/* details */}
            <div className="flex min-w-0 flex-1 flex-col justify-center border-l-2 border-dashed border-deep/15 py-3 pl-5 pr-3.5">
              <p className="font-heading text-[14px] font-semibold leading-tight text-deep">
                {c.title}
              </p>
              <p className="mt-0.5 text-[11.5px] text-ink/55">{c.note}</p>
              <button
                type="button"
                onClick={() => copy(c.code)}
                className="focus-ring mt-2.5 inline-flex w-fit items-center gap-1.5 rounded-full bg-gradient-to-b from-[#f3d48a] to-[#d9a73f] px-3.5 py-1.5 font-heading text-[12px] font-bold tracking-wide text-[#3a2a06] shadow-sm transition active:scale-95"
              >
                {copied === c.code ? <Check size={13} aria-hidden /> : <Copy size={13} aria-hidden />}
                {copied === c.code ? "Copied" : c.code}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
