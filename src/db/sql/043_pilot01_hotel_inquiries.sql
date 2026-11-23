-- ROOT PATH: src/db/sql/043_pilot01_hotel_inquiries.sql
-- PILOT-01 — no-login enquiry form on hotel pages (ad landing leads).
-- Run in the Supabase SQL editor. Idempotent.
--
-- Security (same convention as help_tickets / refunds):
--   * RLS ON, NO policies: anon and signed-in browser users can neither read
--     nor write this table. Every insert goes through the server action
--     (src/app/actions/inquiry.actions.ts) which uses the service role AFTER
--     validating input, Turnstile and rate limits.
--   * Personal data (name, phone) is only readable by staff via the Supabase
--     dashboard / service role.

create table if not exists public.hotel_inquiries (
  id             uuid primary key default gen_random_uuid(),
  hotel_id       uuid not null references public.hotels(id) on delete cascade,
  hotel_name     text not null,
  customer_name  text not null check (char_length(customer_name) between 2 and 80),
  phone          text not null check (phone ~ '^[6-9][0-9]{9}$'),
  check_in       date,
  check_out      date,
  guests         integer check (guests between 1 and 30),
  room_type_id   uuid,
  message        text check (message is null or char_length(message) <= 500),
  source         text check (source is null or char_length(source) <= 60),
  status         text not null default 'new'
                   check (status in ('new','contacted','advance_paid','booked','lost')),
  email_sent     boolean not null default false,
  created_at     timestamptz not null default now(),
  constraint hotel_inquiries_dates_ok
    check (check_in is null or check_out is null or check_out > check_in)
);

create index if not exists hotel_inquiries_created_idx
  on public.hotel_inquiries (created_at desc);
create index if not exists hotel_inquiries_hotel_idx
  on public.hotel_inquiries (hotel_id, created_at desc);

alter table public.hotel_inquiries enable row level security;
-- Intentionally no policies.
