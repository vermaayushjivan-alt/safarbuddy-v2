import Navbar from "@/components/home/Navbar";
import Footer from "@/components/home/Footer";
import { Mail, Phone, MapPin, Clock } from "lucide-react";
import { footerContact } from "@/data/home";

// PUBLIC-01 — public marketing page for the AUTH-06 `/contact` allowlist
// entry in middleware.ts. Server component, no auth required.
// This route previously did not exist, which is why "/contact" links
// (e.g. Footer "Contact Us") had nowhere to go.

export default function ContactPage() {
  return (
    <main className="bg-cream">
      <Navbar />

      <section className="mx-auto max-w-3xl px-6 py-16">
        <span className="font-heading text-[13px] font-semibold uppercase tracking-wide text-orange">
          Get in touch
        </span>
        <h1 className="mt-1 font-display text-3xl text-deep">Contact Us</h1>
        <p className="mt-2 max-w-md text-[14px] text-ink/60">
          Have a question about a booking or need help planning your trip?
          Reach us through any of the channels below.
        </p>

        <ul className="mt-8 space-y-4">
          <li className="flex items-center gap-3 text-[14px] text-ink/80">
            <Mail size={16} className="shrink-0 text-orange" aria-hidden />
            <a
              href={`mailto:${footerContact.supportEmail}`}
              className="focus-ring rounded hover:text-deep"
            >
              {footerContact.supportEmail}
            </a>
          </li>
          <li className="flex items-center gap-3 text-[14px] text-ink/80">
            <Phone size={16} className="shrink-0 text-orange" aria-hidden />
            <a
              href={`tel:${footerContact.supportPhone.replace(/\s+/g, "")}`}
              className="focus-ring rounded hover:text-deep"
            >
              {footerContact.supportPhone}
            </a>
          </li>
          <li className="flex items-start gap-3 text-[14px] text-ink/80">
            <MapPin size={16} className="mt-0.5 shrink-0 text-orange" aria-hidden />
            <span>{footerContact.address}</span>
          </li>
          <li className="flex items-start gap-3 text-[14px] text-ink/80">
            <Clock size={16} className="mt-0.5 shrink-0 text-orange" aria-hidden />
            <span>{footerContact.supportHours}</span>
          </li>
        </ul>
      </section>

      <Footer />
    </main>
  );
}
