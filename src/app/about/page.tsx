import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/home/Navbar";
import Footer from "@/components/home/Footer";
import { footerContact } from "@/data/home";

// GOLIVE-13c — this route used to be an exact copy of /contact (so "About Us"
// in the footer and mobile menu opened "Contact Us"). Only facts that exist in
// the product are stated here: no founding year, team, awards or statistics.
// Add those yourself only when you can stand behind them.

export const metadata: Metadata = {
  title: "About SafarBuddy",
  description:
    "SafarBuddy is a travel booking platform for hotels, resorts, homestays and holiday packages.",
  alternates: { canonical: "/about" },
};

const steps = [
  {
    title: "Find",
    text: "Browse hotels, resorts, homestays, destinations and holiday packages, and compare prices before you decide.",
  },
  {
    title: "Book",
    text: "Pick your dates and guests, and place your booking from your SafarBuddy account.",
  },
  {
    title: "Pay securely",
    text: "Pay online through our payment partner Cashfree. Your booking is confirmed once the payment succeeds.",
  },
  {
    title: "Stay in touch",
    text: "Manage bookings, download invoices, chat about a booking and raise support requests from your dashboard.",
  },
];

export default function AboutPage() {
  return (
    <main className="bg-cream">
      <Navbar />

      <section className="mx-auto max-w-3xl px-6 py-16">
        <span className="font-heading text-[13px] font-semibold uppercase tracking-wide text-orange">
          About us
        </span>
        <h1 className="mt-1 font-display text-3xl text-deep">About SafarBuddy</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink/70">
          SafarBuddy is a travel booking platform for hotels, resorts, homestays and
          holiday packages. We list properties and packages from partner hotels and
          travel operators, so you can plan, book and pay for a trip in one place.
        </p>

        <h2 className="mt-10 font-heading text-lg font-semibold text-deep">How it works</h2>
        <ol className="mt-4 space-y-3">
          {steps.map((step, index) => (
            <li
              key={step.title}
              className="flex gap-4 rounded-2xl border border-deep/10 bg-white p-4"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-mist font-heading text-sm font-semibold text-deep">
                {index + 1}
              </span>
              <div>
                <p className="font-heading text-[15px] font-semibold text-deep">{step.title}</p>
                <p className="mt-0.5 text-[13px] leading-relaxed text-ink/65">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>

        <h2 className="mt-10 font-heading text-lg font-semibold text-deep">
          Clear policies, real support
        </h2>
        <p className="mt-3 text-[14px] leading-relaxed text-ink/70">
          Our{" "}
          <Link href="/refund-policy" className="font-medium text-deep underline">
            Refund Policy
          </Link>
          ,{" "}
          <Link href="/terms" className="font-medium text-deep underline">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="font-medium text-deep underline">
            Privacy Policy
          </Link>{" "}
          are public, and every booking has a support route. Our Grievance Officer
          details are on those pages. You can reach the team at{" "}
          <a
            href={`mailto:${footerContact.supportEmail}`}
            className="font-medium text-deep underline"
          >
            {footerContact.supportEmail}
          </a>{" "}
          ({footerContact.supportHours}).
        </p>

        <h2 className="mt-10 font-heading text-lg font-semibold text-deep">
          Own a hotel or run tours?
        </h2>
        <p className="mt-3 text-[14px] leading-relaxed text-ink/70">
          Partner with SafarBuddy to reach travellers looking for stays and packages.{" "}
          <Link href="/list-your-property" className="font-medium text-deep underline">
            List your property
          </Link>
          .
        </p>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/hotels"
            className="focus-ring rounded-full bg-deep px-6 py-3 text-sm font-semibold text-cream transition hover:bg-deep-2"
          >
            Browse hotels
          </Link>
          <Link
            href="/contact"
            className="focus-ring rounded-full border border-deep/15 px-6 py-3 text-sm font-semibold text-deep transition hover:bg-mist"
          >
            Contact us
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}
