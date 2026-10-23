-- Teachers create lessons for one of their classes (admins may also create lessons for a whole grade).
--  * lessons.class_id: null = shared lesson of the grade; set = a lesson only that class sees.
--  * Teachers of the class read, write and delete its class lessons; shared lessons stay admin-only to edit.

alter table public.lessons add column class_id uuid references public.classes (id) on delete cascade;
alter table public.lessons add column created_by uuid references public.profiles (id) on delete set null;
comment on column public.lessons.class_id is 'Lớp sở hữu bài (bài riêng do giáo viên tạo). Để trống = bài chung của khối.';
create index lessons_class_idx on public.lessons (class_id);
create index lessons_created_by_idx on public.lessons (created_by);

-- Helpers ----------------------------------------------------------------------
create or replace function private.lesson_class(target text)
returns uuid
language sql stable security definer set search_path = ''
as $$
  select class_id from public.lessons where id = target
$$;

-- A class-only lesson is for its class: admins, the class's teachers and its students. Shared lessons pass.
create or replace function private.in_class(target uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select target is null or private.is_admin() or private.teaches_class(target) or private.my_class_id() = target
$$;

-- Content of shared lessons is edited by admins; class lessons also by the class's teachers.
create or replace function private.can_edit_lesson(target text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select private.is_admin() or exists (
    select 1 from public.lessons l
    where l.id = target and l.class_id is not null and private.teaches_class(l.class_id)
  )
$$;

create or replace function private.lesson_has_attempts(target text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.attempts where lesson_id = target)
$$;

-- Same as before, plus: a class lesson only opens for its own class.
create or replace function private.can_open_lesson(target text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select private.in_class(private.lesson_class(target)) and (
    private.is_admin()
    or exists (
      select 1 from public.classes c
      join public.class_teachers ct on ct.class_id = c.id
      where c.course_id = private.course_of_lesson(target) and ct.teacher_id = (select auth.uid())
    )
    or exists (
      select 1 from public.class_lessons cl
      join public.profiles p on p.class_id = cl.class_id
      where p.id = (select auth.uid()) and cl.lesson_id = target
    )
  )
$$;

create or replace function private.can_teach_lesson(target text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select private.in_class(private.lesson_class(target)) and (
    private.is_admin()
    or exists (
      select 1 from public.classes c
      join public.class_teachers ct on ct.class_id = c.id
      where c.course_id = private.course_of_lesson(target) and ct.teacher_id = (select auth.uid())
    )
  )
$$;

revoke execute on function private.lesson_class(text), private.in_class(uuid), private.can_edit_lesson(text),
  private.lesson_has_attempts(text) from public, anon;
grant execute on function private.lesson_class(text), private.in_class(uuid), private.can_edit_lesson(text),
  private.lesson_has_attempts(text) to authenticated;

-- Row level security -------------------------------------------------------------
alter policy "Read lessons of visible courses" on public.lessons
  using ((select public.is_admin()) or (
    is_published
    and (select private.can_see_course(private.course_of_lesson(id)))
    and (select private.in_class(class_id))
  ));

alter policy "Admins insert lessons" on public.lessons
  with check ((select public.is_admin()) or (
    class_id is not null
    and (select private.teaches_class(class_id))
    and created_by = (select auth.uid())
    and exists (
      select 1 from public.phases ph join public.classes c on c.course_id = ph.course_id
      where ph.id = phase_id and c.id = class_id
    )
  ));
alter policy "Admins insert lessons" on public.lessons rename to "Admins or class teachers insert lessons";

alter policy "Admins update lessons" on public.lessons
  using ((select public.is_admin()) or (class_id is not null and (select private.teaches_class(class_id))))
  with check ((select public.is_admin()) or (
    class_id is not null
    and (select private.teaches_class(class_id))
    and exists (
      select 1 from public.phases ph join public.classes c on c.course_id = ph.course_id
      where ph.id = phase_id and c.id = class_id
    )
  ));
alter policy "Admins update lessons" on public.lessons rename to "Admins or class teachers update lessons";

alter policy "Admins delete lessons" on public.lessons
  using ((select public.is_admin()) or (class_id is not null and (select private.teaches_class(class_id))));
alter policy "Admins delete lessons" on public.lessons rename to "Admins or class teachers delete lessons";

alter policy "Admins insert sections" on public.lesson_sections
  with check ((select private.can_edit_lesson(lesson_id)));
alter policy "Admins insert sections" on public.lesson_sections rename to "Lesson editors insert sections";
alter policy "Admins update sections" on public.lesson_sections
  using ((select private.can_edit_lesson(lesson_id)))
  with check ((select private.can_edit_lesson(lesson_id)));
alter policy "Admins update sections" on public.lesson_sections rename to "Lesson editors update sections";
alter policy "Admins delete sections" on public.lesson_sections
  using ((select private.can_edit_lesson(lesson_id)));
alter policy "Admins delete sections" on public.lesson_sections rename to "Lesson editors delete sections";

alter policy "Admins insert items" on public.section_items
  with check (exists (
    select 1 from public.lesson_sections s where s.id = section_id and (select private.can_edit_lesson(s.lesson_id))
  ));
alter policy "Admins insert items" on public.section_items rename to "Lesson editors insert items";
alter policy "Admins update items" on public.section_items
  using (exists (
    select 1 from public.lesson_sections s where s.id = section_id and (select private.can_edit_lesson(s.lesson_id))
  ))
  with check (exists (
    select 1 from public.lesson_sections s where s.id = section_id and (select private.can_edit_lesson(s.lesson_id))
  ));
alter policy "Admins update items" on public.section_items rename to "Lesson editors update items";
alter policy "Admins delete items" on public.section_items
  using (exists (
    select 1 from public.lesson_sections s where s.id = section_id and (select private.can_edit_lesson(s.lesson_id))
  ));
alter policy "Admins delete items" on public.section_items rename to "Lesson editors delete items";

-- A class lesson can only be opened for its own class.
alter policy "Teachers of the class unlock lessons" on public.class_lessons
  with check (
    ((select public.is_admin()) or (select private.teaches_class(class_id)))
    and unlocked_by = (select auth.uid())
    and coalesce((select private.lesson_class(lesson_id)) = class_id, true)
  );

-- Lists show which class a lesson belongs to.
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
  l.class_id
from public.lessons l
join public.phases p on p.id = l.phase_id;
