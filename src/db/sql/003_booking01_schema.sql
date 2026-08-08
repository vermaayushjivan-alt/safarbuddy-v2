-- SafarBuddy — BOOKING-01
-- Creates the `bookings` table approved for BOOKING-01 (hotel + package
-- bookings, authenticated customers only, no payment, no inventory).
-- Purely additive: does not modify hotels, packages, users, or any other
-- existing table.
--
-- Run this once against the Supabase project's SQL editor (or via
-- `supabase db execute`), same as 001_auth_sync_trigger.sql and
-- 002_role_seed_auth05.sql were run.

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references public.users(id) on delete cascade,

  booking_type varchar(20) not null,

  hotel_id uuid references public.hotels(id),
  package_id uuid references public.packages(id),

  check_in_date date,
  check_out_date date,
  travel_date date,

  num_guests integer not null default 1,

  price_snapshot numeric(10, 2) not null,
  currency varchar(3) not null default 'INR',

  status varchar(20) not null default 'pending',

  cancellation_reason text,
  cancelled_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid,
  updated_by uuid,

  constraint bookings_booking_type_check
    check (booking_type in ('hotel', 'package')),

  constraint bookings_status_check
    check (status in ('pending', 'confirmed', 'cancelled', 'completed')),

  constraint bookings_num_guests_check
    check (num_guests > 0),

  -- Exactly one of hotel_id / package_id must be populated, and it must
  -- match booking_type. This is the DB-level enforcement of the
  -- BOOKING-01 approved rule; the Server Action layer validates the same
  -- rule again before insert so a bad request never reaches this
  -- constraint in normal operation.
  constraint bookings_hotel_xor_package_check
    check (
      (booking_type = 'hotel' and hotel_id is not null and package_id is null)
      or
      (booking_type = 'package' and package_id is not null and hotel_id is null)
    )
);

create index if not exists bookings_user_id_idx on public.bookings(user_id);
create index if not exists bookings_hotel_id_idx on public.bookings(hotel_id);
create index if not exists bookings_package_id_idx on public.bookings(package_id);
create index if not exists bookings_status_idx on public.bookings(status);
