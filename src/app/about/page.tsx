import Navbar from "@/components/home/Navbar";
import Footer from "@/components/home/Footer";
import { footerContent, footerContact } from "@/data/home";

// PUBLIC-01 — public marketing page for the AUTH-06 `/about` allowlist
// entry in middleware.ts. Server component, no auth required.
// This route previously did not exist, which is why "/about" links
// (e.g. Footer "About Us") had nowhere to go.

export default function AboutPage() {
  return (
    <main className="bg-cream">
      <Navbar />

      <section className="mx-auto max-w-3xl px-6 py-16">
        <span className="font-heading text-[13px] font-semibold uppercase tracking-wide text-orange">
          About Us
        </span>
        <h1 className="mt-1 font-display text-3xl text-deep">
          About SafarBuddy
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-ink/70">
          {footerContent.description}
        </p>
        <p className="mt-4 text-[15px] leading-relaxed text-ink/70">
          We are based in {footerContact.address}, and our support team is
          available {footerContact.supportHours}.
        </p>
      </section>

      <Footer />
    </main>
  );
}
