-- 041_golive14_hotels_near.sql
-- GOLIVE-14 — "Near me": active hotels within a radius, nearest first.
-- Plain haversine maths: no PostGIS / extension needed.
-- SECURITY INVOKER (the default) on purpose: the caller's normal RLS applies,
-- exactly as for every other public hotel read. It also filters status =
-- 'active' and deleted_at is null itself, same rule as the /hotels listing.
-- Hotels with no latitude/longitude are simply not returned.
-- NOT yet run anywhere. Safe to re-run (OR REPLACE).
--
-- RULE 13 — run this FIRST; expect 5 rows (a missing one = STOP, send result):
--   select column_name, data_type from information_schema.columns
--   where table_schema = 'public' and table_name = 'hotels'
--     and column_name in ('id','latitude','longitude','status','deleted_at');

create or replace function public.hotels_near(
  p_lat       double precision,
  p_lng       double precision,
  p_radius_km double precision default 50,
  p_limit     integer          default 8
)
returns table (hotel_id uuid, distance_km double precision)
language sql
stable
set search_path = public
as $$
  select h.id as hotel_id, d.km as distance_km
  from public.hotels h
  cross join lateral (
    select 6371.0 * 2 * asin(least(1.0, sqrt(
        power(sin(radians((h.latitude)::double precision - p_lat) / 2), 2)
      + cos(radians(p_lat)) * cos(radians((h.latitude)::double precision))
        * power(sin(radians((h.longitude)::double precision - p_lng) / 2), 2)
    ))) as km
  ) d
  where h.status = 'active'
    and h.deleted_at is null
    and h.latitude is not null
    and h.longitude is not null
    and p_lat between -90 and 90
    and p_lng between -180 and 180
    and d.km <= greatest(1.0, least(coalesce(p_radius_km, 50), 500))
  order by d.km asc
  limit greatest(1, least(coalesce(p_limit, 8), 50));
$$;

revoke all on function public.hotels_near(double precision, double precision, double precision, integer) from public;
grant execute on function public.hotels_near(double precision, double precision, double precision, integer)
  to anon, authenticated, service_role;

-- TEST (Ayodhya centre; expect your Ayodhya hotels first, distance_km small):
--   select * from public.hotels_near(26.7922, 82.1998, 50, 8);
-- Hotels with no coordinates will not appear: fill latitude/longitude in the
-- admin hotel form (decimal degrees, e.g. 26.7922 and 82.1998).
