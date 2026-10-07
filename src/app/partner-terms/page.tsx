// ROOT PATH: src/app/partner-terms/page.tsx
import type { Metadata } from "next";
import LegalPage, { type LegalSection } from "@/components/legal/LegalPage";
import {
  PLATFORM_COMMISSION_PERCENT,
  PARTNER_TERMS_VERSION,
} from "@/lib/payments/commission";

// PARTNER-TERMS-01 — DRAFT. Hotel Partner Terms & Commission Agreement,
// shown to every owner on /list-your-property (they must tick to agree).
// Lawyer review required before launch. Facts used here are ONLY owner
// decisions already recorded: flat commission rate (commission.ts), refunds
// handled per the refund policy, manual payout settlement. Nothing else
// (payout dates, penalties, exclusivity) is invented (RULE 12) — add them
// here only after the owner decides, then bump PARTNER_TERMS_VERSION in
// src/lib/payments/commission.ts so owners re-accept the new text.
//
// The percentage is read from commission.ts so this page, the listing-form
// checkbox, the payment split and the stored acceptance can never disagree.
export const metadata: Metadata = {
  title: "Hotel Partner Terms & Commission | SafarBuddy",
  description:
    "Terms for hotels and property owners listing on SafarBuddy, including the platform commission.",
  alternates: { canonical: "/partner-terms" },
};

const pct = PLATFORM_COMMISSION_PERCENT;

// Worked example, computed from the live rate (never typed by hand).
const exampleBooking = 10000;
const exampleCommission = Math.round((exampleBooking * pct) / 100);
const examplePayout = exampleBooking - exampleCommission;

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

const sections: LegalSection[] = [
  {
    heading: "About this agreement",
    body: (
      <>
        <p>
          These terms apply to every hotel, resort, homestay or other property
          owner (&quot;Partner&quot;) who lists a property on SafarBuddy. By
          ticking the agreement box on the listing form, the Partner confirms
          they have read and accept these terms, and that they are the owner of
          the property or are authorised to list it.
        </p>
        <p className="text-[12px] text-ink/50">Version: {PARTNER_TERMS_VERSION}</p>
      </>
    ),
  },
  {
    heading: `Platform commission (${pct}%)`,
    body: (
      <>
        <p>
          SafarBuddy charges the Partner a commission of{" "}
          <strong>{pct}%</strong> on every booking made and paid through the
          SafarBuddy platform for the Partner&apos;s property. The commission
          is calculated on the amount the guest actually paid for that booking
          on SafarBuddy (after any coupon or discount applied at checkout), as
          recorded on the payment.
        </p>
        <p>
          Example: for a booking where the guest pays {inr(exampleBooking)},
          SafarBuddy&apos;s commission is {inr(exampleCommission)} and the
          Partner&apos;s payout is {inr(examplePayout)}.
        </p>
        <p>
          The commission is worked out once, when the payment succeeds, and
          stays fixed for that booking even if the rate changes later. The
          Partner agrees that SafarBuddy keeps this commission from the
          booking amount before paying out the rest.
        </p>
      </>
    ),
  },
  {
    heading: "Payouts",
    body: (
      <>
        <p>
          Payouts are made by the SafarBuddy team to the bank account or UPI ID
          the Partner provides on the listing form, after deducting the
          commission. Payouts are currently settled manually, and the team will
          tell the Partner how and when each settlement is made.
        </p>
        <p>
          The Partner is responsible for giving correct payout details and for
          keeping them up to date. SafarBuddy is not responsible for a payout
          sent to details the Partner supplied incorrectly.
        </p>
      </>
    ),
  },
  {
    heading: "Cancellations and refunds",
    body: (
      <p>
        Guest cancellations and refunds follow SafarBuddy&apos;s{" "}
        <a href="/refund-policy" className="font-medium text-deep underline">
          Cancellation &amp; Refund Policy
        </a>{" "}
        and the cancellation terms shown on the Partner&apos;s listing. When a
        booking is cancelled and refunded, the commission and the Partner
        payout for that booking are adjusted for the refunded amount.
      </p>
    ),
  },
  {
    heading: "Bookings must stay on SafarBuddy",
    body: (
      <p>
        For guests who book through SafarBuddy, the Partner must not ask or
        encourage them to pay outside the platform in order to avoid the
        commission. Doing so can lead to suspension or removal of the listing.
      </p>
    ),
  },
  {
    heading: "Listing accuracy and availability",
    body: (
      <p>
        The Partner is responsible for the accuracy of their property details,
        photos, prices, facilities, house rules and room availability, and must
        honour every booking that SafarBuddy confirms. The Partner must keep
        availability up to date so that rooms are not sold twice.
      </p>
    ),
  },
  {
    heading: "Verification and approval",
    body: (
      <p>
        Every listing is reviewed by the SafarBuddy team, including the
        identity and payout documents submitted, before it goes live.
        SafarBuddy may ask for more information, decline a listing, or suspend
        or remove a listing that breaks these terms or the law.
      </p>
    ),
  },
  {
    heading: "Taxes",
    body: (
      <p>
        The Partner is responsible for their own tax registrations, invoices
        and tax payments on the income they earn. Where the law requires
        SafarBuddy to collect or deduct tax from a payout, SafarBuddy will do
        so and show it in the settlement statement.
      </p>
    ),
  },
  {
    heading: "Changes to these terms or the commission",
    body: (
      <p>
        SafarBuddy may update these terms or the commission rate. A change
        applies only to bookings paid after the Partner has been told about it
        and has accepted the updated terms. Bookings already paid keep the
        commission that applied when they were paid.
      </p>
    ),
  },
  {
    heading: "Record of your agreement",
    body: (
      <p>
        When the Partner ticks the box and submits the listing, SafarBuddy
        records the version of these terms, the commission percentage shown,
        the date and time, and the device and network details used, as proof
        of the agreement.
      </p>
    ),
  },
];

export default function PartnerTermsPage() {
  return (
    <LegalPage
      title="Hotel Partner Terms & Commission Agreement"
      intro="Please read these terms before listing your property on SafarBuddy. They explain the commission we charge, how payouts work, and what we expect from every partner."
      sections={sections}
    />
  );
}
