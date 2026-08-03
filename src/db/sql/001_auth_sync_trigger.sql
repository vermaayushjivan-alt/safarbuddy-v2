-- SafarBuddy — AUTH-01
-- Syncs Supabase auth.users into public.users, and assigns the default
-- "user" role on signup. Run this once against the Supabase project's SQL
-- editor (or via `supabase db execute`) after `drizzle-kit push` /
-- `drizzle-kit migrate` has created public.users, public.roles and
-- public.user_roles.
--
-- AUTH RULE: public.users.id === auth.users.id. This trigger is the only
-- place that ever writes public.users.id, and it always sets it to NEW.id
-- (the auth.users id) — never a locally generated uuid.

-- 1) Seed default roles (idempotent).
insert into public.roles (name, label, description)
values
  ('admin', 'Administrator', 'Full platform access.'),
  ('vendor', 'Vendor', 'Manages listings, bookings and payouts for their business.'),
  ('user', 'User', 'Standard traveler account.')
on conflict (name) do nothing;

-- 2) Function: create the matching public.users row (+ default "user"
--    role) whenever a new auth.users row is inserted.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  default_role_id uuid;
begin
  insert into public.users (id, email, full_name, is_email_verified, created_at, updated_at)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.email_confirmed_at is not null,
    now(),
    now()
  )
  on conflict (id) do nothing;

  select id into default_role_id from public.roles where name = 'user';

  if default_role_id is not null then
    insert into public.user_roles (user_id, role_id, created_at, updated_at)
    values (new.id, default_role_id, now(), now())
    on conflict do nothing;
  end if;

  return new;
end;
$$;

-- 3) Trigger: fire the function above on every new auth signup
--    (email/password, Google OAuth, magic link — all insert into auth.users).
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_auth_user();

-- 4) Keep public.users.email in sync if it ever changes in auth.users
--    (e.g. user updates their email and confirms it).
create or replace function public.handle_auth_user_updated()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.users
  set
    email = new.email,
    is_email_verified = (new.email_confirmed_at is not null),
    updated_at = now()
  where id = new.id;

  return new;
end;
$$;

drop trigger if exists on_auth_user_updated on auth.users;

create trigger on_auth_user_updated
  after update on auth.users
  for each row
  execute function public.handle_auth_user_updated();
