-- SafarBuddy — CONTACT-03
-- Extends CONTACT-01/CONTACT-02's notification system so the admin
-- also gets alerted (not just the hotel/vendor) the moment a payment
-- is confirmed, and documents that the booking-contact columns are
-- now captured for EVERY booking (not only guest checkout).
--
-- Root cause this fixes:
-- 1. notifications.recipient_type only allowed ('hotel','vendor') —
--    there was no way to record/send an admin-channel notification at
--    all, even though src/lib/notifications/dispatch.ts is being
--    extended (same session) to email ADMIN_NOTIFICATION_EMAIL.
-- 2. bookings.guest_name/guest_email/guest_phone were documented as
--    "guest checkout only" (migration 012), but as of this session the
--    booking form now always collects name+phone (see
--    booking.actions.ts / BookingForm.tsx), so the comment was
--    actively misleading. Comment-only change, no behavior change to
--    the columns themselves (they were already nullable and already
--    writable regardless of customer_id — see the
--    bookings_customer_or_guest_check constraint in migration 012,
--    which this migration does not touch).
--
-- Idempotent per RULE 33 — safe to re-run if production-run status is
-- ever uncertain (RULE 35).
-- Run this manually in the Supabase SQL editor.

-- 1. Allow 'admin' as a notifications recipient_type. Drop-then-add so
-- this can be re-run safely if the constraint definition ever changes
-- again (same pattern as migration 012's guest-or-customer check).
alter table public.notifications
  drop constraint if exists notifications_recipient_type_check;

alter table public.notifications
  add constraint notifications_recipient_type_check
  check (recipient_type in ('hotel', 'vendor', 'admin'));

-- 2. Comment update only — reflects that these columns are now
-- populated for every booking (logged-in or guest), captured at
-- booking time as the point of contact for that specific booking,
-- not just for guest checkout.
comment on column public.bookings.guest_name is
  'BOOKING-03/CONTACT-03: booking-time contact name, captured for every booking (guest or signed-in). May differ from the signed-in user''s profile name.';
comment on column public.bookings.guest_email is
  'BOOKING-03/CONTACT-03: required for guest checkout; optional (may be null) for a signed-in booking, which already has an email on public.users.';
comment on column public.bookings.guest_phone is
  'BOOKING-03/CONTACT-03: booking-time contact phone, captured for every booking (guest or signed-in). May differ from the signed-in user''s profile phone.';

