// src/lib/invoices/invoice-view-model.ts
// INVOICE-01 Step 3b — shared view model.
//
// Neither renderer (InvoiceView.tsx for the web page, InvoiceDocument.tsx
// for the PDF) talks to InvoiceRecord directly. Both call
// buildInvoiceViewModel() first and render off its output. This is what
// "one shared template" (DEVELOPMENT_BIBLE.md Section J / Step 1 product
// decision) actually means in practice: @react-pdf/renderer's Document/
// Page/View/Text primitives are not DOM elements, so a single JSX tree
// cannot literally serve both HTML and PDF output. What *can* be shared
// — and is, here — is every formatting/derivation decision (line items,
// date formatting, currency formatting, labels) so the two renderers can
// never drift into showing different numbers or wording for the same
// invoice. Neither component below re-derives anything from raw
// InvoiceRecord fields itself; they only lay the same values out with
// different primitives.
//
// Pure function, no I/O — safe to call from a Server Component (web view)
// or a route handler (PDF generation).

import type { InvoiceRecord } from '@/lib/repositories/invoice.repository';export interface InvoiceLineItem {
  label: string;
  value: string;
}

export interface InvoiceViewModel {
  invoiceNumber: string;
  generatedAtLabel: string;
  bookingNumber: string;
  bookingTypeLabel: string;

  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;

  itemName: string;
  itemLocation: string | null;
  vendorName: string | null;

  stayOrTravelLabel: string;
  stayOrTravelValue: string;
  guestsLabel: string;

  // INVOICE-EXTRAS-01 (this session) — pass-through, null when not
  // applicable (package booking, or a hotel with no policy on file —
  // see migration 022's header). Rendered as small print at the
  // bottom, not part of the amount/line-item section above.
  cancellationPolicy: string | null;

  // Amount breakdown, in display order. Empty for a field with no
  // value (e.g. no coupon applied) rather than showing a zero row.
  lineItems: InvoiceLineItem[];
  amountPaidLabel: string;
}

// Trims a stored time value like "14:00:00" down to "14:00" for
// display — hotels.check_in_time/check_out_time (and this invoice's
// own snapshot copy of them) turned out to serialize with seconds
// from Postgres even though they were typed as plain text, not
// confirmed before this was first wired up. Passes through anything
// that doesn't match the expected shape unchanged, rather than
// guessing further.
function trimSeconds(value: string): string {
  return /^\d{2}:\d{2}:\d{2}$/.test(value) ? value.slice(0, 5) : value;
}

function formatDate(value: string | null): string | null {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// Matches the ₹-prefix convention already used throughout the admin/
// public UI (e.g. src/app/admin/payments/page.tsx) for INR, and falls
// back to a plain currency-code prefix for anything else — this project
// has no other currency in production today, but the schema (migration
// 015) does not hardcode INR, so this does not either.
function formatMoney(value: number | null, currency: string): string | null {
  if (value === null) return null;

  const formatted = value.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return currency === 'INR' ? `₹${formatted}` : `${currency} ${formatted}`;
}

export function buildInvoiceViewModel(invoice: InvoiceRecord): InvoiceViewModel {
  const isHotel = invoice.booking_type === 'hotel';

  const stayOrTravelValue = isHotel
    ? [formatDate(invoice.check_in_date), formatDate(invoice.check_out_date)]
        .filter(Boolean)
        .join('  →  ') || '—'
    : formatDate(invoice.travel_date) ?? '—';

  // INVOICE-EXTRAS-01: appends "(from 14:00)" / "(until 11:00)" onto
  // the plain date when the hotel's check-in/check-out time was
  // captured on this invoice — never invented when null (older
  // invoices generated before migration 022, or a hotel that never
  // set these on its listing).
  const stayOrTravelValueWithTimes = isHotel
    ? [
        invoice.check_in_date && invoice.check_in_time
          ? `${formatDate(invoice.check_in_date)} (from ${trimSeconds(invoice.check_in_time)})`
          : formatDate(invoice.check_in_date),
        invoice.check_out_date && invoice.check_out_time
          ? `${formatDate(invoice.check_out_date)} (until ${trimSeconds(invoice.check_out_time)})`
          : formatDate(invoice.check_out_date),
      ]
        .filter(Boolean)
        .join('  →  ') || '—'
    : stayOrTravelValue;

  const lineItems: InvoiceLineItem[] = [];

  const subtotalLabel = formatMoney(invoice.subtotal, invoice.currency);
  if (subtotalLabel) lineItems.push({ label: 'Subtotal', value: subtotalLabel });

  const taxesLabel = formatMoney(invoice.taxes, invoice.currency);
  if (taxesLabel) lineItems.push({ label: 'Taxes', value: taxesLabel });

  const discountLabel = formatMoney(invoice.discount, invoice.currency);
  if (discountLabel) lineItems.push({ label: 'Discount', value: `− ${discountLabel}` });

  const couponLabel = formatMoney(invoice.coupon_discount_amount, invoice.currency);
  if (couponLabel && invoice.coupon_code) {
    lineItems.push({
      label: `Coupon (${invoice.coupon_code})`,
      value: `− ${couponLabel}`,
    });
  }

  return {
    invoiceNumber: invoice.invoice_number,
    generatedAtLabel: formatDate(invoice.generated_at) ?? '—',
    bookingNumber: invoice.booking_number,
    bookingTypeLabel: isHotel ? 'Hotel booking' : 'Package booking',

    customerName: invoice.customer_name,
    customerEmail: invoice.customer_email,
    customerPhone: invoice.customer_phone,

    itemName: invoice.item_name,
    itemLocation: invoice.item_location,
    vendorName: invoice.vendor_name,

    stayOrTravelLabel: isHotel ? 'Dates' : 'Travel date',
    stayOrTravelValue: stayOrTravelValueWithTimes,
    guestsLabel: `${invoice.num_guests} ${invoice.num_guests === 1 ? 'guest' : 'guests'}`,

    cancellationPolicy: invoice.cancellation_policy,

    lineItems,
    amountPaidLabel: formatMoney(invoice.amount_paid, invoice.currency) ?? '—',
  };
}

