-- The class page hides "Thu hồi" (take back) once any student of the class has opened a lesson: the
-- class_lessons_guard_removal trigger refuses the delete as soon as an attempt exists, even one still in
-- progress. class_lesson_stats only counted submitted work, so it gains `started`: every attempt of the
-- class's students on the lesson, in progress or not. Appended last, so existing columns keep their order.

create or replace view public.class_lesson_stats with (security_invoker = true) as
select p.class_id,
  t.lesson_id,
  count(*) filter (where t.status <> 'in_progress'::attempt_status)::integer as submitted,
  count(*) filter (where t.status = 'submitted'::attempt_status)::integer as waiting,
  coalesce(sum((t.score ->> 'ok'::text)::integer), 0::bigint)::integer as ok,
  coalesce(sum((t.score ->> 'done'::text)::integer), 0::bigint)::integer as done,
  count(*)::integer as started
from public.attempts t
join public.profiles p on p.id = t.user_id
where p.class_id is not null and p.role = 'student'::app_role
group by p.class_id, t.lesson_id;
