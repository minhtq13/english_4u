-- Who may work on an assigned lesson, and what happens when a teacher wants it back.
--  * class_lessons.for_all (default true): the whole class may do the lesson. When false, only the students
--    listed in class_lesson_students may; the rest see the title with a lock.
--  * class_lessons.closed: the class stops taking work. close_class_lesson() also submits and grades the
--    attempts still in progress. Students keep reading what they submitted (results, feedback).
--  * Taking a lesson back (deleting the class_lessons row) is refused once a student of the class has an
--    attempt on it; the teacher closes it instead.
-- "Work" (start, save, submit) needs can_work_lesson(); "read the content" (can_open_lesson) also lets a
-- student in who already has an attempt, so a closed lesson can still be reviewed.

alter table public.class_lessons add column for_all boolean not null default true;
alter table public.class_lessons add column closed boolean not null default false;
comment on column public.class_lessons.for_all is 'true = cả lớp được làm; false = chỉ học sinh trong class_lesson_students.';
comment on column public.class_lessons.closed is 'true = bài đã đóng: không nhận bài làm mới, học sinh vẫn xem lại bài đã nộp.';

create table public.class_lesson_students (
  class_id uuid not null,
  lesson_id text not null,
  student_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (class_id, lesson_id, student_id),
  foreign key (class_id, lesson_id) references public.class_lessons (class_id, lesson_id)
    on update cascade on delete cascade
);
comment on table public.class_lesson_students is 'Học sinh được mở bài khi class_lessons.for_all = false.';
create index class_lesson_students_student_idx on public.class_lesson_students (student_id);

-- Helpers ----------------------------------------------------------------------
-- The caller (a student) may start, save and submit work on this lesson.
create or replace function private.can_work_lesson(target text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select private.is_admin() or exists (
    select 1 from public.class_lessons cl
    join public.profiles p on p.class_id = cl.class_id
    where p.id = (select auth.uid()) and cl.lesson_id = target and not cl.closed
      and (cl.for_all or exists (
        select 1 from public.class_lesson_students s
        where s.class_id = cl.class_id and s.lesson_id = cl.lesson_id and s.student_id = p.id
      ))
  )
$$;

-- Reading the content: teachers of the grade, students who may work on it, and students who already
-- have an attempt on it in their class (to review a closed lesson).
create or replace function private.can_open_lesson(target text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select private.is_admin()
    or exists (
      select 1 from public.classes c
      join public.class_teachers ct on ct.class_id = c.id
      where c.course_id = private.course_of_lesson(target) and ct.teacher_id = (select auth.uid())
    )
    or private.can_work_lesson(target)
    or exists (
      select 1 from public.class_lessons cl
      join public.profiles p on p.class_id = cl.class_id
      join public.attempts a on a.user_id = p.id and a.lesson_id = cl.lesson_id
      where p.id = (select auth.uid()) and cl.lesson_id = target
    )
$$;

revoke execute on function private.can_work_lesson(text) from public, anon;
grant execute on function private.can_work_lesson(text) to authenticated;

-- Grades one attempt from its saved answers and marks it submitted (shared by submit and close).
create or replace function private.grade_attempt(target uuid)
returns public.attempts
language plpgsql security definer set search_path = ''
as $$
declare
  a public.attempts;
  graded jsonb;
  total integer;
begin
  select * into a from public.attempts where id = target;
  with items as (
    select
      s.score_key || row_number() over (partition by s.id order by i.position) as qid,
      s.type, i.tag, i.options, i.correct_option, i.answers,
      case when s.type = 'order' then coalesce(i.prompt, 'Sắp xếp câu')
        else regexp_replace(coalesce(i.prompt, ''), '<[^>]+>', '', 'g') end as q,
      case s.type
        when 'mcq' then i.options[i.correct_option]
        when 'typed' then i.answers[1]
        else array_to_string(array(select btrim(w) from unnest(i.words) with ordinality u(w, n) order by n), ' ')
      end as correct
    from public.lesson_sections s
    join public.section_items i on i.section_id = s.id
    where s.lesson_id = a.lesson_id and s.score_key is not null
  ), checked as (
    select it.qid, it.q, it.tag, it.correct, a.answers -> it.qid ->> 'given' as given,
      case it.type
        when 'mcq' then (a.answers -> it.qid ->> 'given') = it.correct
        when 'typed' then private.norm_answer(a.answers -> it.qid ->> 'given')
          in (select private.norm_answer(x) from unnest(it.answers) x)
        else private.norm_answer(a.answers -> it.qid ->> 'given')
          in (select private.norm_answer(x) from unnest(array_prepend(it.correct, coalesce(it.answers, '{}'))) x)
      end as ok
    from items it
  )
  select
    coalesce(jsonb_object_agg(qid, jsonb_build_object(
      'ok', coalesce(ok, false), 'q', q, 'given', given, 'correct', coalesce(correct, ''), 'tag', coalesce(tag, '')))
      filter (where coalesce(given, '') <> ''), '{}'::jsonb),
    count(*)::integer
  into graded, total
  from checked;

  insert into public.attempt_results (attempt_id, answers) values (a.id, graded)
  on conflict (attempt_id) do update set answers = excluded.answers, graded_at = now();

  perform set_config('app.attempt_rpc', 'on', true);
  update public.attempts
  set status = 'submitted',
      score = jsonb_build_object(
        'ok', (select count(*) from jsonb_each(graded) e where (e.value ->> 'ok')::boolean),
        'done', (select count(*) from jsonb_each(graded)),
        'total', total)
  where id = a.id
  returning * into a;
  perform set_config('app.attempt_rpc', 'off', true);
  return a;
end;
$$;
revoke execute on function private.grade_attempt(uuid) from public, anon, authenticated;

-- Submit: same as before, but only while the caller may still work on the lesson.
create or replace function public.submit_attempt(lesson text)
returns public.attempts
language plpgsql security definer set search_path = ''
as $$
declare
  a public.attempts;
begin
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
$$;

-- Close (or reopen) a lesson for a class. Closing submits and grades the work still in progress.
create or replace function public.close_class_lesson(target_class uuid, target_lesson text, close_it boolean)
returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  t record;
  n integer := 0;
begin
  if not (private.is_admin() or private.teaches_class(target_class)) then
    raise exception 'Chỉ giáo viên của lớp mới đóng / mở bài được';
  end if;
  update public.class_lessons set closed = close_it where class_id = target_class and lesson_id = target_lesson;
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
$$;
revoke execute on function public.close_class_lesson(uuid, text, boolean) from public, anon;
grant execute on function public.close_class_lesson(uuid, text, boolean) to authenticated;

-- Learners save work only while they may work on the lesson.
create or replace function public.guard_attempt_status()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if (select auth.uid()) is not null
     and current_setting('app.attempt_rpc', true) is distinct from 'on'
     and not private.can_manage_user(new.user_id) then
    if not private.can_work_lesson(new.lesson_id) then
      raise exception 'Bài này đã đóng hoặc chưa mở cho bạn';
    end if;
    if tg_op = 'INSERT' then
      if new.status <> 'in_progress' then
        raise exception 'Hãy dùng nút Nộp bài';
      end if;
      new.score = '{}'::jsonb;
    else
      if old.status <> 'in_progress' then
        raise exception 'Bài đã nộp, không thể sửa hay nộp lại';
      end if;
      if new.status <> old.status then
        raise exception 'Hãy dùng nút Nộp bài';
      end if;
      new.score = old.score;
    end if;
  end if;
  if new.status = 'submitted' and (tg_op = 'INSERT' or old.status is distinct from 'submitted') then
    new.submitted_at = now();
  end if;
  return new;
end;
$$;

-- Taking a lesson back is refused once a student of the class has worked on it.
create or replace function public.guard_class_lesson_removal()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if exists (
    select 1 from public.attempts a
    join public.profiles p on p.id = a.user_id
    where a.lesson_id = old.lesson_id and p.class_id = old.class_id
  ) then
    raise exception 'Học sinh lớp này đã làm bài nên không thu hồi được. Hãy dùng "Đóng bài" để ngừng nhận bài.';
  end if;
  return old;
end;
$$;
create trigger class_lessons_guard_removal
  before delete on public.class_lessons
  for each row execute function public.guard_class_lesson_removal();

-- Row level security -------------------------------------------------------------
alter policy "Create own attempts on open lessons" on public.attempts
  with check (
    user_id = (select auth.uid())
    and (select private.my_role()) in ('student', 'admin')
    and (select private.can_work_lesson(lesson_id))
  );

alter table public.class_lesson_students enable row level security;
create policy "Read own rows, taught classes or any as admin" on public.class_lesson_students
  for select to authenticated
  using ((select public.is_admin()) or (select private.teaches_class(class_id)) or student_id = (select auth.uid()));
create policy "Teachers of the class open lessons to students" on public.class_lesson_students
  for insert to authenticated
  with check (
    ((select public.is_admin()) or (select private.teaches_class(class_id)))
    and exists (select 1 from public.profiles p where p.id = student_id and p.class_id = class_lesson_students.class_id)
  );
create policy "Teachers of the class lock lessons for students" on public.class_lesson_students
  for delete to authenticated
  using ((select public.is_admin()) or (select private.teaches_class(class_id)));
