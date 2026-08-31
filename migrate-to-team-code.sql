-- One-time migration: per-person magic links -> one shared team code.
-- Your project already has the old tables, so run THIS in the SQL Editor
-- rather than re-running schema.sql.

-- 1. Policies must go first: they depend on is_member().
drop policy if exists "members read"   on public.cards;
drop policy if exists "members insert" on public.cards;
drop policy if exists "members update" on public.cards;
drop policy if exists "members delete" on public.cards;

-- 2. New policies. auth.uid() is null until someone enters the code, so
--    these fail closed for anonymous visitors.
create policy "unlocked read"   on public.cards for select using (auth.uid() is not null);
create policy "unlocked insert" on public.cards for insert with check (auth.uid() is not null);
create policy "unlocked update" on public.cards for update using (auth.uid() is not null)
                                                    with check (auth.uid() is not null);
create policy "unlocked delete" on public.cards for delete using (auth.uid() is not null);

-- 3. Retire the per-person access machinery.
drop function if exists public.is_member();
drop table if exists public.allowed_emails;

-- 4. created_by pointed at individual accounts; everyone shares one now.
alter table public.cards drop column if exists created_by;

-- 5. Confirm: both should be false for an anonymous visitor.
select
  (select count(*) from pg_policies
    where tablename = 'cards' and policyname like 'members%') > 0 as old_policies_remain,
  to_regclass('public.allowed_emails') is not null              as allowed_emails_remains;
