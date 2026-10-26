-- The RPCs that run as their owner (security definer) skip RLS, so the "session alive" policies never saw them: a
-- device whose session had ended (signed in elsewhere, idle, locked) could still submit work, read questions or
-- grade until its JWT expired. Each now starts with private.session_alive(), which raises PT401 for an ended session
-- (HTTP 401, the app signs out at once). The bodies are unchanged otherwise; grants are kept by create or replace.
-- allow_redo deletes rows, so this file is run in the SQL Editor (the MCP declines it).

create or replace function public.allow_redo(target uuid)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  owner uuid;
  st public.attempt_status;
begin
  perform private.session_alive();
  select a.user_id, a.status into owner, st from public.attempts a where a.id = target;
  if owner is null or not private.can_manage_user(owner) then
    raise exception 'Không tìm thấy bài làm, hoặc bạn không quản lý học sinh này';
  end if;
  if st = 'in_progress' then
    raise exception 'Bài này chưa nộp, học sinh vẫn đang làm';
  end if;
  delete from public.attempt_results r where r.attempt_id = target;
  update public.attempts a set status = 'in_progress', score = '{}'::jsonb where a.id = target;
end;
$function$;

create or replace function public.close_class_lesson(target_class uuid, target_lesson text, close_it boolean)
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  t record;
  n integer := 0;
begin
  perform private.session_alive();
  if not (private.is_admin() or private.teaches_class(target_class)) then
    raise exception 'Chỉ giáo viên của lớp mới đóng / mở bài được';
  end if;
  update public.class_lessons
  set closed = close_it,
      due_at = case when not close_it and due_at <= now() then null else due_at end
  where class_id = target_class and lesson_id = target_lesson;
  if not found then
    raise exception 'Bài chưa được giao cho lớp này';
  end if;
  if close_it then
    for t in
      select a.id from public.attempts a
      join public.profiles p on p.id = a.user_id
      where a.lesson_id = target_lesson and p.class_id = target_class and a.status = 'in_progress'
        and (a.answers <> '{}'::jsonb or btrim(a.writing) <> '')
    loop
      perform private.grade_attempt(t.id);
      n := n + 1;
    end loop;
  end if;
  return n;
end;
$function$;

create or replace function public.join_class(code text)
 returns public.classes
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  me public.profiles;
  target public.classes;
begin
  perform private.session_alive();
  select * into me from public.profiles where id = (select auth.uid());
  if me.id is null then
    raise exception 'Bạn cần đăng nhập';
  end if;
  if me.role <> 'student' then
    raise exception 'Chỉ học sinh mới cần nhập mã lớp';
  end if;
  if me.class_id is not null then
    raise exception 'Bạn đã ở trong một lớp. Hãy nhờ giáo viên nếu cần chuyển lớp.';
  end if;
  select * into target from public.classes where join_code = upper(trim(code));
  if target.id is null then
    raise exception 'Mã lớp không đúng. Kiểm tra lại với giáo viên.';
  end if;
  perform set_config('app.joining_class', 'on', true);
  update public.profiles set class_id = target.id where id = me.id;
  return target;
end;
$function$;

create or replace function public.lesson_items(lesson text)
 returns setof public.section_items
 language plpgsql
 stable security definer
 set search_path to ''
as $function$
declare
  reveal boolean;
begin
  perform private.session_alive();
  if not private.can_open_lesson(lesson) then
    return;
  end if;
  reveal := private.can_teach_lesson(lesson) or exists (
    select 1 from public.attempts a
    where a.lesson_id = lesson and a.user_id = (select auth.uid()) and private.results_released(a.id)
  );
  return query
  select
    i.id, i.section_id, i.position, i.prompt,
    case when s.type = 'match' and not reveal then null else i.back end,
    case when s.type = 'match' then array(
        select i2.back from public.section_items i2 where i2.section_id = i.section_id order by md5(i2.id::text))
      else i.options end,
    case when reveal then i.correct_option end,
    case
      when not reveal then null
      when s.type = 'order' then array_prepend(
        array_to_string(array(select btrim(w) from unnest(i.words) with ordinality u(w, n) order by n), ' '),
        coalesce(i.answers, '{}'))
      else i.answers
    end,
    case when i.words is null then null
      else array(select w from unnest(i.words) with ordinality u(w, n) order by md5(i.id::text || n::text)) end,
    case when reveal then i.explanation end,
    i.tag
  from public.section_items i
  join public.lesson_sections s on s.id = i.section_id
  where s.lesson_id = lesson;
end;
$function$;

-- SQL function: the check sits in the WHERE clause, so an ended session raises before any row is read.
create or replace function public.next_lesson_id(course text)
 returns text
 language sql
 stable security definer
 set search_path to ''
as $function$
  select case
    when k.grade is not null then k.grade || '.' || (greatest(100, coalesce((
      select max(split_part(l.id, '.', 2)::integer)
      from public.lessons l
      where l.id ~ ('^' || k.grade || '\.[0-9]+$')
    ), 0)) + 1)
    else (coalesce((
      select max(split_part(l.id, '.', 1)::integer)
      from public.lessons l join public.phases p on p.id = l.phase_id
      where p.course_id = k.id
    ), 0) + 1)::text
  end
  from public.courses k
  where private.session_alive() and k.id = course and (private.is_admin() or private.can_see_course(course))
$function$;

create or replace function public.release_class_results(target_class uuid, target_lesson text)
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  n integer;
begin
  perform private.session_alive();
  if not (private.is_admin() or private.teaches_class(target_class)) then
    raise exception 'Chỉ giáo viên của lớp mới trả kết quả được';
  end if;
  update public.attempts a set status = 'graded'
  from public.profiles p
  where p.id = a.user_id and p.class_id = target_class
    and a.lesson_id = target_lesson and a.status = 'submitted';
  get diagnostics n = row_count;
  return n;
end;
$function$;

create or replace function public.submit_attempt(lesson text)
 returns public.attempts
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  a public.attempts;
begin
  perform private.session_alive();
  select * into a from public.attempts where user_id = (select auth.uid()) and lesson_id = lesson for update;
  if a.id is null then
    raise exception 'Bạn chưa làm bài này';
  end if;
  if a.status <> 'in_progress' then
    raise exception 'Bài đã nộp, không thể nộp lại';
  end if;
  if not private.can_work_lesson(lesson) then
    raise exception 'Bài này đã đóng hoặc chưa mở cho bạn';
  end if;
  return private.grade_attempt(a.id);
end;
$function$;
