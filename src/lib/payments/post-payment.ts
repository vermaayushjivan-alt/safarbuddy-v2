// ROOT PATH: src/lib/payments/post-payment.ts
// GOLIVE-02 — side effects that run ONCE after a booking has been moved from
// 'pending' to 'confirmed' by a verified successful payment.
//
// MOVED, NOT REWRITTEN: the block below is the original code from
// src/app/api/public/cashfree/webhook/route.ts (REFERRAL-01, CONTACT-02,
// INVOICE-01 Step 3a, CUSTOMER-NOTIFY-01), moved verbatim into its own
// function so the webhook can run it AFTER sending its 200 response (via
// next/server `after()`), instead of making Cashfree wait for SMTP and PDF
// rendering. Every comment explaining WHY each step exists was kept.
//
// "Only once" guarantee: the caller runs this only when ITS call performed
// the pending -> confirmed transition (see confirmBookingIfPending in
// booking.repository.ts, which is atomic). A duplicate or retried webhook
// gets null back there and never reaches this function.
//
// Never throws: every step is wrapped, logs with context (RULE 38).

import { HotelRepository } from "@/lib/repositories/hotel.repository";
import { PackageRepository } from "@/lib/repositories/package.repository";
import type { BookingRecord } from "@/lib/repositories/booking.repository";
import type { PaymentRecord } from "@/lib/repositories/payment.repository";
import type { SupabaseClientType } from "@/lib/repositories/types";
import { notifyBookingCreated, notifyCustomerBookingConfirmed } from "@/lib/notifications/dispatch";
import { generateInvoiceForBooking, resolveRecipient } from "@/lib/invoices/generate-invoice";
import { renderInvoicePdfBuffer } from "@/lib/invoices/render-invoice-pdf";
import { buildInvoiceViewModel } from "@/lib/invoices/invoice-view-model";
import { grantReferralRewardForPaidBooking } from "@/lib/referrals/referral-service";

export async function runPostConfirmationSideEffects(
  supabase: SupabaseClientType,
  payment: PaymentRecord,
  booking: BookingRecord
): Promise<void> {
  // REFERRAL-01 — reward the referrer on the referred friend's
  // FIRST confirmed paid booking. Same once-per-booking guarantee as
  // the blocks below (this whole block only runs when the booking
  // was still 'pending'), plus an atomic claim inside the function.
  // Never throws and never affects the webhook response.
  await grantReferralRewardForPaidBooking(supabase, {
    id: booking.id,
    customerId: booking.user_id,
  });

  // CONTACT-02 — Payment-Triggered Notifications.
  //
  // RULE 15 audit: notifyBookingCreated() (CONTACT-01) previously
  // fired from createBooking() in booking.actions.ts, i.e. the
  // instant a `bookings` row was inserted with status='pending' —
  // before Cashfree had confirmed anything. Every checkout attempt
  // alerted the hotel/vendor, including ones the guest abandoned
  // at the payment page and never paid for. Root cause: the
  // notification trigger point was "booking exists", not "booking
  // is actually going to happen." Moved here, right after the
  // booking is confirmed on a verified successful payment (this
  // whole block only runs once per payment — see the terminal-
  // status idempotency check above — and only when the booking
  // was still 'pending', so this fires exactly once per booking).
  //
  // Files: booking.actions.ts (notifyBookingCreated() call and its
  // now-unused import removed — no duplicate trigger left behind,
  // RULE 11), this file (call added).
  //
  // Why here and not inside confirmBooking() itself: confirmBooking()
  // lives in the repository layer (RULE 3 — data layer only, no
  // side effects/business logic), so the trigger belongs in the
  // caller, same pattern CONTACT-01 already used.
  //
  // Minimal plan: fetch just enough (hotel or package row, for
  // name/contact/vendor_id) to rebuild the same
  // NotifyBookingCreatedInput shape CONTACT-01 already defined —
  // no changes to dispatch.ts itself.
  try {
    const bookedHotel =
      booking.booking_type === "hotel"
        ? await new HotelRepository(supabase).getHotelById(
            booking.hotel_id as string
          )
        : null;

    const bookedPackage =
      booking.booking_type === "package"
        ? await new PackageRepository(supabase).getPackageById(
            booking.package_id as string
          )
        : null;

    const bookedItem = bookedHotel ?? bookedPackage;

    if (bookedItem) {
      await notifyBookingCreated(supabase, {
        bookingId: booking.id,
        // BOOKING-NUM-01: human-facing reference shown in the
        // email/subject line instead of the raw UUID above.
        bookingNumber: booking.booking_number,
        bookingType: booking.booking_type,
        itemName: bookedHotel
          ? bookedHotel.hotel_name
          : (bookedPackage as { package_name: string }).package_name,
        vendorId: bookedItem.vendor_id,
        itemContact: bookedHotel
          ? { phone: bookedHotel.phone, email: bookedHotel.email }
          : null,
        guestName: booking.guest_name ?? "Registered customer",
        // CONTACT-03: now always populated (see BOOKING-03/CONTACT-03
        // comments on bookings.guest_email/guest_phone) — passed
        // through so both the hotel/vendor email and the new admin
        // alert can show the actual booking-time contact, not just
        // the guest's name.
        guestEmail: booking.guest_email,
        guestPhone: booking.guest_phone,
        checkInDate: booking.check_in_date,
        checkOutDate: booking.check_out_date,
        travelDate: booking.travel_date,
      });
    } else {
      console.error(
        `[Cashfree Webhook] notifyBookingCreated skipped — ${booking.booking_type} ` +
          `${booking.booking_type === "hotel" ? booking.hotel_id : booking.package_id} not found`
      );
    }
  } catch (error) {
    // notifyBookingCreated() itself never throws (see dispatch.ts),
    // but the hotel/package lookup above can. Either way this must
    // never turn into a failed webhook response — the payment and
    // booking are already correctly recorded above; a notification
    // failure must not make Cashfree retry a webhook that already
    // succeeded.
    console.error(
      "[Cashfree Webhook] notifyBookingCreated dispatch failed",
      error
    );
  }

  // INVOICE-01 Step 3a — invoice/voucher snapshot generation.
  //
  // Same call site and same "fire once, on confirmed payment"
  // guarantee as CONTACT-02 above (this whole block only runs when
  // the booking was still 'pending', and the terminal-status
  // idempotency check earlier in this handler already prevents a
  // duplicate payment from reaching here at all). See
  // DEVELOPMENT_BIBLE.md Section J for the RULE 15 audit that
  // scoped this trigger point.
  //
  // generateInvoiceForBooking() never throws (see its own header
  // comment) — this try/catch is belt-and-suspenders, matching the
  // notifyBookingCreated block above, not a sign that it can.
  //
  // bookedHotel/bookedPackage are re-fetched here rather than
  // reused from the notifyBookingCreated block above — those are
  // scoped to that block's own try {}, and this block must survive
  // independently of whether that one threw.
  try {
    const bookedHotel =
      booking.booking_type === "hotel"
        ? await new HotelRepository(supabase).getHotelById(
            booking.hotel_id as string
          )
        : null;

    const bookedPackage =
      booking.booking_type === "package"
        ? await new PackageRepository(supabase).getPackageById(
            booking.package_id as string
          )
        : null;

    const bookedItem = bookedHotel ?? bookedPackage;

    if (bookedItem) {
      const invoice = await generateInvoiceForBooking(supabase, {
        booking,
        paymentId: payment.id,
        itemName: bookedHotel
          ? bookedHotel.hotel_name
          : (bookedPackage as { package_name: string }).package_name,
        itemLocation: bookedItem.city,
        vendorId: bookedItem.vendor_id,
        // INVOICE-EXTRAS-01: only a hotel booking has these —
        // bookedHotel is null for a package, so both stay
        // undefined -> null on the invoice, matching
        // check_in_date/check_out_date's existing package
        // behavior.
        checkInTime: bookedHotel?.check_in_time,
        checkOutTime: bookedHotel?.check_out_time,
        cancellationPolicy: bookedHotel?.cancellation_policy,
      });

      // CUSTOMER-NOTIFY-01 — fires regardless of whether `invoice`
      // above is null (invoice generation can fail independently,
      // see that function's own error handling) — a paying
      // customer must always get a confirmation email, with or
      // without the PDF attached. Wrapped in its own try/catch,
      // separate from the outer one below, so a failure here can
      // never be blamed on/confused with an invoice failure in
      // the logs.
      try {
        const recipient = await resolveRecipient(supabase, booking);

        if (recipient.email) {
          let invoicePdf: { buffer: Buffer; invoiceNumber: string } | null = null;

          if (invoice) {
            try {
              const buffer = await renderInvoicePdfBuffer(
                buildInvoiceViewModel(invoice)
              );
              invoicePdf = { buffer, invoiceNumber: invoice.invoice_number };
            } catch (pdfError) {
              console.error(
                "[Cashfree Webhook] invoice PDF render failed for customer email",
                pdfError
              );
            }
          }

          await notifyCustomerBookingConfirmed({
            bookingId: booking.id,
            bookingNumber: booking.booking_number,
            bookingType: booking.booking_type,
            itemName: bookedHotel
              ? bookedHotel.hotel_name
              : (bookedPackage as { package_name: string }).package_name,
            itemLocation: bookedItem.city,
            customerName: recipient.name,
            customerEmail: recipient.email,
            checkInDate: booking.check_in_date,
            checkOutDate: booking.check_out_date,
            travelDate: booking.travel_date,
            amountPaidLabel: `${booking.currency} ${booking.price_snapshot}`,
            invoicePdf,
          });
        } else {
          console.error(
            "[Cashfree Webhook] customer confirmation skipped — no resolvable email for booking",
            booking.id
          );
        }
      } catch (customerEmailError) {
        console.error(
          "[Cashfree Webhook] notifyCustomerBookingConfirmed dispatch failed",
          customerEmailError
        );
      }
    } else {
      console.error(
        `[Cashfree Webhook] generateInvoiceForBooking skipped — ${booking.booking_type} ` +
          `${booking.booking_type === "hotel" ? booking.hotel_id : booking.package_id} not found`
      );
    }
  } catch (error) {
    console.error(
      "[Cashfree Webhook] generateInvoiceForBooking dispatch failed",
      error
    );
  }
}
