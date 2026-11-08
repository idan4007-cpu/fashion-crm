-- Tiny function the daily Vercel cron (/api/keepalive) calls so Supabase
-- doesn't pause the free project. Returns 1, reads no tables.
create or replace function public.keepalive()
returns int
language sql
stable
as $$ select 1 $$;

grant execute on function public.keepalive() to anon;

select public.keepalive() as ok;
