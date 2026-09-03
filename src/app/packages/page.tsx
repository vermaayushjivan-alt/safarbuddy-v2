import Link from "next/link";
import type { Metadata } from "next";
import Navbar from "@/components/home/Navbar";
import Footer from "@/components/home/Footer";
import { PackageGrid } from "@/components/public/PackageGrid";
import { getPublishedPackages } from "@/app/actions/package.actions";
import { SITE_NAME } from "@/lib/seo/site";

// SEO_AUDIT.md §3.2 — same generic-metadata gap as /hotels,
// /destinations. NOTE: there is no public /packages/[id] detail route
// in this repository (confirmed — only .../book exists), so this
// listing page is the only indexable package URL; it is not given
// per-package metadata because no per-package page exists to attach it
// to. See SEO_AUDIT.md for this finding.
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}): Promise<Metadata> {
  const params = await searchParams;
  const page = Number(params.page ?? "1") || 1;

  return {
    title: `Holiday Packages | ${SITE_NAME}`,
    description: `Browse curated holiday packages across India on ${SITE_NAME}.`,
    alternates: { canonical: "/packages" },
    robots: page > 1 ? { index: false, follow: true } : undefined,
  };
}

// P1 fix — PACKAGE-PUBLIC-01: public listing page, closing the
// confirmed /packages 404 linked live from components/home/Packages.tsx
// ("View all packages", both desktop and mobile CTAs). Server component,
// no auth required (see middleware.ts PUBLIC_ROUTES). Mirrors
// src/app/hotels/page.tsx exactly.

export default async function PackagesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Number(params.page ?? "1") || 1;

  const { data: packages, total, totalPages, hasNext, hasPrev } =
    await getPublishedPackages(page, 16);

  return (
    <main className="bg-cream">
      <Navbar />

      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-8">
          <span className="font-heading text-[13px] font-semibold uppercase tracking-wide text-orange">
            Curated getaways
          </span>
          <h1 className="mt-1 font-display text-3xl text-deep">
            All Holiday Packages
          </h1>
          <p className="mt-2 max-w-md text-[14px] text-ink/60">
            {total} package{total === 1 ? "" : "s"} to explore.
          </p>
        </div>

        <PackageGrid packages={packages} />

        {totalPages > 1 && (
          <div className="mt-10 flex items-center justify-center gap-3">
            <Link
              href={`/packages?page=${page - 1}`}
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
              href={`/packages?page=${page + 1}`}
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
