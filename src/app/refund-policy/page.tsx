import type { Metadata } from "next";
import LegalPage, { type LegalSection } from "@/components/legal/LegalPage";

// LAUNCH-01 — DRAFT. Intentionally contains NO invented refund windows,
// percentages or timelines (RULE 12/7): the product stores no per-property
// cancellation policy and refunds are handled manually (PAY-01: refunds
// out of scope). The owner must decide the real terms — see
// SESSION_HANDOFF.md "Owner decisions needed". Lawyer review required.
export const metadata: Metadata = {
  title: "Cancellation & Refund Policy | SafarBuddy",
  description: "How cancellations and refunds work for bookings made on SafarBuddy.",
  alternates: { canonical: "/refund-policy" },
};

const sections: LegalSection[] = [
  {
    heading: "Cancelling a booking",
    body: (
      <p>
        Registered users can request cancellation from My Bookings in their
        dashboard and must give a reason. Guest bookers can write to us at the
        contact details below, quoting their booking reference. Cancellation is
        subject to the booking&apos;s status and the cancellation terms of the
        property or package.
      </p>
    ),
  },
  {
    heading: "Property-specific terms",
    body: (
      <p>
        Each property or package partner may have its own cancellation rules.
        Where these apply they are shown on the listing or during booking and
        form part of your booking. Some rates or bookings may be
        non-refundable.
      </p>
    ),
  },
  {
    heading: "Refunds",
    body: (
      <>
        <p>
          If a refund is due, it is reviewed and processed by our team to the
          original payment method through our payment gateway, Cashfree. The
          time taken for the amount to reflect depends on your bank or payment
          provider.
        </p>
        <p>
          Payment gateway or processing charges, where applicable, may not be
          refundable. We will tell you the refundable amount when we confirm
          your cancellation.
        </p>
      </>
    ),
  },
  {
    heading: "If the property cannot honour your booking",
    body: (
      <p>
        If a confirmed booking cannot be honoured by the property or partner, we
        will contact you and either arrange a suitable alternative or refund
        the amount you paid.
      </p>
    ),
  },
  {
    heading: "Failed or duplicate payments",
    body: (
      <p>
        If money was debited but your booking was not confirmed, or you were
        charged more than once, contact us with your transaction details. Such
        amounts are reviewed and refunded or reconciled.
      </p>
    ),
  },
  {
    heading: "Complaints",
    body: (
      <p>
        If you are unhappy with how a cancellation or refund was handled, write
        to us using the details below with your booking reference. We aim to
        acknowledge complaints promptly and resolve them within a reasonable
        time.
      </p>
    ),
  },
];

export default function RefundPolicyPage() {
  return (
    <LegalPage
      title="Cancellation & Refund Policy"
      intro="This page explains how to cancel a booking and how refunds are handled."
      sections={sections}
    />
  );
}
