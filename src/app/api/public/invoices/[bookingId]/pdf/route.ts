// src/app/api/public/invoices/[bookingId]/pdf/route.ts
// INVOICE-02 — guest-checkout invoice PDF download.
//
// Mirrors src/app/api/invoices/[bookingId]/pdf/route.ts (the logged-in
// customer route) exactly, except auth/ownership goes through
// getGuestInvoiceByBookingId() instead of getMyInvoiceByBookingId() —
// no session, opaque booking UUID is the access token, same trust
// model as booking-confirmation/[id]/invoice/page.tsx. Under
// /api/public/ specifically so it inherits public access from
// middleware.ts's existing `/api/public` prefix allowlist entry — no
// middleware change needed.

import { NextRequest, NextResponse } from 'next/server';
import { getGuestInvoiceByBookingId } from '@/app/actions/invoice.actions';
import { buildInvoiceViewModel } from '@/lib/invoices/invoice-view-model';
import { renderInvoicePdfBuffer } from '@/lib/invoices/render-invoice-pdf';

export const runtime = 'nodejs';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  const { bookingId } = await params;

  let invoice;

  try {
    invoice = await getGuestInvoiceByBookingId(bookingId);
  } catch (error) {
    console.error('[guest invoice PDF] getGuestInvoiceByBookingId failed', error);
    return NextResponse.json(
      { error: 'Could not generate the invoice PDF.' },
      { status: 500 }
    );
  }

  if (!invoice) {
    return NextResponse.json(
      { error: 'Invoice not found.' },
      { status: 404 }
    );
  }

  const viewModel = buildInvoiceViewModel(invoice);

  let pdfBuffer: Buffer;

  try {
    pdfBuffer = await renderInvoicePdfBuffer(viewModel);
  } catch (error) {
    console.error('[guest invoice PDF] renderInvoicePdfBuffer failed', error);
    return NextResponse.json(
      { error: 'Could not generate the invoice PDF.' },
      { status: 500 }
    );
  }

  // Same ArrayBufferLike -> Uint8Array conversion as the customer PDF
  // route, and for the same reason (see that file's header comment) —
  // Buffer's `.buffer` is typed ArrayBufferLike, not the plain
  // ArrayBuffer NextResponse's body types require.
  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="invoice-${viewModel.invoiceNumber}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
