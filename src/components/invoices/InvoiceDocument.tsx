// src/components/invoices/InvoiceDocument.tsx
// INVOICE-01 Step 3b — downloadable-PDF renderer.
//
// Driven by the same InvoiceViewModel as InvoiceView.tsx (see
// invoice-view-model.ts header comment for why this, not one literal
// shared JSX tree, is what "one template" means when the two outputs
// are HTML and a PDF). @react-pdf/renderer's Document/Page/View/Text
// are non-DOM primitives rendered by its own layout engine — plain
// Tailwind classes do not apply here, so colors/spacing are restated as
// a StyleSheet using the same palette (deep/ink/cream) as the rest of
// the site's Tailwind config, kept in sync by eye since react-pdf
// cannot consume tailwind.config directly.
//
// Not wired to any download route yet (Step 4/5). See
// render-invoice-pdf.ts for the server-only helper that turns this into
// a Buffer once a route needs one.

import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { InvoiceViewModel } from '@/lib/invoices/invoice-view-model';

const COLOR_DEEP = '#1f2a37';
const COLOR_INK_60 = '#4b5563';
const COLOR_INK_45 = '#6b7280';
const COLOR_BORDER = 'rgba(31, 42, 55, 0.15)';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    color: COLOR_INK_60,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: COLOR_BORDER,
    paddingBottom: 16,
  },
  paidLabel: {
    fontSize: 9,
    fontWeight: 700,
    color: '#16a34a',
  },
  title: {
    marginTop: 6,
    fontSize: 22,
    fontWeight: 700,
    color: COLOR_DEEP,
  },
  subtitle: {
    marginTop: 3,
    fontSize: 10,
    color: COLOR_INK_60,
  },
  metaLabel: {
    fontSize: 8,
    color: COLOR_INK_45,
    textAlign: 'right',
  },
  metaValue: {
    fontSize: 10,
    fontWeight: 700,
    color: COLOR_DEEP,
    textAlign: 'right',
    marginBottom: 6,
  },
  twoCol: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  col: {
    width: '48%',
  },
  smallLabel: {
    fontSize: 8,
    color: COLOR_INK_45,
    marginBottom: 3,
  },
  bold: {
    fontSize: 10,
    fontWeight: 700,
    color: COLOR_DEEP,
  },
  section: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: COLOR_BORDER,
    paddingTop: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  rowLabel: {
    color: COLOR_INK_45,
  },
  rowValueBold: {
    fontWeight: 700,
    color: COLOR_DEEP,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLOR_BORDER,
    paddingTop: 10,
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: 700,
    color: COLOR_DEEP,
  },
  totalValue: {
    fontSize: 12,
    fontWeight: 700,
    color: COLOR_DEEP,
  },
  footerNote: {
    marginTop: 24,
    fontSize: 8,
    color: COLOR_INK_45,
  },
});

export default function InvoiceDocument({ invoice }: { invoice: InvoiceViewModel }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.paidLabel}>PAYMENT RECEIVED</Text>
            <Text style={styles.title}>Invoice</Text>
            <Text style={styles.subtitle}>{invoice.bookingTypeLabel}</Text>
          </View>

          <View>
            <Text style={styles.metaLabel}>Invoice number</Text>
            <Text style={styles.metaValue}>{invoice.invoiceNumber}</Text>
            <Text style={styles.metaLabel}>Issued</Text>
            <Text style={styles.metaValue}>{invoice.generatedAtLabel}</Text>
          </View>
        </View>

        <View style={styles.twoCol}>
          <View style={styles.col}>
            <Text style={styles.smallLabel}>Billed to</Text>
            <Text style={styles.bold}>{invoice.customerName}</Text>
            {invoice.customerEmail && <Text>{invoice.customerEmail}</Text>}
            {invoice.customerPhone && <Text>{invoice.customerPhone}</Text>}
          </View>

          <View style={styles.col}>
            <Text style={styles.smallLabel}>Booking number</Text>
            <Text style={styles.bold}>{invoice.bookingNumber}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>{invoice.itemName}</Text>
            <Text style={styles.rowValueBold}>{invoice.itemLocation ?? ''}</Text>
          </View>

          {invoice.vendorName && (
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Provided by</Text>
              <Text style={styles.rowValueBold}>{invoice.vendorName}</Text>
            </View>
          )}

          <View style={styles.row}>
            <Text style={styles.rowLabel}>{invoice.stayOrTravelLabel}</Text>
            <Text style={styles.rowValueBold}>{invoice.stayOrTravelValue}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Guests</Text>
            <Text style={styles.rowValueBold}>{invoice.guestsLabel}</Text>
          </View>
        </View>

        <View style={styles.section}>
          {invoice.lineItems.map((item) => (
            <View style={styles.row} key={item.label}>
              <Text style={styles.rowLabel}>{item.label}</Text>
              <Text>{item.value}</Text>
            </View>
          ))}

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Amount paid</Text>
            <Text style={styles.totalValue}>{invoice.amountPaidLabel}</Text>
          </View>
        </View>

        <Text style={styles.footerNote}>
          This invoice also serves as your booking voucher.
        </Text>
      </Page>
    </Document>
  );
}

