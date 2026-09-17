-- CONTACT-01 (Part 2): Booking notifications.
--
-- ⚠️ SUPERSEDED IN PRODUCTION (2026-09-18, CONTACT-03 session) — DO
-- NOT RUN THIS FILE AS-IS. This project's live database already has
-- an unrelated, pre-existing public.notifications table (a generic
-- per-user notification feed — user_id/notif_type/title/message/
-- metadata jsonb — created by something outside this codebase, not
-- referenced by any code here). Running this file would collide with
-- that table. The actual table this codebase uses now is
-- public.booking_notifications, created by
-- src/db/sql/016_contact03_admin_notify.sql instead — see that file's
-- REVISION HISTORY comment for the full story. This file is kept only
-- as a historical record of the originally-intended (never
-- successfully applied) schema.
--
-- One row per notification attempt (not per booking) so an email
-- failure and a WhatsApp failure on the same booking are tracked and
-- retried independently, and the admin dashboard can list unread
-- alerts without joining across channels.
--
-- Run this manually in the Supabase SQL editor.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),

  booking_id uuid not null
    references public.bookings(id)
    on delete cascade,

  -- Which recipient this attempt was resolved to, and how. Kept even
  -- for the 'dashboard' channel so an admin viewing the alert can see
  -- who would have been contacted.
  recipient_type text not null
    check (recipient_type in ('hotel', 'vendor')),
  recipient_email text,
  recipient_phone text,

  channel text not null
    check (channel in ('email', 'whatsapp', 'dashboard')),

  status text not null default 'pending'
    check (status in ('pending', 'sent', 'failed')),

  error_message text,

  -- Dashboard-channel rows are "read" once an admin views them.
  -- Always null for email/whatsapp rows.
  read_at timestamptz,

  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index if not exists notifications_booking_id_idx
  on public.notifications(booking_id);

create index if not exists notifications_dashboard_unread_idx
  on public.notifications(channel, read_at)
  where channel = 'dashboard';

