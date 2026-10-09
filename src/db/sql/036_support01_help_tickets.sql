-- ROOT PATH: src/db/sql/036_support01_help_tickets.sql
-- SUPPORT-01 — customer support tickets with a chat thread (cancellation,
-- refund, payment, booking change, hotel issue, account, other).
-- Run in the Supabase SQL editor. Idempotent.
--
-- Why new tables (help_tickets / help_ticket_messages): the live database
-- already has an older, unused `support_tickets` table whose columns are not in
-- this repo, so it is left untouched.
--
-- Security (same convention as booking_messages and the refund tables):
--   * RLS on. NO insert/update/delete rights for anon or signed-in users:
--     every write goes through server actions (service role) that check who the
--     caller is.
--   * Messages have ONE select policy so the chat can update live in the
--     browser (Realtime): a customer sees only their own tickets, admins see all.

create sequence if not exists public.help_ticket_number_seq;

create table if not exists public.help_tickets (
  id                  uuid primary key default gen_random_uuid(),
  ticket_number       text not null unique
                        default ('TKT-' || lpad(nextval('public.help_ticket_number_seq')::text, 6, '0')),
  customer_id         uuid not null references public.users(id),
  booking_id          uuid references public.bookings(id) on delete set null,
  category            text not null
                        check (category in ('cancellation','refund','payment','booking_change','hotel_issue','account','other')),
  subject             text not null check (char_length(subject) between 3 and 150),
  status              text not null default 'open'
                        check (status in ('open','in_progress','awaiting_customer','resolved','closed')),
  priority            text not null default 'normal'
                        check (priority in ('low','normal','high','urgent')),
  last_message_at     timestamptz not null default now(),
  last_sender_role    text check (last_sender_role in ('customer','support')),
  customer_last_read_at timestamptz,
  staff_last_read_at  timestamptz,
  resolved_at         timestamptz,
  closed_at           timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists help_tickets_customer_idx
  on public.help_tickets (customer_id, last_message_at desc);
create index if not exists help_tickets_status_idx
  on public.help_tickets (status, last_message_at desc);
create index if not exists help_tickets_booking_idx
  on public.help_tickets (booking_id) where booking_id is not null;

create table if not exists public.help_ticket_messages (
  id              uuid primary key default gen_random_uuid(),
  ticket_id       uuid not null references public.help_tickets(id) on delete cascade,
  sender_role     text not null check (sender_role in ('customer','support')),
  sender_user_id  uuid references public.users(id),
  message_text    text not null check (char_length(message_text) between 1 and 2000),
  created_at      timestamptz not null default now()
);

create index if not exists help_ticket_messages_ticket_idx
  on public.help_ticket_messages (ticket_id, created_at);

-- RLS -----------------------------------------------------------------
alter table public.help_tickets enable row level security;
alter table public.help_ticket_messages enable row level security;

revoke all on public.help_tickets from anon, authenticated;
revoke all on public.help_ticket_messages from anon, authenticated;
grant select on public.help_ticket_messages to authenticated;

drop policy if exists help_ticket_messages_select on public.help_ticket_messages;
create policy help_ticket_messages_select
  on public.help_ticket_messages
  for select
  to authenticated
  using (
    exists (
      select 1 from public.help_tickets t
      where t.id = help_ticket_messages.ticket_id
        and (t.customer_id = public.current_user_id() or public.is_admin())
    )
  );

-- The select policy above reads help_tickets as the signed-in user, so that
-- table needs a matching read right + policy (rows only for owner/admin).
grant select on public.help_tickets to authenticated;
drop policy if exists help_tickets_select on public.help_tickets;
create policy help_tickets_select
  on public.help_tickets
  for select
  to authenticated
  using (customer_id = public.current_user_id() or public.is_admin());

-- Live chat (Realtime) for new messages.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'help_ticket_messages'
     ) then
    alter publication supabase_realtime add table public.help_ticket_messages;
  end if;
end
$$;
