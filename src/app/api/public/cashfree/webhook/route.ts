// src/app/api/public/cashfree/webhook/route.ts
// PAY-02 — Cashfree webhook -> public.payments -> booking confirmation.

import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { verifyWebhookSignature } from "@/lib/cashfree/cashfree.client";
import { PaymentRepository } from "@/lib/repositories/payment.repository";
import { BookingRepository } from "@/lib/repositories/booking.repository";
import { computeCommissionSplit } from "@/lib/payments/commission";
import { HotelRepository } from "@/lib/repositories/hotel.repository";
import { PackageRepository } from "@/lib/repositories/package.repository";
import { notifyBookingCreated } from "@/lib/notifications/dispatch";
import { generateInvoiceForBooking } from "@/lib/invoices/generate-invoice";

export const runtime = "nodejs";

const CF_STATUS_MAP: Record<
  string,
  "pending" | "success" | "failed" | "cancelled"
> = {
  SUCCESS: "success",
  PENDING: "pending",
  FAILED: "failed",
  USER_DROPPED: "failed",
  CANCELLED: "cancelled",
  // FLAGGED (fraud/manual review) has no dedicated terminal value in
  // the live `payments_status_check` constraint. Mapped to "pending"
  // (not terminal) so a later webhook resolving the review to
  // SUCCESS/FAILED can still update the row. The raw "FLAGGED" value
  // is preserved in `gateway_payment_status` for admin/audit visibility.
  FLAGGED: "pending",
};

function ok() {
  return NextResponse.json(
    { success: true },
    { status: 200 }
  );
}

function badRequest(reason: string) {
  console.warn(
    `[Cashfree Webhook] ${reason}`
  );

  return NextResponse.json(
    { error: "Bad request" },
    { status: 400 }
  );
}

function serverError() {
  return NextResponse.json(
    { error: "Internal error" },
    { status: 500 }
  );
}

export async function POST(
  request: NextRequest
): Promise<NextResponse> {
  let rawBody: string;

  try {
    rawBody = await request.text();
  } catch {
    return badRequest(
      "Failed to read request body"
    );
  }

  const timestamp =
    request.headers.get(
      "x-webhook-timestamp"
    );

  const signature =
    request.headers.get(
      "x-webhook-signature"
    );

  if (!timestamp || !signature) {
    return badRequest(
      "Missing webhook headers"
    );
  }

  if (
    !verifyWebhookSignature(
      timestamp,
      rawBody,
      signature
    )
  ) {
    return badRequest(
      "Invalid signature"
    );
  }

  let payload: Record<string, unknown>;

  try {
    payload = JSON.parse(rawBody) as Record<
      string,
      unknown
    >;
  } catch {
    return badRequest(
      "Invalid JSON payload"
    );
  }

  const data =
    payload.data as
      | Record<string, unknown>
      | undefined;

  const order =
    data?.order as
      | Record<string, unknown>
      | undefined;

  const paymentData =
    data?.payment as
      | Record<string, unknown>
      | undefined;

  if (!order || !paymentData) {
    return ok();
  }

  const merchantOrderId =
    order.order_id;

  const rawStatus =
    paymentData.payment_status;

  const cfPaymentId =
    paymentData.cf_payment_id;

  const paymentAmount =
    paymentData.payment_amount;

  const paymentCurrency =
    paymentData.payment_currency;

  const paymentMethod =
    paymentData.payment_group;

  const paymentMessage =
    paymentData.payment_message;

  if (
    typeof merchantOrderId !== "string" ||
    !merchantOrderId
  ) {
    return badRequest(
      "Missing order_id in payload"
    );
  }

  if (
    typeof rawStatus !== "string" ||
    !rawStatus
  ) {
    return badRequest(
      "Missing payment_status in payload"
    );
  }

  const mappedStatus =
    CF_STATUS_MAP[rawStatus];

  if (!mappedStatus) {
    // Unknown Cashfree statuses are acknowledged
    // but never acted upon.
    return ok();
  }

  let supabase;

  try {
    // Webhooks have no user cookie. Service-role
    // access is used only after the Cashfree
    // signature has been verified above.
    supabase =
      createServiceRoleClient();
  } catch {
    return serverError();
  }

  const paymentRepo =
    new PaymentRepository(
      supabase
    );

  const bookingRepo =
    new BookingRepository(
      supabase
    );

  let payment;

  try {
    payment =
      await paymentRepo.getPaymentByOrderId(
        merchantOrderId
      );
  } catch (error) {
    console.error(
      "[Cashfree Webhook] Payment lookup failed",
      error
    );

    return serverError();
  }

  if (!payment) {
    console.warn(
      `[Cashfree Webhook] No payment found for gateway_order_id=${merchantOrderId}`
    );

    return ok();
  }

  // Terminal payment states are idempotent.
  // A duplicate webhook must never downgrade
  // a success/failed/cancelled/refunded payment.
  // "pending" is intentionally NOT terminal — both the initial
  // pre-payment state and a Cashfree FLAGGED (manual review) result
  // map to "pending", and a later webhook must still be able to
  // resolve either one.
  if (
    payment.status === "success" ||
    payment.status === "failed" ||
    payment.status === "cancelled" ||
    payment.status === "refunded" ||
    payment.status === "partially_refunded"
  ) {
    return ok();
  }

  if (mappedStatus === "success") {
    const storedAmount =
      Number(payment.amount);

    const receivedAmount =
      typeof paymentAmount === "number"
        ? paymentAmount
        : typeof paymentAmount === "string"
          ? Number(paymentAmount)
          : null;

    const storedCurrency =
      String(
        payment.currency_code || ""
      ).toUpperCase();

    const receivedCurrency =
      typeof paymentCurrency === "string"
        ? paymentCurrency.toUpperCase()
        : null;

    const amountMismatch =
      receivedAmount === null ||
      !Number.isFinite(receivedAmount) ||
      Math.abs(
        receivedAmount -
          storedAmount
      ) > 0.001;

    const currencyMismatch =
      receivedCurrency === null ||
      receivedCurrency !==
        storedCurrency;

    if (
      amountMismatch ||
      currencyMismatch
    ) {
      console.error(
        `[Cashfree Webhook] Payment mismatch: payment=${payment.id}, ` +
          `stored=${storedAmount} ${storedCurrency}, ` +
          `received=${receivedAmount} ${receivedCurrency}`
      );

      try {
        await paymentRepo.updatePaymentStatus(
          payment.id,
          {
            status: "failed",

            gateway_payment_id:
              typeof cfPaymentId ===
              "string"
                ? cfPaymentId
                : null,

            gateway_payment_status:
              rawStatus,

            payment_method:
              typeof paymentMethod ===
              "string"
                ? paymentMethod
                : null,

            failure_reason:
              "Amount or currency mismatch in Cashfree webhook.",

            completed_at:
              new Date().toISOString(),
          }
        );
      } catch (error) {
        console.error(
          "[Cashfree Webhook] Failed to mark mismatch",
          error
        );

        return serverError();
      }

      return ok();
    }
  }

  // PAY-04 — Manual Settlement Tracking. Commission split is computed
  // once, here, from the verified payment amount (Number(payment.amount)
  // — already validated against the Cashfree webhook payload above, not
  // re-read from the request). Snapshot only: never recalculated if the
  // platform commission rate changes later.
  const commissionSplit =
    mappedStatus === "success"
      ? computeCommissionSplit(Number(payment.amount))
      : null;

  try {
    await paymentRepo.updatePaymentStatus(
      payment.id,
      {
        status: mappedStatus,

        gateway_payment_id:
          typeof cfPaymentId ===
          "string"
            ? cfPaymentId
            : undefined,

        gateway_payment_status:
          rawStatus,

        payment_method:
          typeof paymentMethod ===
          "string"
            ? paymentMethod
            : undefined,

        failure_reason:
          mappedStatus === "failed" ||
          mappedStatus === "cancelled"
            ? typeof paymentMessage ===
              "string"
              ? paymentMessage
              : `Cashfree payment status: ${rawStatus}`
            : null,

        completed_at:
          mappedStatus === "success" ||
          mappedStatus === "failed" ||
          mappedStatus === "cancelled"
            ? new Date().toISOString()
            : null,

        platform_commission_amount:
          commissionSplit?.platformCommissionAmount ?? undefined,

        vendor_payout_amount:
          commissionSplit?.vendorPayoutAmount ?? undefined,
      }
    );
  } catch (error) {
    console.error(
      "[Cashfree Webhook] Payment update failed",
      error
    );

    return serverError();
  }

  if (mappedStatus === "success") {
    let booking;

    try {
      booking =
        await bookingRepo.getBookingById(
          payment.booking_id
        );
    } catch (error) {
      console.error(
        "[Cashfree Webhook] Booking lookup failed",
        error
      );

      return serverError();
    }

    if (!booking) {
      console.error(
        `[Cashfree Webhook] Booking ${payment.booking_id} not found`
      );

      return ok();
    }

    if (booking.status === "pending") {
      try {
        await bookingRepo.confirmBooking(
          payment.booking_id
        );
      } catch (error) {
        console.error(
          "[Cashfree Webhook] Booking confirmation failed",
          error
        );

        return serverError();
      }

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
            bookingType: booking.booking_type,
            itemName: bookedHotel
              ? bookedHotel.hotel_name
              : (bookedPackage as { package_name: string }).package_name,
            vendorId: bookedItem.vendor_id,
            itemContact: bookedHotel
              ? { phone: bookedHotel.phone, email: bookedHotel.email }
              : null,
            guestName: booking.guest_name ?? "Registered customer",
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
          await generateInvoiceForBooking(supabase, {
            booking,
            paymentId: payment.id,
            itemName: bookedHotel
              ? bookedHotel.hotel_name
              : (bookedPackage as { package_name: string }).package_name,
            itemLocation: bookedItem.city,
            vendorId: bookedItem.vendor_id,
          });
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
  }

  return ok();
}
