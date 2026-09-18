// src/app/api/invoices/[bookingId]/pdf/route.ts
// INVOICE-01 Step 5b — customer invoice PDF download.
//
// No route has called renderInvoicePdfBuffer() (Step 3b) until now —
// this is that route. Auth + ownership are enforced by
// getMyInvoiceByBookingId() (Step 3a) exactly as the web-view page
// (Step 5a) uses it: it throws 'UNAUTHENTICATED' with no session, and
// returns null for a booking that doesn't exist, isn't the caller's,
// or hasn't had an invoice generated yet (not paid/confirmed) — all
// three collapse to the same 404 here, same "don't leak which case it
// is" reasoning as the Step 5a page.
//
// Admin download is intentionally out of scope here — this route only
// authorizes via the customer ownership path. A future admin download
// button (on src/app/admin/bookings/[id]/invoice/page.tsx, Step 4)
// would need its own route or an additional auth branch — not added
// now since it wasn't asked for (RULE 11).

import { NextRequest, NextResponse } from 'next/server';
import { getMyInvoiceByBookingId } from '@/app/actions/invoice.actions';
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
    invoice = await getMyInvoiceByBookingId(bookingId);
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHENTICATED') {
      return NextResponse.json(
        { error: 'Please sign in to download this invoice.' },
        { status: 401 }
      );
    }

    console.error('[invoice PDF] getMyInvoiceByBookingId failed', error);
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
    console.error('[invoice PDF] renderInvoicePdfBuffer failed', error);
    return NextResponse.json(
      { error: 'Could not generate the invoice PDF.' },
      { status: 500 }
    );
  }

  // Buffer<ArrayBufferLike> is not directly assignable to BodyInit
  // (attempt 1) nor to BlobPart (attempt 2, via Blob) under this
  // project's Next.js 16 / TS lib set — both confirmed by real `tsc`
  // errors on Vercel. Buffer's `.buffer` property is typed
  // ArrayBufferLike (which could technically be a SharedArrayBuffer),
  // while both BodyInit and BlobPart's ArrayBufferView require a
  // plain ArrayBuffer specifically. `new Uint8Array(pdfBuffer)` copies
  // the bytes into a brand-new Uint8Array backed by a fresh, plain
  // ArrayBuffer (never a SharedArrayBuffer) — that satisfies both
  // typings, and NextResponse accepts a Uint8Array body directly, no
  // Blob wrapper needed.
  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="invoice-${viewModel.invoiceNumber}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
