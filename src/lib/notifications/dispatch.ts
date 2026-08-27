import { SupabaseClientType } from '@/lib/repositories/types';
import { NotificationRepository } from '@/lib/repositories/notification.repository';
import { VendorRepository } from '@/lib/repositories/vendor.repository';
import { HotelRecord } from '@/lib/repositories/hotel.repository';
import { sendEmail } from './email.client';
import { sendWhatsApp } from './whatsapp.client';

// CONTACT-01 Part 2: fires when a hotel booking is created. Never
// throws — a notification failure (missing API key, network error,
// bad contact data) must never break the booking itself. Every
// channel is attempted and recorded independently, matching the
// "never invalidate a booking" caution already used elsewhere in
// this codebase (see ROOM-04's deleteInventoryForDate guard).

export interface NotifyBookingCreatedInput {
  bookingId: string;
  hotel: HotelRecord;
  guestName: string;
  checkInDate: string | null;
  checkOutDate: string | null;
}

interface ResolvedContact {
  type: 'hotel' | 'vendor';
  email: string | null;
  phone: string | null;
  name: string;
}

// Hotel's own phone/email/vendor_id take priority (CONTACT-01 Part 1).
// Falls back to the linked vendor's business_email/business_phone
// (VENDOR-01) only when the hotel has none of its own. Returns null
// when neither source has a usable contact — the dashboard alert is
// still created either way so the booking is never silently unnoticed.
async function resolveContact(
  supabase: SupabaseClientType,
  hotel: HotelRecord
): Promise<ResolvedContact | null> {
  if (hotel.phone || hotel.email) {
    return {
      type: 'hotel',
      email: hotel.email,
      phone: hotel.phone,
      name: hotel.hotel_name,
    };
  }

  if (hotel.vendor_id) {
    const vendorRepo = new VendorRepository(supabase);
    const vendor = await vendorRepo.getVendorById(hotel.vendor_id);

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
    input.checkInDate && input.checkOutDate
      ? `${input.checkInDate} to ${input.checkOutDate}`
      : 'Dates not specified';

  return `
    <p>New booking received for <strong>${input.hotel.hotel_name}</strong>.</p>
    <p>Guest: ${input.guestName}</p>
    <p>Dates: ${dates}</p>
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
    const contact = await resolveContact(supabase, input.hotel);

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
        subject: `New booking — ${input.hotel.hotel_name}`,
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
          input.checkInDate ?? 'N/A',
          input.checkOutDate ?? 'N/A',
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

