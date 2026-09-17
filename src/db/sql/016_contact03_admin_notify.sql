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
-- 3. (Added after this migration first failed live) The live
--    `public.notifications` table did not actually match migration
--    009's schema — DATABASE_BIBLE.md's Migration Registry already
--    had 009 flagged "NOT CONFIRMED" for exactly this reason (RULE
--    35). Step 0 below repairs the live table idempotently before
--    attempting the recipient_type change.
--
-- Idempotent per RULE 33 — safe to re-run if production-run status is
-- ever uncertain (RULE 35).
-- Run this manually in the Supabase SQL editor.

-- 0. REPAIR STEP (added after this migration first failed live with
-- "column recipient_type does not exist"). DATABASE_BIBLE.md's
-- Migration Registry already flagged 009_contact01_notifications.sql
-- as "NOT CONFIRMED" in production (RULE 35) — this is that warning
-- turning out to be correct: the live `notifications` table exists
-- but does not match 009's schema (009's `create table if not
-- exists` is a no-op against an already-existing table, so it never
-- added the columns that table was missing).
--
-- This block brings the live table up to 009's full schema using
-- `add column if not exists` for every column (safe/idempotent — a
-- column that's already correct is left untouched, matching migration
-- 012's own pattern). recipient_type/channel/status are added
-- nullable here rather than NOT NULL like 009 originally specified,
-- specifically so this cannot fail if the table already has rows —
-- every code path that writes a notification already always supplies
-- all three (see dispatch.ts), so this is a safety margin, not a
-- relaxation anything currently depends on.
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.notifications
  add column if not exists recipient_type text,
  add column if not exists recipient_email text,
  add column if not exists recipient_phone text,
  add column if not exists channel text,
  add column if not exists status text default 'pending',
  add column if not exists error_message text,
  add column if not exists read_at timestamptz,
  add column if not exists sent_at timestamptz;

create index if not exists notifications_booking_id_idx
  on public.notifications(booking_id);

create index if not exists notifications_dashboard_unread_idx
  on public.notifications(channel, read_at)
  where channel = 'dashboard';

-- 1. Allow 'admin' as a notifications recipient_type. Drop-then-add so
-- this can be re-run safely if the constraint definition ever changes
-- again (same pattern as migration 012's guest-or-customer check).
alter table public.notifications
  drop constraint if exists notifications_recipient_type_check;

alter table public.notifications
  add constraint notifications_recipient_type_check
  check (recipient_type in ('hotel', 'vendor', 'admin'));

-- 1b. channel/status CHECK constraints from 009 — also (re)applied
-- here defensively, in case the live table was missing these too.
alter table public.notifications
  drop constraint if exists notifications_channel_check;

alter table public.notifications
  add constraint notifications_channel_check
  check (channel in ('email', 'whatsapp', 'dashboard'));

alter table public.notifications
  drop constraint if exists notifications_status_check;

alter table public.notifications
  add constraint notifications_status_check
  check (status in ('pending', 'sent', 'failed'));

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
