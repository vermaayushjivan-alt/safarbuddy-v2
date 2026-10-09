-- 039_golive10_rate_limits.sql
-- GOLIVE-10 — abuse protection: fixed-window rate limiter kept in Postgres
-- (no extra paid service). Called ONLY from the server with the service role.
-- RULE 24: RLS on, NO policies => anon/authenticated can never read or write it.
-- NOT yet run anywhere. Safe to re-run (IF NOT EXISTS / OR REPLACE).

create table if not exists public.rate_limits (
  bucket       text        not null,
  window_start timestamptz not null,
  hits         integer     not null default 0,
  primary key (bucket, window_start)
);

create index if not exists rate_limits_window_start_idx
  on public.rate_limits (window_start);

alter table public.rate_limits enable row level security;
revoke all on public.rate_limits from public, anon, authenticated;

create or replace function public.check_rate_limit(
  p_bucket         text,
  p_limit          integer,
  p_window_seconds integer
)
returns table (out_allowed boolean, out_hits integer, out_retry_after integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_start timestamptz;
  v_hits  integer;
begin
  if p_bucket is null or length(p_bucket) = 0 or p_limit < 1 or p_window_seconds < 1 then
    raise exception 'invalid rate limit arguments';
  end if;

  -- start of the current fixed window
  v_start := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );

  -- atomic increment: concurrent requests cannot both slip under the limit
  insert into public.rate_limits as r (bucket, window_start, hits)
  values (p_bucket, v_start, 1)
  on conflict (bucket, window_start)
  do update set hits = r.hits + 1
  returning r.hits into v_hits;

  -- housekeeping: ~2% of calls delete rows older than 2 days
  if random() < 0.02 then
    delete from public.rate_limits where window_start < now() - interval '2 days';
  end if;

  return query select
    (v_hits <= p_limit),
    v_hits,
    greatest(
      1,
      ceil(extract(epoch from (v_start + make_interval(secs => p_window_seconds) - now())))::integer
    );
end;
$$;

revoke all on function public.check_rate_limit(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.check_rate_limit(text, integer, integer)
  to service_role;

-- TEST (run as postgres in the SQL editor; expect t,t,t,f):
--   select (public.check_rate_limit('test:x', 3, 60)).out_allowed;  -- run 4 times
-- CLEANUP: delete from public.rate_limits where bucket = 'test:x';
