-- =============================================================================
-- 044_ayodhya01_sitaram_seva_seed.sql   (run AFTER 043, in Supabase SQL Editor)
--
-- Ayodhya launch seed for Shri Sitaram Seva Trust (Luvkush Nagar, Ramghat):
--   A) SEO description on the hotel row (source for hotel metadata +
--      OpenGraph on /hotels/shri-sitaram-seva-trust)
--   B) five pilgrim-friendly room categories in hotel_rooms (uses only the
--      LIVE room_type CHECK values: single|double|twin|suite|deluxe|
--      executive|family — see ROOM_TYPE_VALUES in room-type.repository.ts)
--   C) 180 days of availability per room via 043's
--      upsert_room_inventory_range() (skipped with a notice if 043 not run)
--   D) the /destinations/ayodhya-ram-mandir row — sitemap.ts picks up new
--      destination rows automatically, no code change needed
--
-- [CONFIRM] marks values the owner must confirm (room counts, 3/4/5-bed
-- prices, destination status value). Idempotent: re-running is safe.
-- =============================================================================

do $$
declare
  v_hotel_id  uuid;
  r           record;
  v_total     int;
begin
  -- locate hotel by canonical OR legacy slug (hotel.actions.ts fixed slug
  -- canonicalization after some rows were saved with raw spaces)
  select id into v_hotel_id
  from public.hotels
  where replace(lower(trim(slug)), ' ', '-') = 'shri-sitaram-seva-trust'
    and deleted_at is null
  order by updated_at desc
  limit 1;

  if v_hotel_id is null then
    raise exception 'hotels row for shr sitaram seva trust not found (slug variants: shr sitaram seva trust / shri sitaram seva trust)';
  end if;

  -- (A) SEO description — only fills/repairs weak descriptions so an
  --     owner-written description is never silently overwritten.
  update public.hotels
  set description = 'Shri Sitaram Seva Trust, Luvkush Nagar - clean double to '
                    || '5-bed family rooms from INR 999, minutes from Ramghat '
                    || 'and Ram Mandir. Verified stay, no hidden fees.',
      updated_at  = now()
  where id = v_hotel_id
    and (description is null or length(trim(description)) < 60);

  -- (B) room categories ------------------------------------------------------
  with specs(name, rtype, price, adults, children, maxocc, bed, total) as (values
    ('Standard Double Bedroom',  'double', 999,  2, 0, 2, '1 Double Bed',          6),
    ('Sweet Room (Premium Double Bed)', 'suite', 1199, 2, 1, 3, '1 Premium Double Bed', 4),
    ('3-Bed Family Room',        'family', 1499, 3, 1, 4, '3 Beds (combination)',  4),
    ('4-Bed Family Room',        'family', 1799, 4, 1, 5, '4 Beds (combination)',  3),
    ('5-Bed Family Room',        'family', 1999, 5, 1, 6, '5 Beds (combination)',  2)
    -- [CONFIRM] 1499/1799/1999 + room counts 6/4/4/3/2 are operational
    -- placeholders; owner se confirm karke UPDATE block (end) chalayein.
  ),
  inserted as (
    insert into public.hotel_rooms
      (hotel_id, room_name, room_type, base_price, capacity_adults,
       capacity_children, max_occupancy, bed_type, status)
    select v_hotel_id, s.name, s.rtype, s.price, s.adults,
           s.children, s.maxocc, s.bed, 'active'
    from specs s
    where not exists (
      select 1 from public.hotel_rooms hr
      where hr.hotel_id = v_hotel_id and lower(hr.room_name) = lower(s.name)
    )
    returning id, room_name
  )
  select count(*) from inserted;
  get diagnostics v_total = row_count;
  raise notice 'rooms inserted: %', v_total;

  -- (C) 180-day availability seed for the five categories --------------------
  if to_regprocedure('public.upsert_room_inventory_range(uuid,date,date,int,int,uuid)') is null then
    raise notice 'SKIPPED inventory seed - run 043_golive16 first';
  else
    for r in
      select hr.id, hr.room_name from public.hotel_rooms hr
      where hr.hotel_id = v_hotel_id
    loop
      v_total := case r.room_name
        when 'Standard Double Bedroom' then 6
        when 'Sweet Room (Premium Double Bed)' then 4
        when '3-Bed Family Room' then 4
        when '4-Bed Family Room' then 3
        when '5-Bed Family Room' then 2
        else 1                       -- [CONFIRM] any other room type
      end;
      perform public.upsert_room_inventory_range(
        r.id, current_date, current_date + 179, v_total, 0, null
      );
      raise notice 'seeded 180 days for: % (total %)', r.room_name, v_total;
    end loop;
  end if;
end $$;

-- (D) Ayodhya destination row + hub-page SEO copy -----------------------------
do $$
begin
  if exists (select 1 from public.destinations where slug = 'ayodhya-ram-mandir') then
    update public.destinations
    set name        = 'Ayodhya',
        state       = 'Uttar Pradesh',
        description = 'Darshan guide for Ayodhya - Ram Mandir timings, Ramghat '
                      || 'aarti, places to visit and verified stays from INR 999. '
                      || 'Plan and book on Chalfirr.',
        is_featured = true
    where slug = 'ayodhya-ram-mandir';
    raise notice 'destination ayodhya-ram-mandir updated';
  else
    insert into public.destinations
      (name, slug, state, description, is_featured, status)
    values
      ('Ayodhya', 'ayodhya-ram-mandir', 'Uttar Pradesh',
       'Darshan guide for Ayodhya - Ram Mandir timings, Ramghat aarti, places '
       || 'to visit and verified stays from INR 999. Plan and book on Chalfirr.',
       true, 'active');
    raise notice 'destination ayodhya-ram-mandir created';
  end if;
exception when undefined_column then
  raise notice 'destinations row not written - check column list (status/is_featured)';
end $$;

-- NOTE (design): destination photos live in destination_images and must be
-- uploaded from Admin > Destinations > Images — this row intentionally ships
-- photo-less so public pages fall back to the gradient (withImages fallback).

-- =============================================================================
-- [CONFIRM] follow-ups after owner sign-off:
--
--   -- adjust 3/4/5-bed prices
--   update public.hotel_rooms set base_price = 1499
--   where hotel_id = (select id from hotels where slug = 'shri-sitaram-seva-trust')
--     and room_name = '3-Bed Family Room';
--
--   -- adjust stock, then re-seed the calendar
--   select public.upsert_room_inventory_range(
--     '<room uuid>'::uuid, current_date, current_date + 179, <actual rooms>, 0, null);
--
--   -- check what landed
--   select room_name, room_type, base_price, max_occupancy from hotel_rooms
--   where hotel_id = (select id from hotels where slug = 'shri-sitaram-seva-trust');
--   select count(*) from room_inventory ri join hotel_rooms hr on hr.id = ri.room_id
--   where hr.hotel_id = (select id from hotels where slug = 'shri-sitaram-seva-trust');
-- =============================================================================