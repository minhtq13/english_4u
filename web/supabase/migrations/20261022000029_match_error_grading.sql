-- Matching and error-identification sections: scored, validated, answer key hidden, graded on the server.
-- match: one pair per item, left = prompt, right = back. Learners pick the right side from all rights of the
--        section, which lesson_items() returns shuffled in options; back stays hidden until results are released.
-- error: a sentence split into chunks (options), the wrong chunk is correct_option; graded like mcq.
-- mcq / typed sections may also carry a shared reading passage in body (no schema change needed).

alter table public.lesson_sections
  drop constraint score_key_for_scored_types,
  add constraint score_key_for_scored_types
    check ((type in ('mcq', 'typed', 'order', 'match', 'error')) = (score_key is not null));

create or replace function public.validate_section_item()
returns trigger
language plpgsql set search_path = ''
as $$
declare
  t public.section_type;
begin
  select type into t from public.lesson_sections where id = new.section_id;
  if t in ('explain', 'writing') then
    raise exception 'Section loại % không có câu hỏi', t;
  elsif t = 'cards' then
    if coalesce(new.prompt, '') = '' or coalesce(new.back, '') = '' then
      raise exception 'Flashcard cần prompt (mặt trước) và back (mặt sau)';
    end if;
  elsif t = 'match' then
    if coalesce(new.prompt, '') = '' or coalesce(new.back, '') = '' then
      raise exception 'Câu nối cần cả vế trái và vế phải';
    end if;
  elsif t in ('mcq', 'error') then
    if t = 'mcq' and coalesce(new.prompt, '') = '' then raise exception 'Câu trắc nghiệm cần prompt'; end if;
    if coalesce(array_length(new.options, 1), 0) < 2 then
      raise exception '% cần ít nhất 2 lựa chọn', case t when 'mcq' then 'Câu trắc nghiệm' else 'Câu tìm lỗi sai' end;
    end if;
    if new.correct_option is null or new.correct_option < 1 or new.correct_option > array_length(new.options, 1) then
      raise exception 'correct_option phải từ 1 đến % (số lựa chọn)', array_length(new.options, 1);
    end if;
    if t = 'error' and (select count(distinct btrim(o)) from unnest(new.options) o) < array_length(new.options, 1) then
      raise exception 'Các cụm trong câu tìm lỗi sai không được trùng nhau';
    end if;
  elsif t = 'typed' then
    if coalesce(new.prompt, '') = '' then raise exception 'Câu tự luận cần prompt'; end if;
    if coalesce(array_length(new.answers, 1), 0) < 1 then raise exception 'Câu tự luận cần ít nhất 1 đáp án trong answers'; end if;
  elsif t = 'order' then
    if coalesce(array_length(new.words, 1), 0) < 2 then raise exception 'Câu sắp xếp cần ít nhất 2 cụm trong words'; end if;
  end if;
  return new;
end;
$$;

create or replace function public.lesson_items(lesson text)
returns setof public.section_items
language plpgsql stable security definer set search_path = ''
as $$
declare
  reveal boolean;
begin
  if not private.can_open_lesson(lesson) then
    return;
  end if;
  reveal := private.can_teach_lesson(lesson) or exists (
    select 1 from public.attempts a
    where a.lesson_id = lesson and a.user_id = (select auth.uid()) and private.results_released(a.id)
  );
  return query
  select
    i.id, i.section_id, i.position, i.prompt,
    case when s.type = 'match' and not reveal then null else i.back end,
    case when s.type = 'match' then array(
        select i2.back from public.section_items i2 where i2.section_id = i.section_id order by md5(i2.id::text))
      else i.options end,
    case when reveal then i.correct_option end,
    case
      when not reveal then null
      when s.type = 'order' then array_prepend(
        array_to_string(array(select btrim(w) from unnest(i.words) with ordinality u(w, n) order by n), ' '),
        coalesce(i.answers, '{}'))
      else i.answers
    end,
    case when i.words is null then null
      else array(select w from unnest(i.words) with ordinality u(w, n) order by md5(i.id::text || n::text)) end,
    case when reveal then i.explanation end,
    i.tag
  from public.section_items i
  join public.lesson_sections s on s.id = i.section_id
  where s.lesson_id = lesson;
end;
$$;

create or replace function private.grade_attempt(target uuid)
returns public.attempts
language plpgsql security definer set search_path = ''
as $$
declare
  a public.attempts;
  graded jsonb;
  total integer;
begin
  select * into a from public.attempts where id = target;
  with items as (
    select
      s.score_key || row_number() over (partition by s.id order by i.position) as qid,
      s.type, i.tag, i.options, i.correct_option, i.answers,
      case s.type
        when 'order' then coalesce(i.prompt, 'Sắp xếp câu')
        when 'error' then array_to_string(i.options, ' ')
        else regexp_replace(coalesce(i.prompt, ''), '<[^>]+>', '', 'g')
      end as q,
      case s.type
        when 'mcq' then i.options[i.correct_option]
        when 'error' then i.options[i.correct_option]
        when 'typed' then i.answers[1]
        when 'match' then i.back
        else array_to_string(array(select btrim(w) from unnest(i.words) with ordinality u(w, n) order by n), ' ')
      end as correct
    from public.lesson_sections s
    join public.section_items i on i.section_id = s.id
    where s.lesson_id = a.lesson_id and s.score_key is not null
  ), checked as (
    select it.qid, it.q, it.tag, it.correct, a.answers -> it.qid ->> 'given' as given,
      case it.type
        when 'mcq' then (a.answers -> it.qid ->> 'given') = it.correct
        when 'error' then (a.answers -> it.qid ->> 'given') = it.correct
        when 'match' then private.norm_answer(a.answers -> it.qid ->> 'given') = private.norm_answer(it.correct)
        when 'typed' then private.norm_answer(a.answers -> it.qid ->> 'given')
          in (select private.norm_answer(x) from unnest(it.answers) x)
        else private.norm_answer(a.answers -> it.qid ->> 'given')
          in (select private.norm_answer(x) from unnest(array_prepend(it.correct, coalesce(it.answers, '{}'))) x)
      end as ok
    from items it
  )
  select
    coalesce(jsonb_object_agg(qid, jsonb_build_object(
      'ok', coalesce(ok, false), 'q', q, 'given', given, 'correct', coalesce(correct, ''), 'tag', coalesce(tag, '')))
      filter (where coalesce(given, '') <> ''), '{}'::jsonb),
    count(*)::integer
  into graded, total
  from checked;

  insert into public.attempt_results (attempt_id, answers) values (a.id, graded)
  on conflict (attempt_id) do update set answers = excluded.answers, graded_at = now();

  perform set_config('app.attempt_rpc', 'on', true);
  update public.attempts
  set status = 'submitted',
      score = jsonb_build_object(
        'ok', (select count(*) from jsonb_each(graded) e where (e.value ->> 'ok')::boolean),
        'done', (select count(*) from jsonb_each(graded)),
        'total', total)
  where id = a.id
  returning * into a;
  perform set_config('app.attempt_rpc', 'off', true);
  return a;
end;
$$;
revoke execute on function private.grade_attempt(uuid) from public, anon, authenticated;

-- The question bank offers the new scored types too; back (the right side of a pair) is appended.
create or replace view public.question_bank
with (security_invoker = true) as
select i.id, s.type, i.prompt, i.options, i.correct_option, i.answers, i.words, i.explanation, i.tag,
  l.id as lesson_id, l.label as lesson_label, l.title as lesson_title, ph.course_id, i.back
from public.section_items i
join public.lesson_sections s on s.id = i.section_id
join public.lessons l on l.id = s.lesson_id
join public.phases ph on ph.id = l.phase_id
where s.type in ('mcq', 'typed', 'order', 'match', 'error');
