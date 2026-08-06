import Link from "next/link";
import Navbar from "@/components/home/Navbar";
import Footer from "@/components/home/Footer";
import { DestinationGrid } from "@/components/public/DestinationGrid";
import { getAllPublicDestinations } from "@/app/actions/destination.actions";

// PUBLIC-01 — public listing page for the AUTH-06 `/destinations`
// allowlist entry. Server component, no auth required.

export default async function DestinationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Number(params.page ?? "1") || 1;

  const { data: destinations, total, totalPages, hasNext, hasPrev } =
    await getAllPublicDestinations(page, 16);

  return (
    <main className="bg-cream">
      <Navbar />

      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-8">
          <span className="font-heading text-[13px] font-semibold uppercase tracking-wide text-orange">
            Where to next
          </span>
          <h1 className="mt-1 font-display text-3xl text-deep">All Destinations</h1>
          <p className="mt-2 max-w-md text-[14px] text-ink/60">
            {total} destination{total === 1 ? "" : "s"} to explore.
          </p>
        </div>

        <DestinationGrid destinations={destinations} />

        {totalPages > 1 && (
          <div className="mt-10 flex items-center justify-center gap-3">
            <Link
              href={`/destinations?page=${page - 1}`}
              aria-disabled={!hasPrev}
              className={`focus-ring rounded-full border border-deep/15 px-4 py-2 text-[13px] font-semibold text-deep ${
                hasPrev ? "hover:bg-mist" : "pointer-events-none opacity-40"
              }`}
            >
              Previous
            </Link>
            <span className="text-[13px] text-ink/60">
              Page {page} of {totalPages}
            </span>
            <Link
              href={`/destinations?page=${page + 1}`}
              aria-disabled={!hasNext}
              className={`focus-ring rounded-full border border-deep/15 px-4 py-2 text-[13px] font-semibold text-deep ${
                hasNext ? "hover:bg-mist" : "pointer-events-none opacity-40"
              }`}
            >
              Next
            </Link>
          </div>
        )}
      </section>

      <Footer />
    </main>
  );
}
