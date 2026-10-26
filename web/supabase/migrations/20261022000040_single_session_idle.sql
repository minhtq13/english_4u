-- Sessions: one at a time per account, ended after 10 minutes without activity, and ended at once when an account is
-- locked. Supabase's own session limits need a paid plan, so the database enforces them:
--   * a new sign-in deletes the account's other sessions (the newest wins; the other device is signed out);
--   * the app reports activity through touch_session() at most once a minute while someone uses it, and a pg_cron job
--     deletes sessions not seen for 10 minutes;
--   * locking an account (profiles.active = false) deletes its sessions;
--   * a restrictive policy on every table refuses requests whose JWT belongs to a deleted session, so a signed-out
--     device loses access at its next request instead of when its JWT expires.
-- login_log records how each session ended. Deleting from auth.sessions also drops its refresh tokens (cascade).
-- The function bodies delete rows, so this file is run in the SQL Editor (the MCP declines it).

alter table public.login_log
  add column last_seen_at timestamptz,
  add column ended_at timestamptz,
  add column end_reason text check (end_reason in ('signout', 'replaced', 'idle', 'locked'));
update public.login_log set last_seen_at = signed_in_at where last_seen_at is null;
alter table public.login_log alter column last_seen_at set default now(), alter column last_seen_at set not null;
comment on column public.login_log.end_reason is 'signout | replaced (signed in elsewhere) | idle (10 minutes without activity) | locked';
-- The idle sweep looks for open sessions by last activity.
create index login_log_open_idx on public.login_log (last_seen_at) where ended_at is null;

-- The session of the caller's JWT still exists. True for requests without a session (service role).
create or replace function private.session_alive()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when nullif(auth.jwt() ->> 'session_id', '') is null then true
    else exists (select 1 from auth.sessions s where s.id = (auth.jwt() ->> 'session_id')::uuid)
  end
$$;
revoke execute on function private.session_alive() from public, anon;
grant execute on function private.session_alive() to authenticated;

-- Ends sessions of one account with a reason: the log first (so the reason survives), then the session itself.
create or replace function private.end_sessions(target uuid, reason text, keep uuid default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.login_log set end_reason = reason, ended_at = now()
  where user_id = target and ended_at is null and session_id is distinct from keep;
  delete from auth.sessions where user_id = target and id is distinct from keep;
end;
$$;
revoke execute on function private.end_sessions(uuid, text, uuid) from public, anon, authenticated;

-- A new sign-in: logged, and every other session of the account ends. A failure never stops the sign-in.
create or replace function private.log_login()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  begin
    insert into public.login_log (user_id, session_id, signed_in_at, last_seen_at, ip, user_agent)
    select new.user_id, new.id, coalesce(new.created_at, now()), coalesce(new.created_at, now()), new.ip, left(new.user_agent, 500)
    where exists (select 1 from public.profiles p where p.id = new.user_id)
    on conflict (session_id) do nothing;
    perform private.end_sessions(new.user_id, 'replaced', new.id);
  exception when others then
    raise warning 'log_login: %', sqlerrm;
  end;
  return new;
end;
$$;
revoke execute on function private.log_login() from public, anon, authenticated;

-- A session that goes away by itself (sign-out, or Supabase removing it) is closed in the log as a sign-out.
create or replace function private.log_logout()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  begin
    update public.login_log set ended_at = now(), end_reason = 'signout' where session_id = old.id and ended_at is null;
  exception when others then
    raise warning 'log_logout: %', sqlerrm;
  end;
  return old;
end;
$$;
revoke execute on function private.log_logout() from public, anon, authenticated;

create or replace trigger on_auth_session_deleted
  after delete on auth.sessions
  for each row execute function private.log_logout();

-- Locking an account signs it out everywhere (the edge function sets profiles.active and bans the auth user).
create or replace function private.end_locked_sessions()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.end_sessions(new.id, 'locked');
  return new;
end;
$$;
revoke execute on function private.end_locked_sessions() from public, anon, authenticated;

create or replace trigger on_profile_locked
  after update of active on public.profiles
  for each row when (old.active and not new.active)
  execute function private.end_locked_sessions();

-- Sessions without activity for 10 minutes end; pg_cron runs this every minute.
create or replace function private.end_idle_sessions()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare r record;
begin
  for r in
    select l.user_id, l.session_id from public.login_log l
    where l.ended_at is null and l.last_seen_at < now() - interval '10 minutes'
  loop
    update public.login_log set end_reason = 'idle', ended_at = now() where session_id = r.session_id and ended_at is null;
    delete from auth.sessions where id = r.session_id;
  end loop;
end;
$$;
revoke execute on function private.end_idle_sessions() from public, anon, authenticated;
select cron.schedule('end-idle-sessions', '* * * * *', 'select private.end_idle_sessions()');

-- Called by the app at most once a minute while someone is active. Returns 'ok', or why the session is over
-- ('replaced', 'idle', 'locked', 'signout', 'ended') so the app can sign out and say why.
create or replace function public.touch_session()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare sid uuid := nullif(auth.jwt() ->> 'session_id', '')::uuid; why text;
begin
  if sid is null then return 'ended'; end if;
  if not exists (select 1 from auth.sessions s where s.id = sid) then
    select end_reason into why from public.login_log where session_id = sid;
    return coalesce(why, 'ended');
  end if;
  update public.login_log set last_seen_at = now() where session_id = sid and ended_at is null;
  return 'ok';
end;
$$;
revoke execute on function public.touch_session() from public, anon;
grant execute on function public.touch_session() to authenticated;

-- Every table with policies refuses a deleted session's JWT (restrictive: it is ANDed with the existing policies).
do $$
declare t text;
begin
  for t in
    select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
      and exists (select 1 from pg_policy p where p.polrelid = c.oid)
  loop
    execute format(
      'create policy "session alive" on public.%I as restrictive for all to authenticated using ((select private.session_alive())) with check ((select private.session_alive()))',
      t);
  end loop;
end $$;

-- Only one session per account from now on: keep each account's newest session.
do $$
declare r record;
begin
  for r in select distinct on (user_id) user_id, id from auth.sessions order by user_id, created_at desc loop
    perform private.end_sessions(r.user_id, 'replaced', r.id);
  end loop;
end $$;
