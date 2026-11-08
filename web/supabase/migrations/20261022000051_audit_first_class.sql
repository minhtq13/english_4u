-- The audit log should not fill with a student's first placement in a class (creating accounts in bulk, or joining by
-- class code): only a move from one class to another, or out of a class, is written. Everything else is unchanged.
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
  if new.class_id is distinct from old.class_id and old.class_id is not null and coalesce(current_setting('app.bulk_move', true), '') <> 'on' then
    insert into public.audit_log (actor, action, target, detail)
    values ((select auth.uid()), 'class_changed', new.id, jsonb_build_object('from', old.class_id, 'to', new.class_id));
  end if;
  return new;
end;
$function$;
