-- Runtime errors of the browser app, for the admin (no outside service). A ring buffer of 1000 slots: a new error
-- takes the slot after the previous one and overwrites what was there, so the table never holds more than 1000 rows
-- and nothing needs deleting. Written only through log_client_error() (any signed-in user, at most 20 a minute each);
-- read by admins only.
--
-- Rollback: drop function public.log_client_error(text, text, text, text); drop table public.client_errors; drop sequence public.client_errors_seq;

create sequence public.client_errors_seq;

create table public.client_errors (
  slot smallint primary key check (slot between 0 and 999),
  created_at timestamptz not null default now(),
  user_id uuid references public.profiles (id) on delete set null,
  message text not null,
  stack text,
  url text,
  user_agent text
);
comment on table public.client_errors is 'Browser runtime errors: a ring buffer of 1000 rows written by log_client_error().';
create index client_errors_created_idx on public.client_errors (created_at desc);
create index client_errors_user_idx on public.client_errors (user_id);

alter table public.client_errors enable row level security;
create policy "client_errors: admin read" on public.client_errors for select to authenticated using ((select private.is_admin()));
create policy "session alive" on public.client_errors as restrictive for all to authenticated
  using ((select private.session_alive())) with check ((select private.session_alive()));

create or replace function public.log_client_error(msg text, trace text default null, page text default null, agent text default null)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare me uuid := (select auth.uid());
begin
  perform private.session_alive();
  if me is null or coalesce(trim(msg), '') = '' then
    return;
  end if;
  -- A person who floods the log is ignored.
  if (select count(*) from public.client_errors e where e.user_id = me and e.created_at > now() - interval '1 minute') >= 20 then
    return;
  end if;
  insert into public.client_errors (slot, user_id, message, stack, url, user_agent)
  values ((nextval('public.client_errors_seq') % 1000)::smallint, me, left(msg, 500), left(trace, 4000), left(page, 500), left(agent, 300))
  on conflict (slot) do update
    set created_at = now(), user_id = excluded.user_id, message = excluded.message, stack = excluded.stack,
        url = excluded.url, user_agent = excluded.user_agent;
end;
$function$;

revoke execute on function public.log_client_error(text, text, text, text) from public, anon;
grant execute on function public.log_client_error(text, text, text, text) to authenticated;
