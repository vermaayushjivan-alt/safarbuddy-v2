
// INVOICE-01 Step 4 — admin invoice view.
//
// RULE 15 audit note (2026-09-18): DEVELOPMENT_BIBLE.md Section J's
// original plan said "list + link from /admin/bookings detail" —
// but /admin/bookings is a flat list with no [id] detail page to add
// a link to. Rather than build a full booking-detail page (not asked
// for, separate scope), this is a small dedicated invoice-only route,
// linked directly from the list's Actions column instead. Deliberately
// no PDF download button here — that needs its own route wrapping
// renderInvoicePdfBuffer() and is left for a future session (Step 5 /
// customer UI territory) rather than blending scope (RULE 11).
//
// No new backend logic: getInvoiceByBookingIdAdmin() (role-checked),
// buildInvoiceViewModel(), and <InvoiceView> already existed from
// Step 3a/3b — this route is only new wiring.

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getInvoiceByBookingIdAdmin } from '@/app/actions/invoice.actions';
import { buildInvoiceViewModel } from '@/lib/invoices/invoice-view-model';
import InvoiceView from '@/components/invoices/InvoiceView';

export default async function AdminBookingInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // getInvoiceByBookingIdAdmin() throws on UNAUTHENTICATED/FORBIDDEN
  // (requireRole) — treated as notFound() here, same pattern as
  // /admin/settlements/[vendorId]/page.tsx. A booking that exists but
  // has no invoice yet (not confirmed/paid) returns null, not a
  // throw — handled separately below, not as a 404.
  let invoice;
  try {
    invoice = await getInvoiceByBookingIdAdmin(id);
  } catch {
    notFound();
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <Link
        href="/admin/bookings"
        className="focus-ring mb-6 inline-block text-[13px] font-semibold text-deep hover:underline"
      >
        ← All bookings
      </Link>

      {invoice ? (
        <InvoiceView invoice={buildInvoiceViewModel(invoice)} />
      ) : (
        <div className="rounded-2xl border border-deep/15 bg-white px-6 py-10 text-center">
          <p className="text-[14px] text-ink/60">
            No invoice has been generated for this booking yet. Invoices
            are created automatically once payment is confirmed.
          </p>
        </div>
      )}
    </div>
  );
}
