-- SafarBuddy — ROOM-05
-- Adds the booking -> room linkage that ROOM-05 needs to do server-side
-- availability validation and inventory consumption, and adds a single
-- atomic function that confirms a booking + consumes ROOM-04 inventory
-- together in one transaction (so a duplicate/concurrent webhook can
-- never double-book a room).
--
-- Purely additive. Does not touch ROOM-04's room_inventory table shape,
-- does not touch hotels/packages/users, and does not rewrite any
-- existing bookings row. Run this once against the Supabase project's
-- SQL editor, same as 003/004/006/007 were run.
--
-- WHY THIS IS NEEDED (see ROOM-05 audit report):
-- `bookings` currently has no reference to a specific room/room type at
-- all — hotel_id/check_in_date/etc. are stored as JSON inside the
-- `notes` text column (see BookingRepository.createBooking), and
-- nothing in the codebase ever calls RoomInventoryRepository from the
-- booking flow or writes room_inventory.booked_rooms. Without a real,
-- indexed, FK'd column here, there is no way to do a database-level
-- availability check or prevent two bookings from over-consuming the
-- same room on the same date — which Phase H of the ROOM-05 brief
-- explicitly requires ("Database/server-side protection is required").

-- ---------------------------------------------------------------------------
-- 1. bookings.room_id — real column, FK to hotel_rooms (same parent table
--    room_inventory.room_id and room_prices.room_id already reference).
-- ---------------------------------------------------------------------------

alter table public.bookings
  add column if not exists room_id uuid references public.hotel_rooms(id);

create index if not exists bookings_room_id_idx
  on public.bookings(room_id);

-- ---------------------------------------------------------------------------
-- 2. consume_room_inventory_for_booking(p_booking_id)
--
-- Called once, from the Cashfree webhook, after payment has been verified
-- as SUCCESS server-side. Runs as a single Postgres function body, which
-- Postgres executes atomically — either everything below commits, or (on
-- the RAISE EXCEPTION path) nothing does, including the FOR UPDATE row
-- locks and the booking_status write.
--
-- Idempotency: if the booking is not currently 'pending' (i.e. this is a
-- duplicate webhook delivery that already confirmed it, or it was already
-- cancelled), the function returns immediately without touching
-- room_inventory again.
--
-- Concurrency safety: the booking row is locked with SELECT ... FOR UPDATE
-- first, so two webhook deliveries for the same booking arriving at the
-- same instant serialize on that lock — the second one sees
-- booking_status <> 'pending' after the first commits, and no-ops. Each
-- room_inventory row touched is also locked with FOR UPDATE before the
-- availability check, so two different bookings racing for the last
-- available room on the same date cannot both succeed.
--
-- Failure behavior: if any night in the stay has no available inventory,
-- the whole function raises and rolls back — booking_status stays
-- 'pending' even though the payment itself was already marked 'success'
-- by the webhook just before this call. That mismatch is intentional: it
-- surfaces as a payment-succeeded-but-booking-still-pending row in the
-- admin view, which needs a human (refund/manual room assignment) rather
-- than silently overbooking the room or silently losing the payment.
-- ---------------------------------------------------------------------------

create or replace function public.consume_room_inventory_for_booking(
  p_booking_id uuid
)
returns void
language plpgsql
as $$
declare
  v_booking record;
  v_date date;
  v_inv record;
begin
  select id, room_id, booking_status, travel_start_date, travel_end_date
    into v_booking
    from public.bookings
   where id = p_booking_id
   for update;

  if not found then
    raise exception 'Booking % not found', p_booking_id;
  end if;

  if v_booking.booking_status <> 'pending' then
    -- Already confirmed (or cancelled) by a prior call. No-op —
    -- this is what makes duplicate webhook delivery safe.
    return;
  end if;

  if v_booking.room_id is not null
     and v_booking.travel_start_date is not null
     and v_booking.travel_end_date is not null then

    v_date := v_booking.travel_start_date;

    while v_date < v_booking.travel_end_date loop
      select id, available_rooms
        into v_inv
        from public.room_inventory
       where room_id = v_booking.room_id
         and inventory_date = v_date
         and deleted_at is null
       for update;

      if not found or v_inv.available_rooms < 1 then
        raise exception
          'Room % has no available inventory on %', v_booking.room_id, v_date;
      end if;

      update public.room_inventory
         set booked_rooms = booked_rooms + 1,
             available_rooms = available_rooms - 1,
             updated_at = now()
       where id = v_inv.id;

      v_date := v_date + interval '1 day';
    end loop;
  end if;

  update public.bookings
     set booking_status = 'confirmed',
         payment_status = 'paid',
         updated_at = now()
   where id = p_booking_id;
end;
$$;
