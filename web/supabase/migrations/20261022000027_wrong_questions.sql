-- Review worksheets from mistakes: the auto-graded questions a class (or one student) got wrong in the
-- chosen lessons, with how many students got each wrong, most-missed first, and the question itself so
-- the teacher can build a review lesson from them. Graded answers (attempt_results) are keyed by
-- score_key + question number; the number is the item's position order within its section.
-- security invoker: the caller's RLS decides (teachers: their own students and their grades' questions).
create or replace function public.wrong_questions(target_class uuid, target_lessons text[], target_student uuid default null)
returns table (
  item_id uuid, lesson_id text, type public.section_type, qid text, wrong integer, answered integer,
  prompt text, back text, options text[], correct_option smallint, answers text[], words text[], explanation text, tag text
)
language sql stable security invoker set search_path = ''
as $$
  with items as (
    select i.*, s.type as section_type, s.lesson_id as item_lesson,
      s.score_key || row_number() over (partition by s.id order by i.position) as item_qid
    from public.section_items i
    join public.lesson_sections s on s.id = i.section_id
    where s.lesson_id = any (target_lessons) and s.score_key is not null
  ), results as (
    select a.lesson_id as res_lesson, r.key as res_qid, coalesce((r.value ->> 'ok')::boolean, false) as ok
    from public.attempts a
    join public.profiles p on p.id = a.user_id
    join public.attempt_results ar on ar.attempt_id = a.id
    cross join lateral jsonb_each(ar.answers) r
    where p.class_id = target_class and a.lesson_id = any (target_lessons)
      and (target_student is null or a.user_id = target_student)
  )
  select it.id, it.item_lesson, it.section_type, it.item_qid,
    (count(*) filter (where not res.ok))::integer, count(*)::integer,
    it.prompt, it.back, it.options, it.correct_option, it.answers, it.words, it.explanation, it.tag
  from items it
  join results res on res.res_lesson = it.item_lesson and res.res_qid = it.item_qid
  group by it.id, it.item_lesson, it.section_type, it.item_qid, it.prompt, it.back, it.options, it.correct_option,
    it.answers, it.words, it.explanation, it.tag
  having count(*) filter (where not res.ok) > 0
  order by 5 desc, 2, 4
$$;
revoke execute on function public.wrong_questions(uuid, text[], uuid) from public, anon;
grant execute on function public.wrong_questions(uuid, text[], uuid) to authenticated;
