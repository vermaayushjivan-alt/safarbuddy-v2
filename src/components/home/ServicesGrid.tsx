// ROOT PATH: src/components/home/ServicesGrid.tsx
// HOME-REDESIGN-01 — phone-only quick-access grid under the hero (the
// hero's own tab row is hidden below sm:, this takes over its job).
// Live: Hotels, Packages, Offers, Refer & Earn. Everything without a
// backend yet is shown honestly as "Soon" (not a link).

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

const live: { label: string; href: string; icon: LucideIcon; primary?: boolean }[] = [
  { label: "Hotels", href: "/hotels", icon: Hotel, primary: true },
  { label: "Packages", href: "/packages", icon: Package },
  { label: "Offers", href: "/offers", icon: Tag },
  { label: "Refer & Earn", href: "/referral", icon: Gift },
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
      <div className="grid grid-cols-4 gap-2.5">
        {live.map(({ label, href, icon: Icon, primary }) => (
          <Link
            key={label}
            href={href}
            className={`focus-ring flex flex-col items-center justify-center gap-2 rounded-2xl px-1 py-3.5 text-center transition active:scale-95 ${
              primary
                ? "bg-orange text-white shadow-[0_10px_20px_-10px_rgba(255,106,43,0.8)]"
                : "border border-deep/10 bg-white text-deep"
            }`}
          >
            <Icon size={24} aria-hidden />
            <span className="font-heading text-[12px] font-semibold leading-tight">
              {label}
            </span>
          </Link>
        ))}
      </div>

      <div className="mt-2.5 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {soon.map(({ label, icon: Icon }) => (
          <span
            key={label}
            aria-disabled="true"
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-dashed border-deep/20 bg-mist-2 px-3.5 py-2 text-[12px] font-medium text-deep/55"
          >
            <Icon size={14} aria-hidden />
            {label}
            <span className="rounded-full bg-deep/10 px-1.5 py-px text-[9px] font-semibold text-deep/60">
              Soon
            </span>
          </span>
        ))}
      </div>
    </section>
  );
}
