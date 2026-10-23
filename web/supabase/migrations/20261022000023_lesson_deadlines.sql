-- Deadlines: a lesson given to a class can have a due time (class_lessons.due_at).
--  * From that moment students can no longer start, save or submit (can_work_lesson checks it), so the
--    deadline holds to the second without waiting for any job.
--  * A pg_cron job then closes the lesson like "Đóng bài": every minute it marks lessons past due as
--    closed and submits/grades the attempts still in progress.
--  * Reopening a lesson whose deadline has passed clears the deadline (the teacher can set a new one).

alter table public.class_lessons add column due_at timestamptz;
comment on column public.class_lessons.due_at is 'Hạn nộp. Hết hạn: học sinh không làm tiếp được, bài tự đóng và bài làm dở được nộp.';
create index class_lessons_due_idx on public.class_lessons (due_at) where due_at is not null and not closed;

create or replace function private.can_work_lesson(target text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select private.is_admin() or exists (
    select 1 from public.class_lessons cl
    join public.profiles p on p.class_id = cl.class_id
    where p.id = (select auth.uid()) and cl.lesson_id = target and not cl.closed
      and (cl.due_at is null or now() < cl.due_at)
      and (cl.for_all or exists (
        select 1 from public.class_lesson_students s
        where s.class_id = cl.class_id and s.lesson_id = cl.lesson_id and s.student_id = p.id
      ))
  )
$$;

-- Closing submits work in progress; reopening after the deadline clears it.
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
$$;

-- Run by pg_cron: close every lesson past its deadline and submit the work in progress.
create or replace function private.close_due_lessons()
returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  cl record;
  t record;
  n integer := 0;
begin
  for cl in
    update public.class_lessons set closed = true
    where due_at is not null and due_at <= now() and not closed
    returning class_id, lesson_id
  loop
    for t in
      select a.id from public.attempts a
      join public.profiles p on p.id = a.user_id
      where a.lesson_id = cl.lesson_id and p.class_id = cl.class_id and a.status = 'in_progress'
        and (a.answers <> '{}'::jsonb or btrim(a.writing) <> '')
    loop
      perform private.grade_attempt(t.id);
      n := n + 1;
    end loop;
  end loop;
  return n;
end;
$$;
revoke execute on function private.close_due_lessons() from public, anon, authenticated;

create extension if not exists pg_cron;
select cron.schedule('close-due-lessons', '* * * * *', 'select private.close_due_lessons()');
