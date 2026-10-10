'use server';

// INVOICE-01 Step 3a — fetch-only Server Actions.
//
// No create action here on purpose: invoices are never user-triggered
// (DEVELOPMENT_BIBLE.md Section J product-scope decision — generated
// on payment success inside the Cashfree webhook, never admin-manual).
// generateInvoiceForBooking() (src/lib/invoices/generate-invoice.ts) is
// called only from src/app/api/public/cashfree/webhook/route.ts.
//
// FIX (invoice never showed after payment): public.invoices has RLS ON and NO
// policy for logged-in users (migration 015 says so: "RLS itself is not the
// authorization boundary here"). Reading it with the user's own session
// therefore always returned zero rows, so the invoice page showed
// "invoice is being generated" forever even though the invoice existed.
// The invoice is now READ with the service-role client, only AFTER the
// authorization check in each function below (admin role / booking ownership).

import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { requireRole, getAuthUser, resolvePublicUserId } from '@/lib/auth/session';
import { InvoiceRepository, InvoiceRecord } from '@/lib/repositories/invoice.repository';
import { BookingRepository } from '@/lib/repositories/booking.repository';

// --- Admin: fetch by booking id ---
export async function getInvoiceByBookingIdAdmin(
  bookingId: string
): Promise<InvoiceRecord | null> {
  await requireRole(['admin', 'super_admin']);

  // Authorized above; the invoices table has no browser-facing policy.
  const invoiceRepo = new InvoiceRepository(createServiceRoleClient());

  return invoiceRepo.getInvoiceByBookingId(bookingId);
}

// --- Customer: fetch own invoice by booking id ---
// Ownership check mirrors getMyBookingById (booking.actions.ts) —
// booking.customer_id must match the signed-in user's public.users id.
// GOLIVE-06: there is no guest access any more — booking requires login,
// so ownership (customer_id) is the only way in.
export async function getMyInvoiceByBookingId(
  bookingId: string
): Promise<InvoiceRecord | null> {
  const authUser = await getAuthUser();

  if (!authUser) {
    throw new Error('UNAUTHENTICATED');
  }

  // Ownership is checked with the customer's OWN session (RLS applies to
  // bookings: bookings_select_own).
  const supabase = await createClient();
  const customerId = await resolvePublicUserId(supabase, authUser.id);

  const bookingRepo = new BookingRepository(supabase);
  const booking = await bookingRepo.getBookingById(bookingId);

  if (!booking || booking.customer_id !== customerId) {
    return null;
  }

  // Ownership confirmed — now read the invoice (service role: no RLS policy
  // exists for customers on public.invoices).
  const invoiceRepo = new InvoiceRepository(createServiceRoleClient());

  return invoiceRepo.getInvoiceByBookingId(bookingId);
}
