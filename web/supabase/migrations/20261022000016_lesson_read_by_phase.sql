-- The lessons read policy looked up the course through the lesson id (private.course_of_lesson), which finds
-- nothing for a row being inserted. INSERT … ON CONFLICT DO UPDATE (save_lesson) also checks the read policy
-- on the new row, so teachers could not create lessons. Look the course up through the row's own phase.

create or replace function private.course_of_phase(target smallint)
returns text
language sql stable security definer set search_path = ''
as $$
  select course_id from public.phases where id = target
$$;
revoke execute on function private.course_of_phase(smallint) from public, anon;
grant execute on function private.course_of_phase(smallint) to authenticated;

alter policy "Read lessons of visible courses" on public.lessons
  using ((select public.is_admin()) or (
    is_published
    and (select private.can_see_course(private.course_of_phase(phase_id)))
    and (select private.in_class(class_id))
  ));
