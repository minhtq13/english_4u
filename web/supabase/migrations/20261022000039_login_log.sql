-- A lasting record of sign-ins. auth.sessions holds a row per sign-in, but it is deleted at sign-out or expiry, and
-- auth.users.last_sign_in_at keeps only the latest one; so every new session is copied here when it is created.
-- Readers: admins see everyone, teachers the students they manage (private.can_manage_user), everyone their own rows.
-- Nobody writes through the API: only the trigger inserts.

create table public.login_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  session_id uuid unique,
  signed_in_at timestamptz not null default now(),
  ip inet,
  user_agent text
);
comment on table public.login_log is 'One row per sign-in (new auth session), written by the on_auth_session_created trigger.';

create index login_log_user_time_idx on public.login_log (user_id, signed_in_at desc);
create index login_log_time_idx on public.login_log (signed_in_at desc);

alter table public.login_log enable row level security;

create policy "login_log: read own or managed" on public.login_log
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.can_manage_user(user_id)));

-- Copies a new session. A failure here must never stop the sign-in, so any error is swallowed.
create or replace function private.log_login()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  begin
    insert into public.login_log (user_id, session_id, signed_in_at, ip, user_agent)
    select new.user_id, new.id, coalesce(new.created_at, now()), new.ip, left(new.user_agent, 500)
    where exists (select 1 from public.profiles p where p.id = new.user_id)
    on conflict (session_id) do nothing;
  exception when others then
    null;
  end;
  return new;
end;
$$;
-- A trigger function must not be callable as an RPC (triggers still fire).
revoke execute on function private.log_login() from public, anon, authenticated;

create or replace trigger on_auth_session_created
  after insert on auth.sessions
  for each row execute function private.log_login();

-- The sessions still open today are the only sign-ins already known; keep them.
insert into public.login_log (user_id, session_id, signed_in_at, ip, user_agent)
select s.user_id, s.id, s.created_at, s.ip, left(s.user_agent, 500)
from auth.sessions s
join public.profiles p on p.id = s.user_id
where s.created_at is not null
on conflict (session_id) do nothing;
