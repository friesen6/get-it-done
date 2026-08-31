-- Get It Done — Supabase schema.
-- Paste this whole file into the Supabase SQL Editor and run it once.
--
-- Access model: one shared team account. Everyone signs in with the same
-- code, which Supabase stores hashed in auth.users and verifies server-side.
-- The browser never sees it, so it cannot be read out of the page source.
-- Anything reaching the database without a valid session is refused here.

create table if not exists public.cards (
  id         uuid primary key default gen_random_uuid(),
  title      text not null check (char_length(title) between 1 and 200),
  notes      text check (char_length(notes) <= 4000),
  assignee   text check (char_length(assignee) <= 120),
  status     text not null,          -- matches a column id in config.js
  position   double precision not null default 1000,
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

-- ---------------------------------------------------------------- access --

alter table public.cards enable row level security;

drop policy if exists "members read"   on public.cards;
drop policy if exists "members insert" on public.cards;
drop policy if exists "members update" on public.cards;
drop policy if exists "members delete" on public.cards;

-- auth.uid() is null for anyone who hasn't entered the code, so all four
-- policies fail closed. Public signups MUST stay disabled in the Supabase
-- dashboard — otherwise a stranger could create their own account and pass
-- these checks without ever knowing the code.
create policy "unlocked read"   on public.cards for select using (auth.uid() is not null);
create policy "unlocked insert" on public.cards for insert with check (auth.uid() is not null);
create policy "unlocked update" on public.cards for update using (auth.uid() is not null)
                                                    with check (auth.uid() is not null);
create policy "unlocked delete" on public.cards for delete using (auth.uid() is not null);

-- Broadcast changes so everyone's board updates live. RLS still applies.
alter publication supabase_realtime add table public.cards;
