import type { Metadata } from "next";
import { PropertyListingForm } from "@/components/public/PropertyListingForm";

export const metadata: Metadata = {
  title: "List Your Property — SafarBuddy",
  description:
    "List your hotel or property on SafarBuddy. Submit your details, facilities, and payout information in one place.",
};

export default function ListYourPropertyPage() {
  return (
    <main className="bg-cream px-6 py-16">
      <div className="mx-auto mb-10 max-w-3xl text-center">
        <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--color-sky)]">
          Become a host
        </p>
        <h1 className="font-heading text-3xl font-semibold text-[var(--color-ink)] sm:text-4xl">
          List your property on SafarBuddy
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-[15px] text-[var(--color-ink)]/60">
          Fill in your property, facilities, and payout details below — one
          form, no separate steps. Our team reviews every listing before it
          goes live.
        </p>
      </div>
      <PropertyListingForm />
    </main>
  );
}

