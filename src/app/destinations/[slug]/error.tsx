"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function DestinationError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[destinations/[slug]] render error:", error);
  }, [error]);

  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center bg-cream p-6 text-center">
      <h1 className="font-display text-2xl text-deep">
        This destination could not be loaded
      </h1>
      <p className="mt-2 max-w-md text-[14px] text-ink/60">
        Please try again, or browse all destinations.
      </p>
      {process.env.NODE_ENV !== "production" && (
        <pre className="mt-4 max-w-xl overflow-auto rounded-xl bg-white p-3 text-left text-[12px] text-red-700">
          {error.message}
        </pre>
      )}
      {error.digest && (
        <p className="mt-2 text-[11px] text-ink/40">Ref: {error.digest}</p>
      )}
      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-full bg-orange px-6 py-2.5 font-heading text-[14px] font-semibold text-white"
        >
          Try again
        </button>
        <Link
          href="/destinations"
          className="rounded-full border border-deep/15 bg-white px-6 py-2.5 font-heading text-[14px] font-semibold text-deep"
        >
          All destinations
        </Link>
      </div>
    </main>
  );
}
