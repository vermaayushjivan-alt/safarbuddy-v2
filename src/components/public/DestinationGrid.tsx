import Link from "next/link";
import Image from "next/image";
import { MapPin, Compass } from "lucide-react";
import type { DestinationRecord } from "@/lib/repositories/destination.repository";

// PUBLIC-01 — shared card grid for the public /destinations listing
// page (src/app/destinations/page.tsx). Server-renderable (no client
// state), same card visual language as the home/Destinations.tsx
// section but without that component's homepage-only placeholder
// price/rating/booking stats — this grid only renders fields that
// actually exist on DestinationRecord.

function destinationHref(d: DestinationRecord): string {
  const slug = d.slug && d.slug.trim().length > 0 ? d.slug : String(d.id);
  return `/destinations/${slug}`;
}

export function DestinationGrid({
  destinations,
}: {
  destinations: DestinationRecord[];
}) {
  if (destinations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-deep/15 bg-mist-2 px-6 py-16 text-center">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-mist text-deep">
          <Compass size={20} aria-hidden />
        </div>
        <p className="mt-4 font-heading text-[15px] font-semibold text-deep">
          No destinations to show
        </p>
        <p className="mt-1 max-w-xs text-[13px] text-ink/55">
          We&apos;re curating fresh destinations for you — check back shortly.
        </p>
      </div>
    );
  }

  return (
    <div
      className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
      role="list"
      aria-label="Destinations"
    >
      {destinations.map((d) => {
        const hasImage = Boolean(d.thumbnail && d.thumbnail.trim().length > 0);

        return (
          <div
            key={d.id}
            role="listitem"
            className="hover-lift group overflow-hidden rounded-2xl bg-white shadow-[0_16px_30px_-18px_rgba(11,47,92,0.4)] hover:shadow-[0_24px_40px_-16px_rgba(11,47,92,0.45)]"
          >
            <div className="relative h-48 overflow-hidden">
              {hasImage ? (
                <Image
                  src={d.thumbnail as string}
                  alt={d.name}
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
                  {d.name}
                </p>
                {d.state && (
                  <p className="flex items-center gap-1 text-[12px] text-white/80">
                    <MapPin size={11} aria-hidden />
                    {d.state}
                  </p>
                )}
              </div>
            </div>

            <div className="p-5">
              <p className="line-clamp-2 text-[13px] leading-relaxed text-ink/60">
                {d.description ?? "No description available yet."}
              </p>

              <Link
                href={destinationHref(d)}
                className="focus-ring mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl border border-deep/15 py-2.5 font-heading text-[13px] font-semibold text-deep transition group-hover:bg-deep group-hover:text-cream active:scale-[0.98]"
              >
                Explore
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}
