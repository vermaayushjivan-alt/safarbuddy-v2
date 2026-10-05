import type { ReactNode } from "react";
import Navbar from "@/components/home/Navbar";
import Footer from "@/components/home/Footer";
import { footerContact } from "@/data/home";

// LAUNCH-01 — shared shell for the public legal pages (/privacy, /terms,
// /refund-policy). Server component, no auth. Content is passed in as
// sections so the three pages share one layout (RULE 1).

export type LegalSection = {
  heading: string;
  body: ReactNode;
};

export const LEGAL_LAST_UPDATED = "5 October 2026";

export default function LegalPage({
  title,
  intro,
  sections,
}: {
  title: string;
  intro: string;
  sections: LegalSection[];
}) {
  return (
    <main className="bg-cream">
      <Navbar />

      <article className="mx-auto max-w-3xl px-6 py-16">
        <span className="font-heading text-[13px] font-semibold uppercase tracking-wide text-orange">
          Legal
        </span>
        <h1 className="mt-1 font-display text-3xl text-deep">{title}</h1>
        <p className="mt-2 text-[12px] text-ink/50">
          Last updated: {LEGAL_LAST_UPDATED}
        </p>
        <p className="mt-4 text-[14px] leading-relaxed text-ink/70">{intro}</p>

        <div className="mt-8 space-y-8">
          {sections.map((section, index) => (
            <section key={section.heading}>
              <h2 className="font-heading text-[16px] font-semibold text-deep">
                {index + 1}. {section.heading}
              </h2>
              <div className="mt-2 space-y-3 text-[14px] leading-relaxed text-ink/70">
                {section.body}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-12 rounded-2xl border border-deep/10 bg-white p-5 text-[13px] text-ink/70">
          <p className="font-heading font-semibold text-deep">
            Questions or complaints?
          </p>
          <p className="mt-1">
            Email{" "}
            <a
              href={`mailto:${footerContact.supportEmail}`}
              className="focus-ring rounded font-medium text-deep underline"
            >
              {footerContact.supportEmail}
            </a>{" "}
            or call {footerContact.supportPhone} ({footerContact.supportHours}).
          </p>
          <p className="mt-1">{footerContact.address}</p>
        </div>
      </article>

      <Footer />
    </main>
  );
}
