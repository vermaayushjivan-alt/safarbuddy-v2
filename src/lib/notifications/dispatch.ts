import { SupabaseClientType } from '@/lib/repositories/types';
import { NotificationRepository } from '@/lib/repositories/notification.repository';
import { VendorRepository } from '@/lib/repositories/vendor.repository';
import { sendEmail } from './email.client';
import { sendWhatsApp } from './whatsapp.client';

// CONTACT-01 Part 2: fires when a booking is created. Never throws —
// a notification failure (missing API key, network error, bad
// contact data) must never break the booking itself. Every channel
// is attempted and recorded independently, matching the "never
// invalidate a booking" caution already used elsewhere in this
// codebase (see ROOM-04's deleteInventoryForDate guard).
//
// NOTIFY-01 (this session): generalized from hotel-only to also cover
// package bookings. A package has no phone/email columns of its own
// (see PackageRecord) — only vendor_id — so `itemContact` is optional
// and simply omitted by the package call site below. The hotel call
// site keeps passing hotel.phone/hotel.email exactly as before.

export interface NotifyBookingCreatedInput {
  bookingId: string;
  // BOOKING-NUM-01: the human-facing reference (e.g. SB-20260918-A1B2C3,
  // from BookingRepository.generateBookingNumber()) — shown in every
  // email/subject line instead of the raw `bookingId` UUID, which is
  // kept only for the internal booking_id FK column below. Never shown
  // to a hotel/vendor/admin directly; a UUID is not a "booking ID" a
  // human should be reading off an email.
  bookingNumber: string;
  bookingType: 'hotel' | 'package';
  itemName: string;
  vendorId: string | null;
  itemContact?: {
    phone: string | null;
    email: string | null;
  } | null;
  guestName: string;
  // CONTACT-03: the booking-time contact (see BOOKING-03/CONTACT-03
  // comments on bookings.guest_email/guest_phone) — now populated for
  // every booking, not just guest checkout. Optional/nullable purely
  // for defensiveness against older rows created before this fix.
  guestEmail?: string | null;
  guestPhone?: string | null;
  checkInDate: string | null;
  checkOutDate: string | null;
  travelDate: string | null;
}

interface ResolvedContact {
  type: 'hotel' | 'vendor';
  email: string | null;
  phone: string | null;
  name: string;
}

// The booked item's own phone/email takes priority when present
// (hotel bookings — CONTACT-01 Part 1). Falls back to the linked
// vendor's business_email/business_phone (VENDOR-01) when the item
// has none of its own, or has none at all (package bookings always
// take this path). Returns null when neither source has a usable
// contact — the dashboard alert is still created either way so the
// booking is never silently unnoticed.
async function resolveContact(
  supabase: SupabaseClientType,
  input: NotifyBookingCreatedInput
): Promise<ResolvedContact | null> {
  if (input.itemContact?.phone || input.itemContact?.email) {
    return {
      type: 'hotel',
      email: input.itemContact.email,
      phone: input.itemContact.phone,
      name: input.itemName,
    };
  }

  if (input.vendorId) {
    const vendorRepo = new VendorRepository(supabase);
    const vendor = await vendorRepo.getVendorById(input.vendorId);

    if (vendor && (vendor.business_email || vendor.business_phone)) {
      return {
        type: 'vendor',
        email: vendor.business_email,
        phone: vendor.business_phone,
        name: vendor.vendor_name,
      };
    }
  }

  return null;
}

function buildEmailHtml(input: NotifyBookingCreatedInput): string {
  const dates =
    input.bookingType === 'hotel'
      ? input.checkInDate && input.checkOutDate
        ? `${input.checkInDate} to ${input.checkOutDate}`
        : 'Dates not specified'
      : input.travelDate ?? 'Travel date not specified';

  // DISINTERMEDIATION-01: the hotel/vendor email intentionally does NOT
  // include the guest's phone/email — a hotel with the guest's direct
  // contact could take the conversation (and any future rebooking)
  // off-platform, cutting SafarBuddy out. Guest contact details are
  // only ever shown in the admin alert (buildAdminEmailHtml below),
  // which the platform itself controls. Do not add guestPhone/
  // guestEmail back into this template without a deliberate product
  // decision to reverse this.
  return `
    <p>New booking received for <strong>${input.itemName}</strong>.</p>
    <p>Guest: ${input.guestName}</p>
    <p>${input.bookingType === 'hotel' ? 'Dates' : 'Travel date'}: ${dates}</p>
    <p>Booking ID: ${input.bookingNumber}</p>
    <p>View it in the admin panel for full details.</p>
  `;
}

// CONTACT-03: admin alert, separate template from buildEmailHtml()
// above — the admin email is a monitoring/oversight alert (needs the
// vendor/hotel name so the admin knows who was notified), whereas
// buildEmailHtml() is addressed to the hotel/vendor itself.
function buildAdminEmailHtml(
  input: NotifyBookingCreatedInput,
  contact: ResolvedContact | null
): string {
  const dates =
    input.bookingType === 'hotel'
      ? input.checkInDate && input.checkOutDate
        ? `${input.checkInDate} to ${input.checkOutDate}`
        : 'Dates not specified'
      : (input.travelDate ?? 'Travel date not specified');

  return `
    <p>Payment confirmed for a new booking on <strong>${input.itemName}</strong>.</p>
    <p>Guest: ${input.guestName}</p>
    ${input.guestPhone ? `<p>Guest phone: ${input.guestPhone}</p>` : ''}
    ${input.guestEmail ? `<p>Guest email: ${input.guestEmail}</p>` : ''}
    <p>${input.bookingType === 'hotel' ? 'Dates' : 'Travel date'}: ${dates}</p>
    <p>Booking ID: ${input.bookingNumber}</p>
    <p>
      ${contact ? `${contact.type === 'hotel' ? 'Hotel' : 'Vendor'} notified: ${contact.name}${contact.email ? ` (${contact.email})` : ''}` : 'No hotel/vendor contact was configured — they were NOT notified.'}
    </p>
  `;
}

export async function notifyBookingCreated(
  supabase: SupabaseClientType,
  input: NotifyBookingCreatedInput
): Promise<void> {
  try {
    const notificationRepo = new NotificationRepository(supabase);
    const contact = await resolveContact(supabase, input);

    // Dashboard alert is always created, even with no resolvable
    // contact — an admin should still see that a hotel has no
    // configured contact rather than the booking silently going
    // unnoticed everywhere.
    await notificationRepo.createNotification({
      booking_id: input.bookingId,
      recipient_type: contact?.type ?? 'hotel',
      recipient_email: contact?.email ?? null,
      recipient_phone: contact?.phone ?? null,
      channel: 'dashboard',
      status: 'sent',
      error_message: contact
        ? null
        : 'No contact configured for this hotel or its vendor.',
      read_at: null,
      sent_at: new Date().toISOString(),
    });

    // CONTACT-03: hotel/vendor email + WhatsApp only make sense when a
    // contact was actually resolved. This used to `return` early here
    // when there was no contact — which also skipped the admin alert
    // below. Admin must always be notified regardless of whether the
    // hotel/vendor has a contact on file, so that block moved outside
    // this `if` (see below, after this hotel/vendor section).
    if (contact?.email) {
      const emailNotification = await notificationRepo.createNotification({
        booking_id: input.bookingId,
        recipient_type: contact.type,
        recipient_email: contact.email,
        recipient_phone: null,
        channel: 'email',
        status: 'pending',
        error_message: null,
        read_at: null,
        sent_at: null,
      });

      const result = await sendEmail({
        to: contact.email,
        subject: `New booking — ${input.itemName}`,
        html: buildEmailHtml(input),
      });

      if (result.success) {
        await notificationRepo.markSent(emailNotification.id);
      } else {
        await notificationRepo.markFailed(emailNotification.id, result.error);
      }
    }

    // WhatsApp deferred (2026-08-27) — no provider chosen yet, both
    // AiSensy and Chat Mitra require a paid plan for API/template
    // sending, so this is gated on AISENSY_API_KEY actually being set.
    // Without this guard, every hotel booking with a phone number
    // would create a permanently-failed 'whatsapp' notification row
    // (no key configured) — noise with no value. Whichever provider
    // is picked later, set its key and this starts working; no other
    // code needs to change.
    if (contact?.phone && process.env.AISENSY_API_KEY) {
      const whatsappNotification = await notificationRepo.createNotification(
        {
          booking_id: input.bookingId,
          recipient_type: contact.type,
          recipient_email: null,
          recipient_phone: contact.phone,
          channel: 'whatsapp',
          status: 'pending',
          error_message: null,
          read_at: null,
          sent_at: null,
        }
      );

      const result = await sendWhatsApp({
        to: contact.phone,
        recipientName: contact.name,
        templateParams: [
          contact.name,
          input.guestName,
          input.bookingType === 'hotel'
            ? (input.checkInDate ?? 'N/A')
            : (input.travelDate ?? 'N/A'),
          input.bookingType === 'hotel' ? (input.checkOutDate ?? 'N/A') : 'N/A',
        ],
      });

      if (result.success) {
        await notificationRepo.markSent(whatsappNotification.id);
      } else {
        await notificationRepo.markFailed(
          whatsappNotification.id,
          result.error
        );
      }
    }

    // CONTACT-03: admin alert. Runs unconditionally — regardless of
    // whether a hotel/vendor contact was resolved above — so the
    // admin always knows a payment just came in, same as the
    // always-created 'dashboard' row above but for the admin
    // specifically. Reuses ADMIN_NOTIFICATION_EMAIL, the exact same
    // env var property-listing.actions.ts already uses for its own
    // admin alert (RULE 9 — no new env var invented).
    const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;

    await notificationRepo.createNotification({
      booking_id: input.bookingId,
      recipient_type: 'admin',
      recipient_email: adminEmail ?? null,
      recipient_phone: null,
      channel: 'dashboard',
      status: 'sent',
      error_message: adminEmail
        ? null
        : 'ADMIN_NOTIFICATION_EMAIL not configured — admin email alert skipped.',
      read_at: null,
      sent_at: new Date().toISOString(),
    });

    if (adminEmail) {
      const adminEmailNotification = await notificationRepo.createNotification({
        booking_id: input.bookingId,
        recipient_type: 'admin',
        recipient_email: adminEmail,
        recipient_phone: null,
        channel: 'email',
        status: 'pending',
        error_message: null,
        read_at: null,
        sent_at: null,
      });

      const result = await sendEmail({
        to: adminEmail,
        subject: `Payment confirmed — ${input.itemName} (${input.bookingNumber})`,
        html: buildAdminEmailHtml(input, contact),
      });

      if (result.success) {
        await notificationRepo.markSent(adminEmailNotification.id);
      } else {
        await notificationRepo.markFailed(adminEmailNotification.id, result.error);
      }
    } else {
      console.error(
        '[notifications] ADMIN_NOTIFICATION_EMAIL not configured — skipped admin alert for booking',
        input.bookingId
      );
    }
  } catch (error) {
    // Absolute last line of defense — dispatch must never throw into
    // createBooking(). Logged for diagnostics only.
    console.error('[notifications] dispatch failed', error);
  }
}

