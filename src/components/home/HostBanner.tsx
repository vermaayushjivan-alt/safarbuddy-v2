// ROOT PATH: src/components/home/HostBanner.tsx
// HOME-REDESIGN-01 — two real calls to action: host acquisition + referral.
// Links only to existing routes (/list-your-property, /referral).

import Link from "next/link";
import { ArrowRight, Gift, Building2 } from "lucide-react";

export default function HostBanner() {
  return (
    <section aria-label="Host and refer" className="mx-auto grid max-w-6xl gap-3 px-4 pt-8 sm:grid-cols-2 sm:px-6">
      <Link
        href="/list-your-property"
        className="focus-ring group flex items-center justify-between gap-4 rounded-2xl bg-gradient-to-br from-deep to-deep-2 p-5 text-cream"
      >
        <div className="min-w-0">
          <Building2 size={22} aria-hidden className="text-orange-2" />
          <p className="mt-3 font-display text-[19px] leading-tight">Own a hotel or homestay?</p>
          <p className="mt-1 text-[12px] text-cream/70">List your property and start getting bookings.</p>
        </div>
        <ArrowRight size={20} aria-hidden className="shrink-0 transition group-hover:translate-x-1" />
      </Link>

      <Link
        href="/referral"
        className="focus-ring group flex items-center justify-between gap-4 rounded-2xl bg-gradient-to-br from-orange to-orange-2 p-5 text-white"
      >
        <div className="min-w-0">
          <Gift size={22} aria-hidden />
          <p className="mt-3 font-display text-[19px] leading-tight">Refer a friend, earn a coupon</p>
          <p className="mt-1 text-[12px] text-white/80">You both get a discount on a paid booking.</p>
        </div>
        <ArrowRight size={20} aria-hidden className="shrink-0 transition group-hover:translate-x-1" />
      </Link>
    </section>
  );
}
