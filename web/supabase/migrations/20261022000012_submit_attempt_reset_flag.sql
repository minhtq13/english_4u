-- submit_attempt() turns its trigger bypass off again right after its own update.
-- Grades the caller's attempt on the server and submits it. Only once.
create or replace function public.submit_attempt(lesson text)
returns public.attempts
language plpgsql security definer set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  a public.attempts;
  graded jsonb;
  total integer;
begin
  select * into a from public.attempts where user_id = me and lesson_id = lesson for update;
  if a.id is null then
    raise exception 'Bạn chưa làm bài này';
  end if;
  if a.status <> 'in_progress' then
    raise exception 'Bài đã nộp, không thể nộp lại';
  end if;
  if not private.can_open_lesson(lesson) then
    raise exception 'Bài này đang khoá';
  end if;

  with items as (
    select
      s.score_key || row_number() over (partition by s.id order by i.position) as qid,
      s.type, i.tag, i.options, i.correct_option, i.answers,
      case when s.type = 'order' then coalesce(i.prompt, 'Sắp xếp câu')
        else regexp_replace(coalesce(i.prompt, ''), '<[^>]+>', '', 'g') end as q,
      case s.type
        when 'mcq' then i.options[i.correct_option]
        when 'typed' then i.answers[1]
        else array_to_string(array(select btrim(w) from unnest(i.words) with ordinality u(w, n) order by n), ' ')
      end as correct
    from public.lesson_sections s
    join public.section_items i on i.section_id = s.id
    where s.lesson_id = lesson and s.score_key is not null
  ), checked as (
    select it.qid, it.q, it.tag, it.correct, a.answers -> it.qid ->> 'given' as given,
      case it.type
        when 'mcq' then (a.answers -> it.qid ->> 'given') = it.correct
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
revoke execute on function public.submit_attempt(text) from public, anon;
grant execute on function public.submit_attempt(text) to authenticated;
