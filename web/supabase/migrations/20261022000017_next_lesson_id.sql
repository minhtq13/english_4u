-- Lesson ids follow the curriculum pattern checked by lessons_id_check ("6.1", "19.2", "33").
-- Lessons made in the editor get the next free id of their course: grades use <grade>.101, .102, …
-- (units 1–99 stay free for the textbook), tracks use the next whole number. Security definer so the
-- count includes lessons the caller cannot see (other classes' lessons).

create or replace function public.next_lesson_id(course text)
returns text
language sql stable security definer set search_path = ''
as $$
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
  where k.id = course and (private.is_admin() or private.can_see_course(course))
$$;
revoke execute on function public.next_lesson_id(text) from public, anon;
grant execute on function public.next_lesson_id(text) to authenticated;
