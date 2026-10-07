-- 032_golive04_room_reservation.sql
-- GOLIVE-04 — Inventory reservation (fixes overbooking).  RULE 32/33/34/35.
--
-- BEFORE RUNNING (RULE 7/13): confirm the live columns with
--   select column_name, data_type from information_schema.columns
--    where table_schema='public' and table_name in ('room_inventory','bookings')
--    order by table_name, ordinal_position;
-- Expected room_inventory: id, room_id, inventory_date, total_rooms, available_rooms,
--   blocked_rooms, booked_rooms, created_at, updated_at, created_by, updated_by, deleted_at.
-- Expected bookings (used here): id, room_id, booking_type, travel_start_date,
--   travel_end_date, deleted_at.
-- Invariant kept: available_rooms = total_rooms - blocked_rooms - booked_rooms.
--
-- Behaviour decisions (documented, RULE 12):
--  * A night with NO room_inventory row  -> NO_INVENTORY  (blocked, not "unlimited").
--  * A night with available_rooms < qty   -> SOLD_OUT.
--  * One room per booking (bookings has no room-count column), so qty = 1.
--  * Check-out night is NOT reserved (range is check_in .. check_out - 1).
--  * Not destructive. Fully idempotent (create or replace / if not exists).

-- 1. Flag so a booking's hold can be released exactly once (cancel + expiry + retries).
alter table public.bookings
  add column if not exists room_inventory_held boolean not null default false;

-- 2. Never allow negative availability. NOT VALID = enforced for new writes only,
--    so existing rows cannot make this migration fail. Run the VALIDATE line later
--    once `select count(*) from room_inventory where available_rooms < 0` is 0.
do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'room_inventory_available_nonneg'
       and conrelid = 'public.room_inventory'::regclass
  ) then
    alter table public.room_inventory
      add constraint room_inventory_available_nonneg
      check (available_rooms >= 0) not valid;
  end if;
end $$;
-- alter table public.room_inventory validate constraint room_inventory_available_nonneg;

-- 3. Primitive: reserve p_qty rooms for every night in [p_in, p_out). All-or-nothing.
--    Nights are processed in date order so two concurrent overlapping bookings lock
--    rows in the same order (no deadlock). The UPDATE takes the row lock, so a second
--    caller waits and then re-checks available_rooms.
create or replace function public.reserve_room(
  p_room uuid, p_in date, p_out date, p_qty int default 1
) returns void
language plpgsql security definer set search_path = public as $$
declare d date;
begin
  if p_qty is null or p_qty < 1 then raise exception 'INVALID_QTY'; end if;
  if p_in is null or p_out is null or p_out <= p_in then raise exception 'INVALID_RANGE'; end if;

  for d in
    select g::date from generate_series(p_in::timestamp, (p_out - 1)::timestamp, interval '1 day') g order by 1
  loop
    update room_inventory
       set booked_rooms    = booked_rooms + p_qty,
           available_rooms = available_rooms - p_qty,
           updated_at      = now()
     where room_id = p_room
       and inventory_date = d
       and deleted_at is null
       and available_rooms >= p_qty;

    if not found then
      if exists (select 1 from room_inventory
                  where room_id = p_room and inventory_date = d and deleted_at is null) then
        raise exception 'SOLD_OUT';
      else
        raise exception 'NO_INVENTORY';
      end if;
    end if;
  end loop;
end $$;

-- 4. Mirror: give rooms back. Clamped so a repeated/odd call can never push
--    booked_rooms below 0 or available_rooms above total - blocked. Missing rows skipped.
create or replace function public.release_room(
  p_room uuid, p_in date, p_out date, p_qty int default 1
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_qty is null or p_qty < 1 then raise exception 'INVALID_QTY'; end if;
  if p_in is null or p_out is null or p_out <= p_in then raise exception 'INVALID_RANGE'; end if;

  update room_inventory ri
     set booked_rooms    = greatest(ri.booked_rooms - p_qty, 0),
         available_rooms = least(ri.available_rooms + p_qty,
                                 greatest(ri.total_rooms - ri.blocked_rooms, 0)),
         updated_at      = now()
   where ri.room_id = p_room
     and ri.inventory_date >= p_in
     and ri.inventory_date <  p_out
     and ri.deleted_at is null;
end $$;

-- 5. Booking-level wrappers: reserve/release AND flip the flag in ONE transaction,
--    so the flag and the counters can never disagree. Both are idempotent.
create or replace function public.hold_room_for_booking(p_booking uuid)
returns boolean
language plpgsql security definer set search_path = public as $$
declare b record;
begin
  select id, booking_type, room_id, travel_start_date, travel_end_date, room_inventory_held
    into b from bookings where id = p_booking and deleted_at is null for update;
  if not found then raise exception 'BOOKING_NOT_FOUND'; end if;

  if b.booking_type is distinct from 'hotel' or b.room_id is null
     or b.travel_start_date is null or b.travel_end_date is null then
    return false;                       -- nothing to hold (package / hotel-level booking)
  end if;
  if b.room_inventory_held then return true; end if;   -- already held

  perform reserve_room(b.room_id, b.travel_start_date::date, b.travel_end_date::date, 1);
  update bookings set room_inventory_held = true where id = p_booking;
  return true;
end $$;

create or replace function public.release_booking_room(p_booking uuid)
returns boolean
language plpgsql security definer set search_path = public as $$
declare b record;
begin
  select id, room_id, travel_start_date, travel_end_date, room_inventory_held
    into b from bookings where id = p_booking for update;
  if not found or not b.room_inventory_held then return false; end if;

  perform release_room(b.room_id, b.travel_start_date::date, b.travel_end_date::date, 1);
  update bookings set room_inventory_held = false where id = p_booking;
  return true;
end $$;

-- 6. Service-role only (RULE 24). Never callable from the browser.
revoke execute on function public.reserve_room(uuid, date, date, int)       from public, anon, authenticated;
revoke execute on function public.release_room(uuid, date, date, int)       from public, anon, authenticated;
revoke execute on function public.hold_room_for_booking(uuid)               from public, anon, authenticated;
revoke execute on function public.release_booking_room(uuid)                from public, anon, authenticated;
grant  execute on function public.reserve_room(uuid, date, date, int)       to service_role;
grant  execute on function public.release_room(uuid, date, date, int)       to service_role;
grant  execute on function public.hold_room_for_booking(uuid)               to service_role;
grant  execute on function public.release_booking_room(uuid)                to service_role;
