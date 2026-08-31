-- Get It Done — Supabase schema.
-- Paste this whole file into the Supabase SQL Editor and run it once.

-- ---------------------------------------------------------------- access --
-- The board is private. Only emails listed here can read or write anything.
-- Add your friends by inserting rows (Table Editor -> allowed_emails).

create table if not exists public.allowed_emails (
  email    text primary key,
  added_at timestamptz not null default now()
);

alter table public.allowed_emails enable row level security;
-- Deliberately no policies: nobody using the public anon key can read or edit
-- this table. You manage it from the Supabase dashboard, which bypasses RLS.

-- SECURITY DEFINER so the check can read allowed_emails even though RLS
-- would otherwise hide that table from the signed-in user.
create or replace function public.is_member()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.allowed_emails
    where lower(email) = lower(auth.jwt() ->> 'email')
  );
$$;

-- anon gets execute too, so signed-out requests return an empty result
-- instead of a confusing "permission denied". The function takes no
-- arguments and only reports on the caller's own token, so it leaks nothing.
revoke execute on function public.is_member() from public;
grant execute on function public.is_member() to anon, authenticated;

-- ----------------------------------------------------------------- cards --

create table if not exists public.cards (
  id         uuid primary key default gen_random_uuid(),
  title      text not null check (char_length(title) between 1 and 200),
  notes      text check (char_length(notes) <= 4000),
  assignee   text check (char_length(assignee) <= 120),
  status     text not null,          -- matches a column id in config.js
  position   double precision not null default 1000,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cards_status_position_idx
  on public.cards (status, position);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists cards_touch_updated_at on public.cards;
create trigger cards_touch_updated_at
  before update on public.cards
  for each row execute function public.touch_updated_at();

alter table public.cards enable row level security;

drop policy if exists "members read"   on public.cards;
drop policy if exists "members insert" on public.cards;
drop policy if exists "members update" on public.cards;
drop policy if exists "members delete" on public.cards;

create policy "members read"   on public.cards for select using (public.is_member());
create policy "members insert" on public.cards for insert with check (public.is_member());
create policy "members update" on public.cards for update using (public.is_member())
                                                    with check (public.is_member());
create policy "members delete" on public.cards for delete using (public.is_member());

-- Broadcast changes so everyone's board updates live. RLS still applies:
-- non-members receive nothing.
alter publication supabase_realtime add table public.cards;

-- --------------------------------------------------------------- your turn --
-- Replace with your own email, then add the rest of your team:
--
--   insert into public.allowed_emails (email) values
--     ('you@example.com'),
--     ('friend@example.com');
