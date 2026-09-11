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
  bookingType: 'hotel' | 'package';
  itemName: string;
  vendorId: string | null;
  itemContact?: {
    phone: string | null;
    email: string | null;
  } | null;
  guestName: string;
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

  return `
    <p>New booking received for <strong>${input.itemName}</strong>.</p>
    <p>Guest: ${input.guestName}</p>
    <p>${input.bookingType === 'hotel' ? 'Dates' : 'Travel date'}: ${dates}</p>
    <p>Booking ID: ${input.bookingId}</p>
    <p>View it in the admin panel for full details.</p>
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

    if (!contact) {
      return;
    }

    if (contact.email) {
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
    if (contact.phone && process.env.AISENSY_API_KEY) {
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
  } catch (error) {
    // Absolute last line of defense — dispatch must never throw into
    // createBooking(). Logged for diagnostics only.
    console.error('[notifications] dispatch failed', error);
  }
}

