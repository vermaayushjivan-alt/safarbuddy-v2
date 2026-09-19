// src/components/invoices/InvoiceView.tsx
// INVOICE-01 Step 3b — customer/admin-facing web view of an invoice.
//
// Pure presentational component: takes an InvoiceViewModel (see
// invoice-view-model.ts) and lays it out with the same Tailwind tokens
// used elsewhere on customer-facing pages (bg-cream, text-deep, text-ink,
// see src/app/booking-confirmation/[id]/page.tsx). No data fetching, no
// auth check — the page that renders this (Step 4/5, not built yet)
// owns that.

import type { InvoiceViewModel } from '@/lib/invoices/invoice-view-model';

export default function InvoiceView({ invoice }: { invoice: InvoiceViewModel }) {
  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-deep/15 bg-white p-8">
      {/* LOGO-01: the actual brand SVG, rendered directly — browsers
          display SVG natively via a plain <img>, unlike the PDF
          renderer (see InvoiceDocument.tsx, which needs a rasterized
          PNG instead because @react-pdf/renderer can't parse SVG). */}
      {/* eslint-disable-next-line @next/next/no-img-element -- next/image's optimizer adds no value for a small static brand asset here */}
      <img src="/brand/logo-horizontal.svg" alt="SafarBuddy" className="mb-4 h-6 w-auto" />

      <div className="flex items-start justify-between border-b border-deep/10 pb-6">
        <div>
          <p className="text-[13px] font-semibold text-green-600">
            ✓ Payment received
          </p>
          <h1 className="mt-2 font-display text-3xl text-deep">Invoice</h1>
          <p className="mt-1 text-[13px] text-ink/60">{invoice.bookingTypeLabel}</p>
        </div>

        <div className="text-right">
          <p className="text-[11px] text-ink/45">Invoice number</p>
          <p className="font-semibold text-deep">{invoice.invoiceNumber}</p>
          <p className="mt-2 text-[11px] text-ink/45">Issued</p>
          <p className="text-[13px] text-deep">{invoice.generatedAtLabel}</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-6 text-[13px]">
        <div>
          <p className="text-[11px] text-ink/45">Billed to</p>
          <p className="mt-1 font-semibold text-deep">{invoice.customerName}</p>
          {invoice.customerEmail && (
            <p className="text-ink/60">{invoice.customerEmail}</p>
          )}
          {invoice.customerPhone && (
            <p className="text-ink/60">{invoice.customerPhone}</p>
          )}
        </div>

        <div>
          <p className="text-[11px] text-ink/45">Booking number</p>
          <p className="mt-1 font-semibold text-deep">{invoice.bookingNumber}</p>
        </div>
      </div>

      <dl className="mt-8 space-y-4 border-t border-deep/10 pt-6 text-[13px]">
        <div className="flex justify-between">
          <dt className="text-ink/45">{invoice.itemName}</dt>
          <dd className="font-semibold text-deep">
            {invoice.itemLocation ?? ''}
          </dd>
        </div>

        {invoice.vendorName && (
          <div className="flex justify-between">
            <dt className="text-ink/45">Provided by</dt>
            <dd className="font-semibold text-deep">{invoice.vendorName}</dd>
          </div>
        )}

        <div className="flex justify-between">
          <dt className="text-ink/45">{invoice.stayOrTravelLabel}</dt>
          <dd className="font-semibold text-deep">{invoice.stayOrTravelValue}</dd>
        </div>

        <div className="flex justify-between">
          <dt className="text-ink/45">Guests</dt>
          <dd className="font-semibold text-deep">{invoice.guestsLabel}</dd>
        </div>
      </dl>

      <div className="mt-8 space-y-2 border-t border-deep/10 pt-6 text-[13px]">
        {invoice.lineItems.map((item) => (
          <div key={item.label} className="flex justify-between text-ink/60">
            <span>{item.label}</span>
            <span>{item.value}</span>
          </div>
        ))}

        <div className="flex justify-between border-t border-deep/10 pt-3 text-[15px]">
          <span className="font-semibold text-deep">Amount paid</span>
          <span className="font-semibold text-deep">{invoice.amountPaidLabel}</span>
        </div>
      </div>

      <p className="mt-8 text-[11px] text-ink/45">
        This invoice also serves as your booking voucher.
      </p>

      {invoice.cancellationPolicy && (
        <div className="mt-4 border-t border-deep/10 pt-4">
          <p className="text-[9px] font-semibold text-ink/45">CANCELLATION POLICY</p>
          <p className="mt-1 text-[9px] leading-relaxed text-ink/45">
            {invoice.cancellationPolicy}
          </p>
        </div>
      )}
    </div>
  );
}

