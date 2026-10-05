// ROOT PATH: src/components/home/PartnersStrip.tsx
// HOME-REDESIGN-01 — "Our partners" brand strip. DEMO DATA for now
// (src/data/home-demo.ts, invented names). Hidden when SHOW_HOME_DEMO is off.

import { demoPartners, SHOW_HOME_DEMO } from "@/data/home-demo";

export default function PartnersStrip() {
  if (!SHOW_HOME_DEMO) return null;

  return (
    <section aria-labelledby="partners-heading" className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
      <div className="flex items-baseline justify-between">
        <h2 id="partners-heading" className="font-heading text-[16px] font-semibold text-deep">
          Our partners
        </h2>
        <span className="text-[11px] text-ink/40">Sample</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {demoPartners.map((p) => (
          <div
            key={p.name}
            className={`flex h-24 flex-col justify-end rounded-2xl bg-gradient-to-br ${p.gradient} p-3.5 text-white`}
          >
            <p className="font-display text-[16px] leading-tight">{p.name}</p>
            <p className="mt-0.5 text-[11px] text-white/75">{p.tagline}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
