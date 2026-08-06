import Image from "next/image";
import { notFound } from "next/navigation";
import { MapPin } from "lucide-react";
import Navbar from "@/components/home/Navbar";
import Footer from "@/components/home/Footer";
import { getDestinationBySlug } from "@/app/actions/destination.actions";

// PUBLIC-01 — public detail page for the AUTH-06 `/destinations`
// allowlist entry. Server component, no auth required. Only renders
// fields that already exist on DestinationRecord — nothing invented.

export default async function DestinationDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const destination = await getDestinationBySlug(slug);

  if (!destination) {
    notFound();
  }

  const heroImage =
    destination.banner && destination.banner.trim().length > 0
      ? destination.banner
      : destination.thumbnail;
  const hasImage = Boolean(heroImage && heroImage.trim().length > 0);

  return (
    <main className="bg-cream">
      <Navbar />

      <section className="mx-auto max-w-5xl px-6 py-12">
        <div className="relative h-72 overflow-hidden rounded-2xl sm:h-96">
          {hasImage ? (
            <Image
              src={heroImage as string}
              alt={destination.name}
              fill
              sizes="(max-width: 1024px) 100vw, 960px"
              className="object-cover"
              priority
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-orange to-orange-2" aria-hidden />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/0 to-black/0" />

          <div className="absolute bottom-5 left-6 right-6 text-white">
            <h1 className="font-display text-3xl sm:text-4xl">{destination.name}</h1>
            {destination.state && (
              <p className="mt-1 flex items-center gap-1.5 text-[14px] text-white/85">
                <MapPin size={14} aria-hidden />
                {destination.state}
              </p>
            )}
          </div>
        </div>

        <div className="mt-8 max-w-3xl">
          <h2 className="font-heading text-[16px] font-semibold text-deep">
            About {destination.name}
          </h2>
          <p className="mt-2 whitespace-pre-line text-[14px] leading-relaxed text-ink/70">
            {destination.description ?? "No description available yet."}
          </p>
        </div>
      </section>

      <Footer />
    </main>
  );
}
