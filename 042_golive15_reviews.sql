-- 042_golive15_reviews.sql
-- GOLIVE-15 — real customer reviews for hotel stays.
-- One review per booking, only after the stay (enforced in the server action),
-- shown publicly only once an admin has published it. Service-role only
-- (RULE 24): RLS on, NO policies, no browser access at all.
-- NOT yet run anywhere. Safe to re-run.
--
-- RULE 13 — run FIRST, expect 3 rows (a missing one = STOP, send result):
--   select table_name from information_schema.tables
--   where table_schema = 'public' and table_name in ('bookings','hotels','users');

create table if not exists public.reviews (
  id               uuid primary key default gen_random_uuid(),
  booking_id       uuid not null references public.bookings(id),
  hotel_id         uuid not null references public.hotels(id),
  user_id          uuid not null references public.users(id),
  rating           smallint not null,
  title            text,
  comment          text,
  status           text not null default 'pending',
  rejection_reason text,
  moderated_by     uuid references public.users(id),
  moderated_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint reviews_rating_check  check (rating between 1 and 5),
  constraint reviews_status_check  check (status in ('pending', 'published', 'rejected')),
  constraint reviews_title_len     check (title is null or char_length(title) <= 100),
  constraint reviews_comment_len   check (comment is null or char_length(comment) <= 1500),
  constraint reviews_one_per_booking unique (booking_id)
);

create index if not exists reviews_hotel_published_idx
  on public.reviews (hotel_id, created_at desc) where status = 'published';
create index if not exists reviews_status_idx
  on public.reviews (status, created_at desc);
create index if not exists reviews_user_idx
  on public.reviews (user_id);

alter table public.reviews enable row level security;
revoke all on public.reviews from public, anon, authenticated;

-- Average + count of PUBLISHED reviews for one hotel.
create or replace function public.hotel_review_summary(p_hotel_id uuid)
returns table (average_rating numeric, review_count bigint)
language sql
stable
set search_path = public
as $$
  select round(avg(r.rating)::numeric, 1), count(*)
  from public.reviews r
  where r.hotel_id = p_hotel_id and r.status = 'published';
$$;

revoke all on function public.hotel_review_summary(uuid) from public, anon, authenticated;
grant execute on function public.hotel_review_summary(uuid) to service_role;

-- TEST: select * from public.hotel_review_summary('<any hotel id>');
--       -- expect: null | 0 until a review is published.
