"use client";

// ROOT PATH: src/components/home/CouponStrip.tsx
// HOME-REDESIGN-01 — swipeable coupon "tickets" with tap-to-copy.
// DEMO DATA for now (src/data/home-demo.ts). TODO: feed from real public
// coupons once a public read action exists; hidden when SHOW_HOME_DEMO is off.

import { useState } from "react";
import { Check, Copy } from "lucide-react";
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
      <h2 id="coupons-heading" className="font-heading text-[16px] font-semibold text-deep">
        Coupons for you
      </h2>
      <div className="mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {demoCoupons.map((c) => (
          <div
            key={c.code}
            className="flex w-[270px] shrink-0 snap-start overflow-hidden rounded-2xl border border-deep/10 bg-white"
          >
            <div className={`${c.accent} grid w-12 place-items-center`}>
              <span className="-rotate-90 whitespace-nowrap font-heading text-[10px] font-semibold tracking-wider text-white">
                SAMPLE
              </span>
            </div>
            <div className="min-w-0 flex-1 border-l border-dashed border-deep/20 p-3.5">
              <p className="font-heading text-[14px] font-semibold leading-tight text-deep">
                {c.title}
              </p>
              <p className="mt-1 text-[12px] text-ink/55">{c.note}</p>
              <button
                type="button"
                onClick={() => copy(c.code)}
                className="focus-ring mt-3 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-deep/30 bg-mist-2 px-3 py-1.5 font-heading text-[12px] font-semibold tracking-wide text-deep"
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
