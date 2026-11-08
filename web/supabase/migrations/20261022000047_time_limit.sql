-- Timed lessons. A teacher may give a lesson a time limit in minutes (class_lessons.time_limit_min). The clock is
-- the database's: it starts when the student first saves (attempts.timer_started_at, set on insert and again when the
-- teacher lets them redo), and once it runs out private.can_work_lesson() refuses every write and submit, which the
-- attempts guard and submit_attempt() already check. The job submit-timed-out grades the work in progress each minute.

alter table public.class_lessons
  add column time_limit_min integer check (time_limit_min is null or time_limit_min between 1 and 300);
comment on column public.class_lessons.time_limit_min is 'Minutes a student has once they start (first save); null = no limit.';

alter table public.attempts add column timer_started_at timestamptz not null default now();
comment on column public.attempts.timer_started_at is 'When the clock of a timed lesson started: first save, or the last redo.';

create or replace function private.reset_attempt_timer()
 returns trigger
 language plpgsql
 set search_path to ''
as $function$
begin
  if old.status is distinct from 'in_progress' and new.status = 'in_progress' then
    new.timer_started_at = now();
  end if;
  return new;
end;
$function$;
revoke execute on function private.reset_attempt_timer() from public, anon, authenticated;

create trigger attempts_reset_timer before update of status on public.attempts
  for each row execute function private.reset_attempt_timer();

create or replace function private.can_work_lesson(target text)
 returns boolean
 language sql
 stable
 security definer
 set search_path to ''
as $function$
  select private.is_admin() or exists (
    select 1 from public.class_lessons cl
    join public.profiles p on p.class_id = cl.class_id
    where p.id = (select auth.uid()) and cl.lesson_id = target and not cl.closed
      and (cl.due_at is null or now() < cl.due_at)
      and (cl.for_all or exists (
        select 1 from public.class_lesson_students s
        where s.class_id = cl.class_id and s.lesson_id = cl.lesson_id and s.student_id = p.id
      ))
      and (cl.time_limit_min is null or not exists (
        select 1 from public.attempts a
        where a.user_id = p.id and a.lesson_id = cl.lesson_id and a.status = 'in_progress'
          and now() >= a.timer_started_at + make_interval(mins => cl.time_limit_min)
      ))
  )
$function$;

create or replace function private.submit_timed_out()
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  t record;
  n integer := 0;
begin
  for t in
    select a.id from public.attempts a
    join public.profiles p on p.id = a.user_id
    join public.class_lessons cl on cl.class_id = p.class_id and cl.lesson_id = a.lesson_id
    where a.status = 'in_progress' and cl.time_limit_min is not null
      and now() >= a.timer_started_at + make_interval(mins => cl.time_limit_min)
      and (a.answers <> '{}'::jsonb or btrim(a.writing) <> '')
  loop
    perform private.grade_attempt(t.id);
    n := n + 1;
  end loop;
  return n;
end;
$function$;
revoke execute on function private.submit_timed_out() from public, anon, authenticated;

select cron.schedule('submit-timed-out', '* * * * *', 'select private.submit_timed_out()');
