import type { Metadata } from "next";
import LegalPage, { type LegalSection } from "@/components/legal/LegalPage";

// LAUNCH-01 — DRAFT. Must be reviewed by a qualified lawyer before launch.
export const metadata: Metadata = {
  title: "Privacy Policy | SafarBuddy",
  description:
    "How SafarBuddy collects, uses and protects your personal information.",
  alternates: { canonical: "/privacy" },
};

const sections: LegalSection[] = [
  {
    heading: "Who we are",
    body: (
      <p>
        SafarBuddy (&ldquo;SafarBuddy&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;)
        is an online platform for booking hotels, resorts, homestays and holiday
        packages. This policy explains what personal information we collect
        when you use our website, and how we use and protect it.
      </p>
    ),
  },
  {
    heading: "Information we collect",
    body: (
      <>
        <p>
          <strong>Account details:</strong> your name, email address, phone
          number and password (stored securely by our authentication provider)
          when you register.
        </p>
        <p>
          <strong>Booking details:</strong> guest name, email and phone number,
          travel dates, number of guests, the property or package booked, and
          any special requests. This applies to guest checkout as well as
          registered users.
        </p>
        <p>
          <strong>Payment information:</strong> payments are processed by our
          payment gateway, Cashfree. We do not store your card, UPI or net
          banking credentials. We receive and keep only payment status,
          transaction references and amounts.
        </p>
        <p>
          <strong>Property owners and partners:</strong> business and contact
          details, and payout and verification details you submit when listing a
          property.
        </p>
        <p>
          <strong>Technical data:</strong> basic device, browser and log data,
          and cookies needed to keep you signed in and the site working.
        </p>
      </>
    ),
  },
  {
    heading: "How we use your information",
    body: (
      <ul className="list-disc space-y-1 pl-5">
        <li>To create and manage your account and process your bookings.</li>
        <li>
          To share the necessary booking details (for example guest name,
          contact and dates) with the hotel or partner fulfilling your stay.
        </li>
        <li>To process payments, cancellations and refunds.</li>
        <li>
          To send booking confirmations, invoices, payment updates and support
          replies by email.
        </li>
        <li>To prevent fraud and misuse, and to keep the platform secure.</li>
        <li>To comply with applicable law.</li>
      </ul>
    ),
  },
  {
    heading: "Who we share it with",
    body: (
      <p>
        We do not sell your personal information. We share it only with the
        hotel or partner you book with, our payment gateway, our cloud hosting,
        database and email service providers who process data on our behalf, and
        authorities where we are legally required to.
      </p>
    ),
  },
  {
    heading: "Cookies",
    body: (
      <p>
        We use essential cookies to keep you signed in and to run the site. You
        can block cookies in your browser settings, but parts of the site (such
        as signing in) may then not work.
      </p>
    ),
  },
  {
    heading: "Data retention and security",
    body: (
      <p>
        We keep personal information for as long as needed to provide our
        services, meet legal, tax and accounting obligations, and resolve
        disputes. We use access controls and encrypted connections to protect
        your data, but no system can be guaranteed to be completely secure.
      </p>
    ),
  },
  {
    heading: "Your rights",
    body: (
      <p>
        You may ask us to access, correct or delete your personal information,
        or to withdraw consent, subject to legal and booking-related retention
        requirements. Write to us using the contact details below and we will
        respond within a reasonable time.
      </p>
    ),
  },
  {
    heading: "Children",
    body: (
      <p>
        Our services are intended for adults aged 18 and over. We do not
        knowingly collect personal information from children.
      </p>
    ),
  },
  {
    heading: "Changes to this policy",
    body: (
      <p>
        We may update this policy from time to time. The &ldquo;Last
        updated&rdquo; date above shows when it last changed.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro="Your privacy matters to us. This page explains what we collect, why, and the choices you have."
      sections={sections}
    />
  );
}
