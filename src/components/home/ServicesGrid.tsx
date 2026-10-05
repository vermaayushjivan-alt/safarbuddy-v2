// ROOT PATH: src/components/home/ServicesGrid.tsx
// HOME-REDESIGN-02 — phone-only quick-access grid under the hero (the hero's
// own tab row is hidden below sm:, this takes over its job). App-icon style:
// glossy gradient squircles with coloured glow. Live: Hotels, Packages,
// Offers, Refer & Earn. Anything without a backend yet is honestly "Soon".

import Link from "next/link";
import {
  Banknote,
  Bus,
  Gift,
  Globe,
  Hotel,
  Package,
  Plane,
  Tag,
  Train,
  type LucideIcon,
} from "lucide-react";

const live: {
  label: string;
  href: string;
  icon: LucideIcon;
  grad: string;
  glow: string;
}[] = [
  { label: "Hotels", href: "/hotels", icon: Hotel, grad: "from-[#ffa066] to-[#ff5a1f]", glow: "shadow-[0_10px_18px_-6px_rgba(255,106,43,0.75)]" },
  { label: "Packages", href: "/packages", icon: Package, grad: "from-[#6aa2f5] to-[#1b4fc0]", glow: "shadow-[0_10px_18px_-6px_rgba(27,95,207,0.7)]" },
  { label: "Offers", href: "/offers", icon: Tag, grad: "from-[#f6d98e] to-[#d39a2c]", glow: "shadow-[0_10px_18px_-6px_rgba(211,154,44,0.75)]" },
  { label: "Refer & Earn", href: "/referral", icon: Gift, grad: "from-[#4fd6a4] to-[#0f8f68]", glow: "shadow-[0_10px_18px_-6px_rgba(15,143,104,0.7)]" },
];

const soon: { label: string; icon: LucideIcon }[] = [
  { label: "Flights", icon: Plane },
  { label: "Bus", icon: Bus },
  { label: "Train", icon: Train },
  { label: "Visa", icon: Globe },
  { label: "Forex", icon: Banknote },
];

export default function ServicesGrid() {
  return (
    <section aria-label="Services" className="px-4 pt-6 sm:hidden">
      <div className="rounded-3xl bg-white p-4 shadow-[0_18px_36px_-20px_rgba(11,47,92,0.5)] ring-1 ring-deep/5">
        <div className="grid grid-cols-4 gap-2">
          {live.map(({ label, href, icon: Icon, grad, glow }) => (
            <Link
              key={label}
              href={href}
              className="focus-ring flex flex-col items-center gap-2 rounded-2xl py-1 text-center transition active:scale-90"
            >
              <span
                className={`relative grid h-[58px] w-[58px] place-items-center rounded-[20px] bg-gradient-to-br ${grad} ${glow} ring-1 ring-inset ring-white/40`}
              >
                <span aria-hidden className="absolute inset-x-2 top-1 h-3 rounded-full bg-white/30 blur-[3px]" />
                <Icon size={27} strokeWidth={2} aria-hidden className="relative text-white drop-shadow" />
              </span>
              <span className="font-heading text-[12px] font-semibold leading-tight text-deep">
                {label}
              </span>
            </Link>
          ))}
        </div>

        <div className="mt-4 border-t border-dashed border-deep/15 pt-3.5">
          <div className="grid grid-cols-5 gap-1">
            {soon.map(({ label, icon: Icon }) => (
              <span
                key={label}
                aria-disabled="true"
                className="flex flex-col items-center gap-1.5 text-center"
              >
                <span className="relative grid h-11 w-11 place-items-center rounded-2xl bg-mist text-deep/45">
                  <Icon size={20} aria-hidden />
                  <span className="absolute -right-1.5 -top-1.5 rounded-full bg-[#d9a73f] px-1.5 py-px font-heading text-[8px] font-bold uppercase tracking-wide text-[#3a2a06]">
                    Soon
                  </span>
                </span>
                <span className="text-[11px] font-medium text-deep/50">{label}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
