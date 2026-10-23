-- Drop columns nothing uses any more:
--  * profiles.course_id: replaced by the class's course (profiles.class_id → classes.course_id).
--  * lessons.class_id: lessons belong to a grade and reach classes through class_lessons (migration 000018).
-- Every function, policy and view that still mentioned them is rewritten first; the helper functions
-- that only existed for lessons.class_id (private.lesson_class, private.in_class) go too.
-- Contains DROP and a function with DELETE, so it is run in Supabase Dashboard → SQL Editor.

begin;

-- 1. Permission helpers without the class-lesson check ---------------------------
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
    or exists (
      select 1 from public.class_lessons cl
      join public.profiles p on p.class_id = cl.class_id
      where p.id = (select auth.uid()) and cl.lesson_id = target
    )
$$;

create or replace function private.can_teach_lesson(target text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select private.is_admin()
    or exists (
      select 1 from public.classes c
      join public.class_teachers ct on ct.class_id = c.id
      where c.course_id = private.course_of_lesson(target) and ct.teacher_id = (select auth.uid())
    )
$$;

-- 2. Policies ---------------------------------------------------------------------
alter policy "Admins or grade teachers insert lessons" on public.lessons
  with check ((select public.is_admin()) or (
    created_by = (select auth.uid())
    and (select private.teaches_course(private.course_of_phase(phase_id)))
  ));

alter policy "Admins or lesson authors update lessons" on public.lessons
  using ((select public.is_admin()) or created_by = (select auth.uid()))
  with check ((select public.is_admin()) or (
    created_by = (select auth.uid())
    and (select private.teaches_course(private.course_of_phase(phase_id)))
  ));

alter policy "Teachers of the class unlock lessons" on public.class_lessons
  with check (
    ((select public.is_admin()) or (select private.teaches_class(class_id)))
    and unlocked_by = (select auth.uid())
  );

-- 3. Views ------------------------------------------------------------------------
-- Errors without a lesson count towards the learner's class's grade (was profiles.course_id).
create or replace view public.course_error_stats
with (security_invoker = true) as
select
  coalesce(ph.course_id, c.course_id) as course_id,
  e.category,
  e.status,
  count(*)::integer as entries,
  sum(e.occurrences)::integer as occurrences
from public.error_log e
join public.profiles p on p.id = e.user_id
left join public.classes c on c.id = p.class_id
left join public.lessons l on l.id = e.lesson_id
left join public.phases ph on ph.id = l.phase_id
group by coalesce(ph.course_id, c.course_id), e.category, e.status;

-- lesson_overview loses its class_id column, which a view replace cannot do: rebuild it and lesson_stats.
drop view public.lesson_stats;
drop view public.lesson_overview;

create view public.lesson_overview
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
  l.created_by
from public.lessons l
join public.phases p on p.id = l.phase_id;

create view public.lesson_stats
with (security_invoker = true) as
select
  o.id as lesson_id,
  o.course_id,
  o.label,
  o.title,
  o.position,
  o.scored_items,
  count(a.id)::integer as learners,
  (count(a.id) filter (where a.status <> 'in_progress'))::integer as completed,
  (count(a.id) filter (where a.status = 'submitted'))::integer as waiting,
  (count(a.id) filter (where a.status = 'graded'))::integer as graded,
  round(100.0 * sum(coalesce((a.score ->> 'ok')::integer, 0))
        / nullif(sum(coalesce((a.score ->> 'done')::integer, 0)), 0))::integer as accuracy
from public.lesson_overview o
left join public.attempts a on a.lesson_id = o.id
group by o.id, o.course_id, o.label, o.title, o.position, o.scored_items;

grant select on public.lesson_overview, public.lesson_stats to authenticated;

-- 4. save_lesson without class_id -------------------------------------------------
create or replace function public.save_lesson(lesson jsonb)
returns text
language plpgsql security invoker set search_path = ''
as $$
declare
  lid text := nullif(btrim(lesson ->> 'id'), '');
  pid smallint := (lesson ->> 'phase_id')::smallint;
  sec jsonb;
  si bigint;
  item jsonb;
  ii bigint;
  sid uuid;
begin
  if lid is null then
    raise exception 'Thiếu mã bài';
  end if;
  if pid is null then
    raise exception 'Hãy chọn học kỳ / giai đoạn cho bài';
  end if;
  if coalesce(btrim(lesson ->> 'title'), '') = '' then
    raise exception 'Bài cần có tên';
  end if;
  if jsonb_typeof(lesson -> 'sections') <> 'array' or jsonb_array_length(lesson -> 'sections') = 0 then
    raise exception 'Bài cần ít nhất một phần';
  end if;
  if private.lesson_has_attempts(lid) then
    raise exception 'Bài đã có học sinh làm nên không sửa được câu hỏi. Hãy tạo bài mới.';
  end if;

  insert into public.lessons (id, phase_id, position, label, title, description, heading, subtitle, created_by)
  values (
    lid,
    pid,
    coalesce((lesson ->> 'position')::integer,
      (select coalesce(max(l.position), 0) + 10 from public.lessons l where l.phase_id = pid)),
    coalesce(nullif(btrim(lesson ->> 'label'), ''), lid),
    btrim(lesson ->> 'title'),
    coalesce(lesson ->> 'description', ''),
    coalesce(nullif(btrim(lesson ->> 'heading'), ''), btrim(lesson ->> 'title')),
    coalesce(lesson ->> 'subtitle', ''),
    (select auth.uid())
  )
  on conflict (id) do update set
    phase_id = excluded.phase_id,
    label = excluded.label,
    title = excluded.title,
    description = excluded.description,
    heading = excluded.heading,
    subtitle = excluded.subtitle
  where public.lessons.id = lid;

  delete from public.lesson_sections where lesson_id = lid;

  for sec, si in select e.value, e.ordinality from jsonb_array_elements(lesson -> 'sections') with ordinality e loop
    insert into public.lesson_sections
      (lesson_id, position, type, score_key, title, time_label, hint, body, placeholder, short_input)
    values (
      lid, si, (sec ->> 'type')::public.section_type, nullif(sec ->> 'score_key', ''),
      coalesce(nullif(btrim(sec ->> 'title'), ''), 'Phần ' || si),
      nullif(sec ->> 'time_label', ''), nullif(sec ->> 'hint', ''), nullif(sec ->> 'body', ''),
      nullif(sec ->> 'placeholder', ''), coalesce((sec ->> 'short_input')::boolean, false)
    )
    returning id into sid;

    for item, ii in select e.value, e.ordinality from jsonb_array_elements(coalesce(sec -> 'items', '[]'::jsonb)) with ordinality e loop
      insert into public.section_items
        (section_id, position, prompt, back, options, correct_option, answers, words, explanation, tag)
      values (
        sid, ii, nullif(item ->> 'prompt', ''), nullif(item ->> 'back', ''),
        case when jsonb_typeof(item -> 'options') = 'array' and jsonb_array_length(item -> 'options') > 0
          then array(select jsonb_array_elements_text(item -> 'options')) end,
        (item ->> 'correct_option')::smallint,
        case when jsonb_typeof(item -> 'answers') = 'array' and jsonb_array_length(item -> 'answers') > 0
          then array(select jsonb_array_elements_text(item -> 'answers')) end,
        case when jsonb_typeof(item -> 'words') = 'array' and jsonb_array_length(item -> 'words') > 0
          then array(select jsonb_array_elements_text(item -> 'words')) end,
        nullif(item ->> 'explanation', ''), nullif(item ->> 'tag', '')
      );
    end loop;
  end loop;
  return lid;
end;
$$;

-- 5. The columns and their leftovers (indexes and foreign keys go with the columns) --
drop function private.lesson_class(text);
drop function private.in_class(uuid);
alter table public.lessons drop column class_id;
alter table public.profiles drop column course_id;

commit;
