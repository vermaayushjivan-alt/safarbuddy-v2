// src/lib/invoices/render-invoice-pdf.ts
// INVOICE-01 Step 3b — PDF-buffer helper.
//
// Thin wrapper around @react-pdf/renderer's renderToBuffer so the
// eventual download route (Step 4/5 — not built yet, no route calls
// this today) has one function to call rather than reaching into
// @react-pdf/renderer directly. Server-only: react-pdf's renderer runs
// in Node, not the browser.

import 'server-only';
import { renderToBuffer } from '@react-pdf/renderer';
import InvoiceDocument from '@/components/invoices/InvoiceDocument';
import type { InvoiceViewModel } from '@/lib/invoices/invoice-view-model';

export async function renderInvoicePdfBuffer(invoice: InvoiceViewModel): Promise<Buffer> {
  return renderToBuffer(InvoiceDocument({ invoice }));
}

