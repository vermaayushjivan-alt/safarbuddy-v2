import type { Metadata } from "next";
import Link from "next/link";
import LegalPage, { type LegalSection } from "@/components/legal/LegalPage";

// LAUNCH-01 — DRAFT. Must be reviewed by a qualified lawyer before launch.
export const metadata: Metadata = {
  title: "Terms & Conditions | SafarBuddy",
  description: "The terms that apply when you use SafarBuddy to book stays and packages.",
  alternates: { canonical: "/terms" },
};

const sections: LegalSection[] = [
  {
    heading: "Acceptance of these terms",
    body: (
      <p>
        By using SafarBuddy you agree to these Terms &amp; Conditions, our
        Privacy Policy and our Cancellation &amp; Refund Policy. If you do not
        agree, please do not use the site.
      </p>
    ),
  },
  {
    heading: "Our role",
    body: (
      <p>
        SafarBuddy is an online platform that connects travellers with hotels,
        resorts, homestays and holiday package providers. The accommodation or
        service is provided by the respective property owner or partner.
        SafarBuddy facilitates the booking and payment and is not the operator
        of the property.
      </p>
    ),
  },
  {
    heading: "Eligibility and accounts",
    body: (
      <p>
        You must be at least 18 years old to make a booking. You are
        responsible for the accuracy of the details you provide and for keeping
        your account credentials confidential. You may also book as a guest
        without creating an account.
      </p>
    ),
  },
  {
    heading: "Bookings and pricing",
    body: (
      <>
        <p>
          Prices, availability and property details shown on the site are
          provided by property owners and may change until a booking is
          confirmed. A booking is confirmed only after successful payment and
          confirmation shown on the site or sent by email.
        </p>
        <p>
          You must give accurate guest details. The property may refuse entry
          if details or required identification do not match the booking.
        </p>
      </>
    ),
  },
  {
    heading: "Payments",
    body: (
      <p>
        Payments are processed securely by our payment gateway, Cashfree. By
        paying you also agree to the gateway&apos;s applicable terms. SafarBuddy
        does not store your card, UPI or net banking credentials.
      </p>
    ),
  },
  {
    heading: "Cancellations and refunds",
    body: (
      <p>
        Cancellations and refunds are governed by our{" "}
        <Link href="/refund-policy" className="font-medium text-deep underline">
          Cancellation &amp; Refund Policy
        </Link>
        .
      </p>
    ),
  },
  {
    heading: "Property owners and partners",
    body: (
      <p>
        Owners who list a property confirm that the information and images they
        submit are accurate and that they have the right to list the property.
        SafarBuddy may review, reject, suspend or remove listings at its
        discretion.
      </p>
    ),
  },
  {
    heading: "Acceptable use",
    body: (
      <p>
        You agree not to misuse the site, attempt unauthorised access, submit
        false information, or use the platform for unlawful purposes.
      </p>
    ),
  },
  {
    heading: "Limitation of liability",
    body: (
      <p>
        To the extent permitted by law, SafarBuddy is not liable for the acts or
        omissions of property owners or partners, or for indirect or
        consequential losses. Our total liability in connection with a booking
        is limited to the amount you paid to us for that booking.
      </p>
    ),
  },
  {
    heading: "Governing law",
    body: (
      <p>
        These terms are governed by the laws of India. Courts at Lucknow, Uttar
        Pradesh will have jurisdiction, subject to any rights you have under
        applicable consumer protection law.
      </p>
    ),
  },
  {
    heading: "Changes",
    body: (
      <p>
        We may update these terms from time to time. Continued use of the site
        after an update means you accept the revised terms.
      </p>
    ),
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms & Conditions"
      intro="Please read these terms carefully before booking through SafarBuddy."
      sections={sections}
    />
  );
}
