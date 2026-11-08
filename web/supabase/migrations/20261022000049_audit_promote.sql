-- Audit log of sensitive account and class changes (who changed a role, locked or deleted an account, moved a student,
-- changed a class code, deleted a class), and promote_class(): move a whole class's students to another class at the
-- start of a school year, recorded as one entry. Only admins read the log; nobody writes it except the triggers.
-- Changes made by the manage-accounts edge function run as the service role, so their actor is empty.

create table public.audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor uuid,
  action text not null,
  target uuid,
  detail jsonb not null default '{}'::jsonb
);
create index audit_log_at_idx on public.audit_log (at desc);
create index audit_log_target_idx on public.audit_log (target);
comment on table public.audit_log is 'Sensitive account and class changes; written by triggers, read by admins.';

alter table public.audit_log enable row level security;
create policy "audit_log: admins read" on public.audit_log for select to authenticated using ((select private.is_admin()));
create policy "session alive" on public.audit_log as restrictive for all to authenticated
  using ((select private.session_alive())) with check ((select private.session_alive()));

create or replace function private.audit_profile()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
begin
  if tg_op = 'DELETE' then
    insert into public.audit_log (actor, action, target, detail)
    values ((select auth.uid()), 'account_deleted', old.id, jsonb_build_object('name', old.full_name, 'username', old.username, 'email', old.email, 'role', old.role));
    return old;
  end if;
  if new.role is distinct from old.role then
    insert into public.audit_log (actor, action, target, detail)
    values ((select auth.uid()), 'role_changed', new.id, jsonb_build_object('from', old.role, 'to', new.role));
  end if;
  if new.active is distinct from old.active then
    insert into public.audit_log (actor, action, target, detail)
    values ((select auth.uid()), case when new.active then 'account_unlocked' else 'account_locked' end, new.id, '{}'::jsonb);
  end if;
  if new.class_id is distinct from old.class_id and coalesce(current_setting('app.bulk_move', true), '') <> 'on' then
    insert into public.audit_log (actor, action, target, detail)
    values ((select auth.uid()), 'class_changed', new.id, jsonb_build_object('from', old.class_id, 'to', new.class_id));
  end if;
  return new;
end;
$function$;

create or replace function private.audit_class()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
begin
  if tg_op = 'DELETE' then
    insert into public.audit_log (actor, action, target, detail)
    values ((select auth.uid()), 'class_deleted', old.id, jsonb_build_object('name', old.name));
    return old;
  end if;
  insert into public.audit_log (actor, action, target, detail)
  values ((select auth.uid()), 'class_code_changed', new.id, jsonb_build_object('name', new.name));
  return new;
end;
$function$;

revoke execute on function private.audit_profile() from public, anon, authenticated;
revoke execute on function private.audit_class() from public, anon, authenticated;

create trigger profiles_audit_update after update of role, active, class_id on public.profiles
  for each row execute function private.audit_profile();
create trigger profiles_audit_delete after delete on public.profiles
  for each row execute function private.audit_profile();
create trigger classes_audit_code after update of join_code on public.classes
  for each row when (old.join_code is distinct from new.join_code) execute function private.audit_class();
create trigger classes_audit_delete after delete on public.classes
  for each row execute function private.audit_class();

create or replace function public.promote_class(source_class uuid, target_class uuid)
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare n integer;
begin
  perform private.session_alive();
  if not private.is_admin() then
    raise exception 'Chỉ admin mới chuyển cả lớp lên lớp mới được';
  end if;
  if source_class = target_class then
    raise exception 'Lớp đích phải khác lớp nguồn';
  end if;
  if not exists (select 1 from public.classes c where c.id = source_class) or not exists (select 1 from public.classes c where c.id = target_class) then
    raise exception 'Không tìm thấy lớp';
  end if;
  perform set_config('app.bulk_move', 'on', true);
  update public.profiles set class_id = target_class where class_id = source_class and role = 'student';
  get diagnostics n = row_count;
  perform set_config('app.bulk_move', 'off', true);
  insert into public.audit_log (actor, action, target, detail)
  values ((select auth.uid()), 'class_promoted', source_class, jsonb_build_object('to', target_class, 'students', n));
  return n;
end;
$function$;

revoke execute on function public.promote_class(uuid, uuid) from public, anon;
grant execute on function public.promote_class(uuid, uuid) to authenticated;
