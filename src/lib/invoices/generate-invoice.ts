// src/lib/invoices/generate-invoice.ts
// INVOICE-01 Step 3a — invoice snapshot generation.
//
// Business logic lives here, not in InvoiceRepository (RULE 3 — the
// repository layer is data-only; confirmBooking()'s own header comment
// in booking.repository.ts, and notifications/dispatch.ts for CONTACT-02,
// establish the same split already). Called from the Cashfree webhook,
// right after bookingRepo.confirmBooking() — the same call site
// CONTACT-02's notifyBookingCreated() uses (DEVELOPMENT_BIBLE.md
// Section J, Step 1 product-scope decision).
//
// Never throws. A snapshot-generation failure (missing vendor row, bad
// contact data, etc.) must not turn an already-successful payment +
// booking-confirmation into a failed webhook response — same caution
// CONTACT-02 already documented for notifyBookingCreated(). Every
// failure is logged and swallowed; the invoice can be backfilled later
// if this ever needs a retry path (not built in Step 3a — no evidence
// yet that it's needed).

import { SupabaseClientType } from '@/lib/repositories/types';
import { BookingRecord } from '@/lib/repositories/booking.repository';
import { VendorRepository } from '@/lib/repositories/vendor.repository';
import { UserRepository } from '@/lib/repositories/user.repository';
import {
  InvoiceRepository,
  InvoiceRecord,
  CreateInvoiceInput,
} from '@/lib/repositories/invoice.repository';
import { ConflictError } from '@/lib/errors/database.errors';

export interface GenerateInvoiceInput {
  booking: BookingRecord;
  paymentId: string;
  itemName: string;
  itemLocation: string | null;
  vendorId: string | null;
  // INVOICE-EXTRAS-01 (this session): only meaningful for a hotel
  // booking — a package call site simply omits both, same nullable
  // pattern check_in_date/check_out_date already use for that case.
  checkInTime?: string | null;
  checkOutTime?: string | null;
  cancellationPolicy?: string | null;
}

// Resolves the recipient snapshot from whichever path the booking
// actually took (BOOKING-03): a signed-in customer (public.users) or a
// guest checkout's guest_name/guest_email/guest_phone. Storing the
// resolved values on the invoice row (not a live join) means the
// invoice never needs to re-derive which path was used — see migration
// 015's header comment.
export async function resolveRecipient(
  supabase: SupabaseClientType,
  booking: BookingRecord
): Promise<{ name: string; email: string | null; phone: string | null }> {
  if (booking.customer_id) {
    const user = await new UserRepository(supabase).getUserById(booking.customer_id);

    if (user) {
      return { name: user.full_name, email: user.email, phone: user.phone };
    }
  }

  return {
    name: booking.guest_name ?? 'Guest',
    email: booking.guest_email,
    phone: booking.guest_phone,
  };
}

export async function generateInvoiceForBooking(
  supabase: SupabaseClientType,
  input: GenerateInvoiceInput
): Promise<InvoiceRecord | null> {
  const invoiceRepo = new InvoiceRepository(supabase);
  const { booking } = input;

  try {
    // Idempotency check up front — booking_id is UNIQUE at the DB
    // level too (migration 015), so this is a courtesy that avoids a
    // needless ConflictError on the expected-common case (any webhook
    // retry after Step 3a ships), not the actual safety net.
    const existing = await invoiceRepo.getInvoiceByBookingId(booking.id);

    if (existing) {
      console.info(
        `[generateInvoiceForBooking] Invoice already exists for booking ${booking.id}, skipping`
      );

      return existing;
    }

    const recipient = await resolveRecipient(supabase, booking);

    const vendorName = input.vendorId
      ? (await new VendorRepository(supabase).getVendorById(input.vendorId))?.vendor_name ?? null
      : null;

    const data: CreateInvoiceInput = {
      booking_id: booking.id,
      payment_id: input.paymentId,
      vendor_id: input.vendorId,

      booking_number: booking.booking_number,
      booking_type: booking.booking_type,

      customer_name: recipient.name,
      customer_email: recipient.email,
      customer_phone: recipient.phone,

      item_name: input.itemName,
      item_location: input.itemLocation,
      vendor_name: vendorName,

      check_in_date: booking.check_in_date,
      check_out_date: booking.check_out_date,
      travel_date: booking.travel_date,
      check_in_time: input.checkInTime ?? null,
      check_out_time: input.checkOutTime ?? null,
      cancellation_policy: input.cancellationPolicy ?? null,
      num_guests: booking.num_guests,

      currency: booking.currency,
      subtotal: booking.subtotal,
      taxes: booking.taxes,
      discount: booking.discount,
      coupon_code: booking.coupon_code,
      coupon_discount_amount: booking.coupon_discount_amount,
      // amount_paid = price_snapshot, NOT subtotal/grand_total — see
      // migration 015 header (COUPON-01 finding: price_snapshot is the
      // actual amount Cashfree charged).
      amount_paid: booking.price_snapshot,
    };

    return await invoiceRepo.createInvoice(data);
  } catch (error) {
    if (error instanceof ConflictError) {
      // Two webhook deliveries raced past the getInvoiceByBookingId()
      // check above. The other one won; fetch and return its row
      // rather than treating this as a failure.
      console.info(
        `[generateInvoiceForBooking] Conflict for booking ${booking.id} — already generated by a concurrent call`
      );

      return invoiceRepo.getInvoiceByBookingId(booking.id);
    }

    console.error(
      `[generateInvoiceForBooking] Failed to generate invoice for booking ${booking.id}`,
      error
    );

    return null;
  }
}

