-- Lessons belong to a grade, not a class. A new lesson is assigned to no class; a teacher assigns it
-- to a class (a row in class_lessons), and only then does that class see it and do it.
--  * Students read a lesson row only when it is assigned to their class (no locked titles any more).
--  * Teachers read every lesson of the grades they teach, and create lessons in those grades.
--  * A teacher edits and deletes the lessons they created; admins edit everything.
--  * lessons.class_id is no longer used: existing class lessons become grade lessons (their class keeps them).

-- Helpers ----------------------------------------------------------------------
create or replace function private.teaches_course(target text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.classes c
    join public.class_teachers ct on ct.class_id = c.id
    where c.course_id = target and ct.teacher_id = (select auth.uid())
  )
$$;

-- Admins, or the teacher who created the lesson while still teaching that grade.
create or replace function private.can_edit_lesson(target text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select private.is_admin() or exists (
    select 1 from public.lessons l
    where l.id = target and l.created_by = (select auth.uid())
      and private.teaches_course(private.course_of_phase(l.phase_id))
  )
$$;

revoke execute on function private.teaches_course(text) from public, anon;
grant execute on function private.teaches_course(text) to authenticated;

-- Existing class lessons become grade lessons; the class they were made for already has them assigned.
insert into public.class_lessons (class_id, lesson_id, unlocked_by)
select l.class_id, l.id, l.created_by from public.lessons l where l.class_id is not null
on conflict (class_id, lesson_id) do nothing;
update public.lessons set class_id = null where class_id is not null;
comment on column public.lessons.class_id is 'Không còn dùng: bài thuộc khối, gán cho lớp qua class_lessons.';

-- Row level security -------------------------------------------------------------
alter policy "Read lessons of visible courses" on public.lessons
  using ((select public.is_admin()) or (
    is_published and (
      (select private.teaches_course(private.course_of_phase(phase_id)))
      or exists (
        select 1 from public.class_lessons cl
        where cl.lesson_id = lessons.id and cl.class_id = (select private.my_class_id())
      )
    )
  ));
alter policy "Read lessons of visible courses" on public.lessons rename to "Read lessons of taught grades or assigned to own class";

alter policy "Admins or class teachers insert lessons" on public.lessons
  with check ((select public.is_admin()) or (
    class_id is null
    and created_by = (select auth.uid())
    and (select private.teaches_course(private.course_of_phase(phase_id)))
  ));
alter policy "Admins or class teachers insert lessons" on public.lessons rename to "Admins or grade teachers insert lessons";

alter policy "Admins or class teachers update lessons" on public.lessons
  using ((select public.is_admin()) or created_by = (select auth.uid()))
  with check ((select public.is_admin()) or (
    class_id is null
    and created_by = (select auth.uid())
    and (select private.teaches_course(private.course_of_phase(phase_id)))
  ));
alter policy "Admins or class teachers update lessons" on public.lessons rename to "Admins or lesson authors update lessons";

alter policy "Admins or class teachers delete lessons" on public.lessons
  using ((select public.is_admin()) or created_by = (select auth.uid()));
alter policy "Admins or class teachers delete lessons" on public.lessons rename to "Admins or lesson authors delete lessons";

-- Lists show who made a lesson (the editor offers "Sửa" to its author).
create or replace view public.lesson_overview
with (security_invoker = true) as
select
  l.id,
  l.phase_id,
  l.position,
  l.title,
  l.description,
  l.is_published,
  private.scored_items(l.id) as scored_items,
  l.label,
  p.course_id,
  l.class_id,
  l.created_by
from public.lessons l
join public.phases p on p.id = l.phase_id;
