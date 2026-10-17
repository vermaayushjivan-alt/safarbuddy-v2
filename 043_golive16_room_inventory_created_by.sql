-- =============================================================================
-- 043_golive16_room_inventory_created_by.sql   (run in Supabase SQL Editor)
--
-- ISSUE (owner report, Task 1):
--   saving availability fails with:
--   "insert or update on table 'room_inventory' violates foreign key
--    constraint 'room_inventory_created_by_fkey'"
--   The hard FK on created_by blocks admin/vendor sessions whenever the
--   actor's id has no row in the referenced table (service-role seeding,
--   deleted auth user, or a missing public.users sync row — see
--   001_auth_sync_trigger).
--
-- FIX POLICY:
--   created_by / updated_by become SOFT audit columns: nullable + indexed.
--   This matches how the app already treats them —
--   RoomInventoryRepository.setInventoryForDate writes `actorId || null`
--   (see src/lib/repositories/room-inventory.repository.ts). The hard FK is
--   dropped and deliberately NOT re-added: RLS plus the server-only writes
--   from 038_golive08_server_only_inserts.sql already gate who can write.
--
-- COLUMNS (confirmed live — repo docs + RoomInventoryRow):
--   id, room_id, inventory_date, total_rooms, available_rooms, blocked_rooms,
--   booked_rooms, created_at, updated_at, created_by, updated_by, deleted_at
--
-- Idempotent: safe to re-run. Run sections 1->4 in order; 5 verifies.
-- =============================================================================

-- 1) DIAGNOSTICS ---------------------------------------------------------------
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'room_inventory'
order by ordinal_position;

select c.conname, pg_get_constraintdef(c.oid) as definition
from pg_constraint c
where c.conrelid = 'public.room_inventory'::regclass and c.contype = 'f';

select count(*) as orphan_created_by
from public.room_inventory ri
where ri.created_by is not null
  and not exists (select 1 from auth.users u where u.id = ri.created_by);

-- 2) DROP THE BROKEN FK --------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_constraint
             where conname = 'room_inventory_created_by_fkey'
               and conrelid = 'public.room_inventory'::regclass) then
    execute 'alter table public.room_inventory drop constraint room_inventory_created_by_fkey';
    raise notice 'DROPPED room_inventory_created_by_fkey';
  else
    raise notice 'room_inventory_created_by_fkey already absent';
  end if;

  -- defensive: any other FK that hard-references created_by on this table
  for c in select con.conname from pg_constraint con
           where con.conrelid = 'public.room_inventory'::regclass
             and con.contype = 'f'
             and con.conname <> 'room_inventory_room_id_fkey'
             and pg_get_constraintdef(con.oid) like '%created_by%' loop
    execute format('alter table public.room_inventory drop constraint %I', c.conname);
    raise notice 'DROPPED %', c.conname;
  end loop;
end $$;

-- 3) SOFT AUDIT COLUMNS --------------------------------------------------------
alter table public.room_inventory alter column created_by drop not null;
alter table public.room_inventory alter column updated_by drop not null;
create index if not exists room_inventory_created_by_idx
  on public.room_inventory (created_by);

-- clear rows whose created_by points at a user that no longer exists
do $$
declare n bigint;
begin
  update public.room_inventory ri set created_by = null
  where ri.created_by is not null
    and not exists (select 1 from public.users u where u.id = ri.created_by);
  get diagnostics n = row_count;
  raise notice 'orphans cleared vs public.users: %', n;
exception when undefined_table then
  raise notice 'public.users missing — skip that pass';
end $$;

do $$
declare n bigint;
begin
  update public.room_inventory ri set created_by = null
  where ri.created_by is not null
    and not exists (select 1 from auth.users u where u.id = ri.created_by);
  get diagnostics n = row_count;
  raise notice 'orphans cleared vs auth.users: %', n;
exception when insufficient_privilege then
  raise notice 'cannot read auth.users as this role — run as postgres';
end $$;

-- 4) ONE LIVE ROW PER (room, date) + RANGE SEED RPC ----------------------------
-- 4a. soft-delete duplicate slots, keeping the row with the most booked_rooms
--     (never lose booking truth), then the most recently updated.
with ranked as (
  select id,
         row_number() over (
           partition by room_id, inventory_date
           order by booked_rooms desc, updated_at desc, created_at desc, id desc
         ) as rn
  from public.room_inventory
  where deleted_at is null
)
update public.room_inventory ri
set deleted_at = now()
from ranked r
where ri.id = r.id and r.rn > 1;

-- 4b. enforce the slot uniqueness the RPC below relies on (matches the
--     repository's (room_id, inventory_date) read shape)
create unique index if not exists uq_room_inventory_slot
  on public.room_inventory (room_id, inventory_date)
  where deleted_at is null;

create index if not exists idx_room_inventory_lookup
  on public.room_inventory (room_id, inventory_date)
  where deleted_at is null;

-- 4c. date-range availability insertion, next.js/supabase-compatible:
--     SELECT public.upsert_room_inventory_range(:roomId, :from, :to, :total, 0, :actor)
--     * never shrinks below existing booked_rooms (raises instead)
--     * available_rooms derived: greatest(total - blocked - booked, 0)
create or replace function public.upsert_room_inventory_range(
  p_room_id   uuid,
  p_from      date,
  p_to        date,
  p_total     int,
  p_blocked   int default 0,
  p_actor     uuid default null
) returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  n       int := 0;
  d       date;
  v_booked int;
begin
  if p_to < p_from then
    raise exception 'p_to (%) is before p_from (%)', p_to, p_from;
  end if;

  for d in select generate_series(p_from, p_to, interval '1 day')::date loop
    select coalesce(ri.booked_rooms, 0) into v_booked
    from public.room_inventory ri
    where ri.room_id = p_room_id
      and ri.inventory_date = d
      and ri.deleted_at is null;

    if not found then v_booked := 0; end if;

    if p_total < v_booked + p_blocked then
      raise exception 'total_rooms(%) cannot be below booked(%) + blocked(%) on %',
        p_total, v_booked, p_blocked, d;
    end if;

    insert into public.room_inventory
      (room_id, inventory_date, total_rooms, blocked_rooms,
       available_rooms, booked_rooms, created_by, updated_by)
    values
      (p_room_id, d, p_total, p_blocked,
       p_total - v_booked - p_blocked, v_booked, p_actor, p_actor)
    on conflict (room_id, inventory_date) where deleted_at is null
    do update
      set total_rooms     = excluded.total_rooms,
          blocked_rooms   = excluded.blocked_rooms,
          available_rooms = excluded.available_rooms,
          booked_rooms    = greatest(room_inventory.booked_rooms, excluded.booked_rooms),
          updated_at      = now(),
          updated_by      = excluded.updated_by;

    n := n + 1;
  end loop;

  return n;
end;
$$;

revoke all on function public.upsert_room_inventory_range(uuid, date, date, int, int, uuid) from public;
revoke all on function public.upsert_room_inventory_range(uuid, date, date, int, int, uuid) from anon;
grant execute on function public.upsert_room_inventory_range(uuid, date, date, int, int, uuid)
  to authenticated, service_role;

-- 5) VERIFY (expect: no created_by FK left, index present) ---------------------
select conname
from pg_constraint
where conrelid = 'public.room_inventory'::regclass and contype in ('f', 'u');

select indexname from pg_indexes
where schemaname = 'public' and tablename = 'room_inventory';

select count(*) as remaining_orphans
from public.room_inventory ri
where ri.created_by is not null
  and not exists (select 1 from auth.users u where u.id = ri.created_by);