import Link from "next/link";
import Image from "next/image";
import { MapPin, Clock, Package as PackageIcon } from "lucide-react";
import type { PackageRecord } from "@/lib/repositories/package.repository";

// P1 fix — PACKAGE-PUBLIC-01: shared card grid for the public
// /packages listing page (src/app/packages/page.tsx). Mirrors
// components/public/HotelGrid.tsx. Only renders fields that exist on
// PackageRecord.
//
// NOTE: unlike hotels/destinations, there is no separate package detail
// page (only /packages/[id]/book) — this links straight to booking,
// the one route that actually exists, rather than inventing a new
// detail page outside this fix's confirmed scope.

function formatPrice(price: number | null): string {
  if (price == null) return "—";
  return price.toLocaleString("en-IN");
}

function packageBookHref(p: PackageRecord): string {
  return `/packages/${p.id}/book`;
}

export function PackageGrid({ packages }: { packages: PackageRecord[] }) {
  if (packages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-deep/15 bg-mist-2 px-6 py-16 text-center">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-mist text-deep">
          <PackageIcon size={20} aria-hidden />
        </div>
        <p className="mt-4 font-heading text-[15px] font-semibold text-deep">
          No holiday packages right now
        </p>
        <p className="mt-1 max-w-xs text-[13px] text-ink/55">
          New handpicked getaways drop every week — check back soon.
        </p>
      </div>
    );
  }

  return (
    <div
      className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
      role="list"
      aria-label="Holiday packages"
    >
      {packages.map((p) => {
        const hasImage = Boolean(p.thumbnail && p.thumbnail.trim().length > 0);

        return (
          <div
            key={p.id}
            role="listitem"
            className="hover-lift group overflow-hidden rounded-2xl bg-white shadow-[0_16px_30px_-18px_rgba(11,47,92,0.4)] hover:shadow-[0_24px_40px_-16px_rgba(11,47,92,0.45)]"
          >
            <div className="relative h-44 overflow-hidden">
              {hasImage ? (
                <Image
                  src={p.thumbnail as string}
                  alt={p.package_name}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  className="object-cover transition-transform duration-500 ease-out group-hover:scale-110"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-sky to-deep transition-transform duration-500 ease-out group-hover:scale-110" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/0 to-black/0" />

              <div className="absolute bottom-3 left-4 right-4 text-white">
                <p className="font-heading text-lg font-semibold leading-tight">
                  {p.package_name}
                </p>
                <p className="flex items-center gap-3 text-[12px] text-white/80">
                  <span className="flex items-center gap-1">
                    <MapPin size={11} aria-hidden />
                    {p.city ?? "—"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={11} aria-hidden />
                    {p.duration ?? "—"}
                  </span>
                </p>
              </div>
            </div>

            <div className="p-5">
              <p className="text-[12px] text-ink/50">
                Starting from
                <span className="ml-1.5 font-display text-[17px] text-orange">
                  ₹{formatPrice(p.starting_price)}
                </span>
              </p>

              <Link
                href={packageBookHref(p)}
                className="focus-ring mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl border border-deep/15 py-2.5 font-heading text-[13px] font-semibold text-deep transition group-hover:bg-deep group-hover:text-cream active:scale-[0.98]"
              >
                View &amp; Book
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}
