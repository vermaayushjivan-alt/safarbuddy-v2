-- CONTACT-01 (Part 2): Booking notifications.
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

