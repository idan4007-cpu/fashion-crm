-- Fashion CRM: lock down the database so only logged-in users can read/write.
-- Run this in Supabase → SQL Editor, ONLY after the new code is deployed
-- and you have created your login user (Authentication → Users → Add user).

do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t.tablename);
    -- remove any old policies (e.g. "allow all" policies that let anonymous visitors in)
    execute (
      select coalesce(string_agg(format('drop policy if exists %I on public.%I;', policyname, t.tablename), ' '), 'select 1')
      from pg_policies where schemaname = 'public' and tablename = t.tablename
    );
    execute format(
      'create policy "logged in users only" on public.%I for all to authenticated using (true) with check (true)',
      t.tablename
    );
    -- anonymous visitors get no access at all
    execute format('revoke all on public.%I from anon', t.tablename);
  end loop;
end $$;

-- Check: every table should show rowsecurity = true
select tablename, rowsecurity from pg_tables where schemaname = 'public';
