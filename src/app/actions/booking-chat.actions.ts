'use server';

// CHAT-01 — 3-way booking chat (customer / hotel / admin).
//
// This file is the ONLY place a message is ever written — the client
// never inserts into booking_messages directly (see migration
// 023_chat01_booking_messages.sql's header: no INSERT policy exists
// for authenticated/anon at all). That is what makes the masking
// below actually enforceable rather than advisory: there is no path
// to store an unmasked phone/email even if a modified client tried.
//
// Role resolution NEVER trusts a client-supplied role — sendBooking
// Message() re-derives it server-side from the booking's actual
// relationships every single call, identically to getBookingChatContext().
// A customer cannot post as 'hotel' by passing a different parameter.

import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { getAuthUser, resolvePublicUserId, getUserRoles } from '@/lib/auth/session';
import { BookingRepository } from '@/lib/repositories/booking.repository';
import { VendorRepository } from '@/lib/repositories/vendor.repository';
import {
  BookingMessageRepository,
  type BookingMessageRecord,
  type SenderRole,
} from '@/lib/repositories/booking-message.repository';
import { runAction, type ActionResult } from '@/lib/actions/action-result';

/* -------------------------------------------------------------------------- */
/* Role resolution — shared by both actions below                            */
/* -------------------------------------------------------------------------- */

// Admin is checked FIRST and wins even if an admin account happens to
// also be the booking's customer or the hotel's owner — deliberate:
// the chat's whole design (see this session's discussion) treats
// admin as an always-present third party, not a role that should ever
// be shadowed by a coincidental other relationship.
async function resolveSenderRole(
  supabase: Awaited<ReturnType<typeof createClient>>,
  bookingId: string,
  userRowId: string,
  roles: string[]
): Promise<SenderRole> {
  if (roles.includes('admin') || roles.includes('super_admin')) {
    return 'admin';
  }

  const bookingRepo = new BookingRepository(supabase);
  const booking = await bookingRepo.getBookingById(bookingId);

  if (!booking) {
    throw new Error('BOOKING_NOT_FOUND');
  }

  if (booking.customer_id === userRowId) {
    return 'customer';
  }

  if (booking.vendor_id) {
    const vendorRepo = new VendorRepository(supabase);
    const vendor = await vendorRepo.getVendorById(booking.vendor_id);
    if (vendor?.owner_user_id === userRowId) {
      return 'hotel';
    }
  }

  throw new Error('FORBIDDEN');
}

/* -------------------------------------------------------------------------- */
/* CHAT-MASK-01 — phone/email redaction                                      */
/* -------------------------------------------------------------------------- */

// Matches the project owner's explicit instruction: "automatically
// block/hide" contact info, not merely warn. Deliberately broad on
// the phone pattern (7+ digits, optionally spaced/dashed/plussed) —
// a false positive (redacting a legitimate long number that isn't a
// phone number, e.g. "room 2024001") is far less harmful here than a
// false negative that lets a real phone number through, given the
// entire point (DISINTERMEDIATION-01, earlier this session) is
// preventing hotel/customer from exchanging direct contact details.
const PHONE_PATTERN = /(\+?\d[\d\s\-]{6,}\d)/g;
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

function redactContactInfo(text: string): { text: string; wasRedacted: boolean } {
  let wasRedacted = false;

  const withoutEmail = text.replace(EMAIL_PATTERN, () => {
    wasRedacted = true;
    return '[hidden]';
  });

  const withoutPhone = withoutEmail.replace(PHONE_PATTERN, () => {
    wasRedacted = true;
    return '[hidden]';
  });

  return { text: withoutPhone, wasRedacted };
}

/* -------------------------------------------------------------------------- */
/* Public actions                                                            */
/* -------------------------------------------------------------------------- */

export interface BookingChatContext {
  role: SenderRole;
  bookingNumber: string;
  bookingType: 'hotel' | 'package';
  itemName: string;
  checkInDate: string | null;
  checkOutDate: string | null;
  travelDate: string | null;
  messages: BookingMessageRecord[];
}

export async function getBookingChatContext(
  bookingId: string
): Promise<ActionResult<BookingChatContext>> {
  return runAction(async () => {
    const authUser = await getAuthUser();
    if (!authUser) {
      throw new Error('UNAUTHENTICATED');
    }

    const supabase = await createClient();
    const userRowId = await resolvePublicUserId(supabase, authUser.id);
    const roles = await getUserRoles(userRowId);

    const role = await resolveSenderRole(supabase, bookingId, userRowId, roles);

    const bookingRepo = new BookingRepository(supabase);
    const booking = await bookingRepo.getBookingById(bookingId);
    if (!booking) {
      throw new Error('BOOKING_NOT_FOUND');
    }

    // itemName: this action doesn't have the webhook's already-loaded
    // hotel/package row, so it re-derives a display name the cheap
    // way rather than pulling in HotelRepository/PackageRepository
    // just for one string — acceptable here since the chat header
    // only needs a label, not full hotel data.
    let itemName = 'Your booking';
    if (booking.booking_type === 'hotel' && booking.hotel_id) {
      const { data } = await supabase
        .from('hotels')
        .select('hotel_name')
        .eq('id', booking.hotel_id)
        .maybeSingle();
      if (data?.hotel_name) itemName = data.hotel_name;
    } else if (booking.booking_type === 'package' && booking.package_id) {
      const { data } = await supabase
        .from('packages')
        .select('package_name')
        .eq('id', booking.package_id)
        .maybeSingle();
      if (data?.package_name) itemName = data.package_name;
    }

    // Reading messages here uses the SAME session-bound client (RLS-
    // scoped), not service-role — proving the RLS policy itself
    // grants this user access, the same policy Realtime will enforce
    // client-side once BookingChatThread subscribes. If this call
    // returns rows, the live subscription will too.
    const messageRepo = new BookingMessageRepository(supabase);
    const messages = await messageRepo.listForBooking(bookingId);

    return {
      role,
      bookingNumber: booking.booking_number,
      bookingType: booking.booking_type,
      itemName,
      checkInDate: booking.check_in_date,
      checkOutDate: booking.check_out_date,
      travelDate: booking.travel_date,
      messages,
    };
  });
}

export async function sendBookingMessage(
  bookingId: string,
  messageText: string
): Promise<ActionResult<BookingMessageRecord>> {
  return runAction(async () => {
    const trimmed = messageText.trim();
    if (!trimmed) {
      throw new Error('Message cannot be empty.');
    }
    if (trimmed.length > 2000) {
      throw new Error('Message is too long (2000 characters max).');
    }

    const authUser = await getAuthUser();
    if (!authUser) {
      throw new Error('UNAUTHENTICATED');
    }

    const supabase = await createClient();
    const userRowId = await resolvePublicUserId(supabase, authUser.id);
    const roles = await getUserRoles(userRowId);

    // Re-derived here too, independently of any earlier
    // getBookingChatContext() call in the same page load — never
    // trust a role the client claims for the write path.
    const role = await resolveSenderRole(supabase, bookingId, userRowId, roles);

    const { text: safeText, wasRedacted } = redactContactInfo(trimmed);

    const admin = createServiceRoleClient();
    const messageRepo = new BookingMessageRepository(admin);

    return messageRepo.createMessage({
      booking_id: bookingId,
      sender_role: role,
      sender_user_id: userRowId,
      message_text: safeText,
      was_redacted: wasRedacted,
    });
  });
}

