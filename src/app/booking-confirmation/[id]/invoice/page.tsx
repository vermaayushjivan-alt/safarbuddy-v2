// src/app/booking-confirmation/[id]/invoice/page.tsx
// INVOICE-02 — guest-checkout invoice view.
//
// Mirrors src/app/dashboard/bookings/[id]/invoice/page.tsx (the
// logged-in customer version) but for a BOOKING-03 guest booking,
// which has no session at all — getMyInvoiceByBookingId() explicitly
// does not cover this case (see its own header comment in
// invoice.actions.ts), which is the actual gap this page closes.
// Auth/ownership follows the same pattern as the parent
// booking-confirmation page: getGuestInvoiceByBookingId()'s opaque
// booking UUID is the access token, not a session check. This route
// inherits public access from middleware.ts's existing
// `/booking-confirmation/` prefix allowlist entry — no middleware
// change needed.

import Link from 'next/link';
import { notFound } from 'next/navigation';
import Navbar from '@/components/home/Navbar';
import Footer from '@/components/home/Footer';
import { getGuestBookingConfirmation } from '@/app/actions/booking.actions';
import { getGuestInvoiceByBookingId } from '@/app/actions/invoice.actions';
import { isValidUuid } from '@/lib/utils/uuid';
import { buildInvoiceViewModel } from '@/lib/invoices/invoice-view-model';
import InvoiceView from '@/components/invoices/InvoiceView';
import InvoiceGeneratingNotice from '@/components/invoices/InvoiceGeneratingNotice';

export default async function GuestBookingInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!isValidUuid(id)) {
    notFound();
  }

  const booking = await getGuestBookingConfirmation(id);

  if (!booking) {
    notFound();
  }

  const invoice = await getGuestInvoiceByBookingId(id);

  return (
    <main className="bg-cream">
      <Navbar />

      <section className="mx-auto max-w-4xl px-6 py-12">
        <Link
          href={`/booking-confirmation/${id}`}
          className="focus-ring mb-6 inline-block text-[13px] font-semibold text-deep hover:underline"
        >
          ← Back to booking confirmation
        </Link>

        {invoice ? (
          <>
            <InvoiceView invoice={buildInvoiceViewModel(invoice)} />

            <div className="mx-auto mt-4 max-w-2xl text-right">
              <a
                href={`/api/public/invoices/${booking.id}/pdf`}
                className="focus-ring inline-block rounded-lg border border-deep/15 px-4 py-2 text-[13px] font-semibold text-deep transition hover:bg-mist"
              >
                Download PDF
              </a>
            </div>
          </>
        ) : booking.status === 'confirmed' ? (
          <InvoiceGeneratingNotice />
        ) : (
          <div className="rounded-2xl border border-deep/15 bg-white px-6 py-10 text-center">
            <p className="text-[14px] text-ink/60">
              No invoice has been generated for this booking yet. Invoices
              are created automatically once payment is confirmed.
            </p>
          </div>
        )}
      </section>

      <Footer />
    </main>
  );
}
