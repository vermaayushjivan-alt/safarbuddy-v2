// ROOT PATH: src/components/home/PartnersStrip.tsx
// HOME-REDESIGN-02 — "Our partners": scenic brand cards with a glass monogram.
// DEMO DATA for now (src/data/home-demo.ts, invented names). Hidden when
// SHOW_HOME_DEMO is off.

import SceneArt from "@/components/home/SceneArt";
import { demoPartners, SHOW_HOME_DEMO } from "@/data/home-demo";

export default function PartnersStrip() {
  if (!SHOW_HOME_DEMO) return null;

  return (
    <section aria-labelledby="partners-heading" className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
      <div className="flex items-baseline justify-between">
        <h2 id="partners-heading" className="font-display text-[20px] text-deep">
          Our partners
        </h2>
        <span className="text-[11px] text-ink/40">Sample</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {demoPartners.map((p) => (
          <div
            key={p.name}
            className="sb-shine relative h-36 overflow-hidden rounded-2xl shadow-[0_14px_28px_-16px_rgba(11,47,92,0.55)] ring-1 ring-deep/10"
          >
            <SceneArt variant={p.scene} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
            <div className="relative z-10 flex h-full flex-col justify-between p-3">
              <span className="grid h-9 w-9 place-items-center rounded-full border border-[#e0b95a]/70 bg-white/15 font-display text-[16px] text-[#f6dc9b] backdrop-blur-md">
                {p.name.charAt(0)}
              </span>
              <div>
                <p className="font-display text-[16px] leading-tight text-white">{p.name}</p>
                <p className="mt-0.5 text-[11px] text-white/75">{p.tagline}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
