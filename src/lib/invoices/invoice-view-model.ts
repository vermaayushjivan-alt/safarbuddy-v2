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

import type { InvoiceRecord } from '@/lib/repositories/invoice.repository';

export interface InvoiceLineItem {
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

  // Amount breakdown, in display order. Empty for a field with no
  // value (e.g. no coupon applied) rather than showing a zero row.
  lineItems: InvoiceLineItem[];
  amountPaidLabel: string;
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
    stayOrTravelValue,
    guestsLabel: `${invoice.num_guests} ${invoice.num_guests === 1 ? 'guest' : 'guests'}`,

    lineItems,
    amountPaidLabel: formatMoney(invoice.amount_paid, invoice.currency) ?? '—',
  };
}

