-- Aggregates computed in the database so pages fetch a few numbers instead of whole tables
-- (free-tier friendly: less egress, fewer rows over the wire). All views are security_invoker,
-- so RLS still decides which rows each reader counts: teachers get their classes, admins everything.

-- Indexes for the paginated lists and filters -----------------------------------
-- Grading queue: submitted attempts, oldest first.
create index if not exists attempts_waiting_idx on public.attempts (submitted_at) where status = 'submitted';
-- Recent activity and "last 7 days" counts.
create index if not exists attempts_updated_idx on public.attempts (updated_at desc);
-- One learner's history, newest first.
create index if not exists attempts_user_updated_idx on public.attempts (user_id, updated_at desc);
-- Users page: filter by role, newest first.
create index if not exists profiles_role_created_idx on public.profiles (role, created_at desc);
-- Open errors per learner.
create index if not exists error_log_user_status_idx on public.error_log (user_id, status);
-- Feedback of one attempt, newest first.
create index if not exists feedback_attempt_created_idx on public.feedback (attempt_id, created_at desc);

-- Per grade/track: dashboard rows ------------------------------------------------
create view public.course_summary
with (security_invoker = true) as
select
  k.id as course_id,
  k.name,
  k.kind,
  k.position,
  (select count(*) from public.classes c where c.course_id = k.id)::integer as classes,
  (select count(*) from public.profiles p join public.classes c on c.id = p.class_id
    where c.course_id = k.id and p.role = 'student')::integer as students,
  (select count(*) from public.lessons l join public.phases ph on ph.id = l.phase_id
    where ph.course_id = k.id)::integer as lessons,
  a.attempts, a.completed, a.waiting, a.ok, a.done, a.active
from public.courses k
cross join lateral (
  select
    count(*)::integer as attempts,
    (count(*) filter (where t.status <> 'in_progress'))::integer as completed,
    (count(*) filter (where t.status = 'submitted'))::integer as waiting,
    coalesce(sum((t.score ->> 'ok')::integer), 0)::integer as ok,
    coalesce(sum((t.score ->> 'done')::integer), 0)::integer as done,
    (count(distinct t.user_id) filter (where t.updated_at >= now() - interval '7 days'))::integer as active
  from public.attempts t
  join public.lessons l on l.id = t.lesson_id
  join public.phases ph on ph.id = l.phase_id
  where ph.course_id = k.id
) a;

-- Per class: teacher home, grade statistics, class admin ---------------------------
create view public.class_overview
with (security_invoker = true) as
select
  c.id as class_id,
  c.course_id,
  c.name,
  c.join_code,
  (select count(*) from public.profiles p where p.class_id = c.id and p.role = 'student')::integer as students,
  (select count(*) from public.class_lessons cl where cl.class_id = c.id)::integer as unlocked,
  a.waiting, a.ok, a.done, a.active
from public.classes c
cross join lateral (
  select
    (count(*) filter (where t.status = 'submitted'))::integer as waiting,
    coalesce(sum((t.score ->> 'ok')::integer), 0)::integer as ok,
    coalesce(sum((t.score ->> 'done')::integer), 0)::integer as done,
    (count(distinct t.user_id) filter (where t.updated_at >= now() - interval '7 days'))::integer as active
  from public.attempts t
  join public.profiles p on p.id = t.user_id
  where p.class_id = c.id and p.role = 'student'
) a;

-- Per student in a class: class page and grade statistics (paginated) ----------------
create view public.student_progress
with (security_invoker = true) as
select
  p.id as user_id,
  p.full_name,
  p.email,
  p.class_id,
  c.name as class_name,
  c.course_id,
  a.submitted, a.waiting, a.ok, a.done, a.last_activity,
  (select count(*) from public.error_log e where e.user_id = p.id and e.status <> 'fixed')::integer as open_errors
from public.profiles p
join public.classes c on c.id = p.class_id
cross join lateral (
  select
    (count(*) filter (where t.status <> 'in_progress'))::integer as submitted,
    (count(*) filter (where t.status = 'submitted'))::integer as waiting,
    coalesce(sum((t.score ->> 'ok')::integer), 0)::integer as ok,
    coalesce(sum((t.score ->> 'done')::integer), 0)::integer as done,
    max(t.updated_at) as last_activity
  from public.attempts t
  where t.user_id = p.id
) a
where p.role = 'student';

-- Per class and lesson: the lesson table on the class page ---------------------------
create view public.class_lesson_stats
with (security_invoker = true) as
select
  p.class_id,
  t.lesson_id,
  (count(*) filter (where t.status <> 'in_progress'))::integer as submitted,
  (count(*) filter (where t.status = 'submitted'))::integer as waiting,
  coalesce(sum((t.score ->> 'ok')::integer), 0)::integer as ok,
  coalesce(sum((t.score ->> 'done')::integer), 0)::integer as done
from public.attempts t
join public.profiles p on p.id = t.user_id
where p.class_id is not null and p.role = 'student'
group by p.class_id, t.lesson_id;
