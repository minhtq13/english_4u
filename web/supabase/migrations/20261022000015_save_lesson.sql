-- save_lesson(): writes a lesson with all its sections and items in one transaction (see 20261022000014).
-- Saving a lesson ------------------------------------------------------------------
-- Security invoker on purpose: every write goes through the RLS policies above, so the caller
-- can only save lessons they may edit. Lessons someone has already done keep their questions.
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

  insert into public.lessons (id, phase_id, position, label, title, description, heading, subtitle, class_id, created_by)
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
    nullif(lesson ->> 'class_id', '')::uuid,
    (select auth.uid())
  )
  on conflict (id) do update set
    phase_id = excluded.phase_id,
    label = excluded.label,
    title = excluded.title,
    description = excluded.description,
    heading = excluded.heading,
    subtitle = excluded.subtitle,
    class_id = excluded.class_id
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
revoke execute on function public.save_lesson(jsonb) from public, anon;
grant execute on function public.save_lesson(jsonb) to authenticated;

