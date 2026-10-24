-- Fingerprint of the database: a row count per table that holds data, a few object counts and checksums of the content.
-- Run it before a risky change and again after a restore (psql "$URL" -At -F '|' -f web/supabase/verify-counts.sql), then diff the outputs.
-- It only reads. Volatile tables (auth.sessions, refresh_tokens) change whenever someone signs in, so expect small differences there.
with tabs as (
  select format('%I.%I', n.nspname, c.relname) as t
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where c.relkind in ('r', 'p') and (n.nspname = 'public'
    or (n.nspname = 'auth' and c.relname <> 'schema_migrations')
    or (n.nspname = 'storage' and c.relname <> 'migrations')
    or n.nspname = 'supabase_migrations')
)
select 'rows ' || t, (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from %s', t), false, true, '')))[1]::text from tabs
union all select 'policies (public)', count(*)::text from pg_policy p join pg_class c on c.oid = p.polrelid join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public'
union all select 'functions public+private', count(*)::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname in ('public', 'private')
union all select 'triggers public', count(*)::text from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and not t.tgisinternal
union all select 'trigger on auth.users', count(*)::text from pg_trigger where tgrelid = 'auth.users'::regclass and not tgisinternal
union all select 'handle_new_user is the real one', (position('insert into public.profiles' in pg_get_functiondef('public.handle_new_user'::regproc)) > 0)::text
union all select 'user triggers disabled (public)', count(*)::text from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and not t.tgisinternal and t.tgenabled <> 'O'
union all select 'pg_cron jobs', count(*)::text from cron.job
union all select 'checksum lessons+items', md5(coalesce((select string_agg(md5(l::text), '' order by l.id) from public.lessons l), '') || coalesce((select string_agg(md5(i::text), '' order by i.id) from public.section_items i), ''))
union all select 'checksum attempts', md5(coalesce((select string_agg(md5(a::text), '' order by a.id) from public.attempts a), ''))
union all select 'checksum attempt_results', md5(coalesce((select string_agg(md5(r::text), '' order by r.attempt_id) from public.attempt_results r), ''))
union all select 'checksum classes', md5(coalesce((select string_agg(md5(c::text), '' order by c.id) from public.classes c), ''))
union all select 'checksum class_lessons', md5(coalesce((select string_agg(md5(c::text), '' order by c.class_id, c.lesson_id) from public.class_lessons c), ''))
union all select 'checksum profiles', md5(coalesce((select string_agg(md5(p::text), '' order by p.id) from public.profiles p), ''))
union all select 'checksum auth.users (id, email)', md5(coalesce((select string_agg(u.id::text || coalesce(u.email, ''), '' order by u.id) from auth.users u), ''))
union all select 'checksum migration history', md5(coalesce((select string_agg(md5(m::text), '' order by m.version) from supabase_migrations.schema_migrations m), ''))
order by 1;
