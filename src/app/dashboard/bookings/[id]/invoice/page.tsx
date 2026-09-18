// src/app/dashboard/bookings/[id]/invoice/page.tsx
// INVOICE-01 Step 5a — customer invoice view.
//
// Mirrors Step 4's admin invoice page (src/app/admin/bookings/[id]/invoice/page.tsx)
// but auth/ownership follows the customer pattern already used by
// dashboard/bookings/[id]/pay/page.tsx instead: getAuthUser() ->
// redirect('/login') if unauthenticated, then getMyBookingById() for an
// ownership-scoped existence check (same function the Pay Now page
// already uses) so "no such booking" and "not your booking" show the
// same generic message rather than leaking which case it is.
//
// getMyInvoiceByBookingId() (invoice.actions.ts, Step 3a) re-does its
// own ownership check internally too — kept as-is (defense in depth,
// not a new pattern) rather than trusting the getMyBookingById() call
// above alone.
//
// No new backend logic beyond this page + the Download PDF route
// (Step 5b, src/app/api/invoices/[bookingId]/pdf/route.ts) — reuses
// buildInvoiceViewModel() and <InvoiceView> from Step 3b as-is.

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth/session';
import { getMyBookingById } from '@/app/actions/booking.actions';
import { getMyInvoiceByBookingId } from '@/app/actions/invoice.actions';
import { buildInvoiceViewModel } from '@/lib/invoices/invoice-view-model';
import InvoiceView from '@/components/invoices/InvoiceView';

export default async function MyBookingInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const authUser = await getAuthUser();
  if (!authUser) {
    redirect('/login');
  }

  const booking = await getMyBookingById(id);

  if (!booking) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="font-heading text-xl font-bold text-deep">
          Booking not found
        </h1>
        <p className="mt-2 text-[14px] text-ink/60">
          This booking does not exist or does not belong to your account.
        </p>
      </main>
    );
  }

  const invoice = await getMyInvoiceByBookingId(id);

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <Link
        href="/dashboard/bookings"
        className="focus-ring mb-6 inline-block text-[13px] font-semibold text-deep hover:underline"
      >
        ← My bookings
      </Link>

      {invoice ? (
        <>
          <InvoiceView invoice={buildInvoiceViewModel(invoice)} />

          <div className="mx-auto mt-4 max-w-2xl text-right">
            <a
              href={`/api/invoices/${booking.id}/pdf`}
              className="focus-ring inline-block rounded-lg border border-deep/15 px-4 py-2 text-[13px] font-semibold text-deep transition hover:bg-mist"
            >
              Download PDF
            </a>
          </div>
        </>
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
