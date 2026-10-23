-- Who still owes work: for every lesson open to a class (not closed), the active students it is open to
-- (whole class, or only the students picked in class_lesson_students) without a submitted attempt.
-- security_invoker: teachers see their classes, admins every class.
create view public.class_missing_work
with (security_invoker = true) as
select
  cl.class_id,
  cl.lesson_id,
  cl.due_at,
  p.id as user_id,
  p.full_name,
  p.username,
  (a.id is not null) as started
from public.class_lessons cl
join public.profiles p on p.class_id = cl.class_id and p.role = 'student' and p.active
left join public.attempts a on a.user_id = p.id and a.lesson_id = cl.lesson_id
where not cl.closed
  and (a.id is null or a.status = 'in_progress')
  and (cl.for_all or exists (
    select 1 from public.class_lesson_students s
    where s.class_id = cl.class_id and s.lesson_id = cl.lesson_id and s.student_id = p.id
  ));
