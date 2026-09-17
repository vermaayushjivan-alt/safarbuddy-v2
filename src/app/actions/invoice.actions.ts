'use server';

// INVOICE-01 Step 3a — fetch-only Server Actions.
//
// No create action here on purpose: invoices are never user-triggered
// (DEVELOPMENT_BIBLE.md Section J product-scope decision — generated
// on payment success inside the Cashfree webhook, never admin-manual).
// generateInvoiceForBooking() (src/lib/invoices/generate-invoice.ts) is
// called only from src/app/api/public/cashfree/webhook/route.ts.
//
// Not wired into any page yet — that's Step 4 (admin UI) / Step 5
// (customer UI), separate future sessions per SESSION_HANDOFF.md's
// one-step-at-a-time pattern. These two actions exist now so Step 3a
// is a complete, working backend slice on its own.

import { createClient } from '@/lib/supabase/server';
import { requireRole, getAuthUser, resolvePublicUserId } from '@/lib/auth/session';
import { InvoiceRepository, InvoiceRecord } from '@/lib/repositories/invoice.repository';
import { BookingRepository } from '@/lib/repositories/booking.repository';

// --- Admin: fetch by booking id ---
export async function getInvoiceByBookingIdAdmin(
  bookingId: string
): Promise<InvoiceRecord | null> {
  await requireRole(['admin', 'super_admin']);

  const supabase = await createClient();
  const invoiceRepo = new InvoiceRepository(supabase);

  return invoiceRepo.getInvoiceByBookingId(bookingId);
}

// --- Customer: fetch own invoice by booking id ---
// Ownership check mirrors getMyBookingById (booking.actions.ts) —
// booking.customer_id must match the signed-in user's public.users id.
// Guest-checkout access (BOOKING-03, no session at all) is intentionally
// NOT covered here — getGuestBookingConfirmation's trust model (opaque
// booking UUID as the access token) is a Step 5 decision, not assumed
// here.
export async function getMyInvoiceByBookingId(
  bookingId: string
): Promise<InvoiceRecord | null> {
  const authUser = await getAuthUser();

  if (!authUser) {
    throw new Error('UNAUTHENTICATED');
  }

  const supabase = await createClient();
  const customerId = await resolvePublicUserId(supabase, authUser.id);

  const bookingRepo = new BookingRepository(supabase);
  const invoiceRepo = new InvoiceRepository(supabase);

  const booking = await bookingRepo.getBookingById(bookingId);

  if (!booking || booking.customer_id !== customerId) {
    return null;
  }

  return invoiceRepo.getInvoiceByBookingId(bookingId);
}

