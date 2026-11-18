-- Graduation at the end of a school year: the students of a class (grade 9) leave it, one audit row. Their account,
-- attempts, feedback and error log stay as they are; only profiles.class_id is cleared (the class no longer sees them,
-- and they see no lessons until an admin puts them in a class again). Counterpart of promote_class().
--
-- Rollback: drop function public.graduate_class(uuid);

create or replace function public.graduate_class(source_class uuid)
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare n integer;
begin
  perform private.session_alive();
  if not private.is_admin() then
    raise exception 'Chỉ admin mới cho cả lớp tốt nghiệp được';
  end if;
  if not exists (select 1 from public.classes c where c.id = source_class) then
    raise exception 'Không tìm thấy lớp';
  end if;
  perform set_config('app.bulk_move', 'on', true);
  update public.profiles set class_id = null where class_id = source_class and role = 'student';
  get diagnostics n = row_count;
  perform set_config('app.bulk_move', 'off', true);
  insert into public.audit_log (actor, action, target, detail)
  values ((select auth.uid()), 'class_graduated', source_class, jsonb_build_object('students', n));
  return n;
end;
$function$;

revoke execute on function public.graduate_class(uuid) from public, anon;
grant execute on function public.graduate_class(uuid) to authenticated;
