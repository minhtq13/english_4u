-- A request from a session that has ended (signed in elsewhere, idle, locked) now fails instead of returning no rows.
-- Before, the "session alive" policies only hid every row, so the old device saw 200 with empty data and kept going
-- until its next activity report. Now the check raises SQLSTATE PT401, which PostgREST answers with HTTP 401; the app
-- (plugins/session-ended.client.ts) sees it on any request and signs out at once with the reason.
-- Same function, so the policies need no change: they call (select private.session_alive()) once per statement.

create or replace function private.session_alive()
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare sid uuid := nullif(auth.jwt() ->> 'session_id', '')::uuid;
begin
  if sid is null or exists (select 1 from auth.sessions s where s.id = sid) then
    return true;
  end if;
  raise exception 'Phiên đăng nhập đã kết thúc' using errcode = 'PT401', hint = 'session_ended';
end;
$$;
revoke execute on function private.session_alive() from public, anon;
grant execute on function private.session_alive() to authenticated;
