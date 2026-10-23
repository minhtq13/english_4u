-- Answers stay hidden from students until results are released.
--  * Students no longer read section_items directly: they get the questions through lesson_items(),
--    which leaves out the answer key (correct_option, answers, explanation) until the results are out.
--  * Students save only what they chose (attempts.answers = {qid: {given, chosen?}}); submit_attempt()
--    grades on the server, once. A submitted attempt cannot be changed or submitted again.
--  * Graded answers live in attempt_results, readable by the learner only once released:
--    right after submitting when the class has show_results on for that lesson, otherwise once graded.

-- Per class and lesson: show the score and answers as soon as the student submits.
alter table public.class_lessons add column show_results boolean not null default false;
comment on column public.class_lessons.show_results is
  'true = học sinh thấy điểm và đáp án ngay khi nộp; false = chỉ thấy sau khi giáo viên chấm.';

create table public.attempt_results (
  attempt_id uuid primary key references public.attempts (id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  graded_at timestamptz not null default now()
);
comment on table public.attempt_results is
  'Kết quả chấm tự động của bài đã nộp: {qid: {ok, q, given, correct, tag}}. Chỉ ghi qua submit_attempt().';

-- Existing submitted/graded attempts already hold graded answers.
insert into public.attempt_results (attempt_id, answers)
select id, answers from public.attempts where status <> 'in_progress';

-- Helpers ----------------------------------------------------------------------
-- Admins and teachers of the lesson's course see the answer key.
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

-- Results are out once graded, or once submitted when the learner's class shows them right away.
create or replace function private.results_released(target uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.attempts a
    where a.id = target
      and (a.status = 'graded' or (a.status = 'submitted' and exists (
        select 1 from public.class_lessons cl
        join public.profiles p on p.class_id = cl.class_id
        where p.id = a.user_id and cl.lesson_id = a.lesson_id and cl.show_results
      )))
  )
$$;

-- Number of auto-graded questions, counted past RLS so students see lesson sizes.
create or replace function private.scored_items(target text)
returns integer
language sql stable security definer set search_path = ''
as $$
  select count(*)::integer
  from public.section_items i
  join public.lesson_sections s on s.id = i.section_id
  where s.lesson_id = target and s.score_key is not null
$$;

-- Same rule as norm() in app/utils/course.ts.
create or replace function private.norm_answer(s text)
returns text
language sql immutable set search_path = ''
as $$
  select btrim(regexp_replace(regexp_replace(regexp_replace(lower(coalesce(s, '')),
    '[’'']', '', 'g'), '[.,!?;:"“”]', '', 'g'), '\s+', ' ', 'g'))
$$;

revoke execute on function private.can_teach_lesson(text), private.results_released(uuid),
  private.scored_items(text), private.norm_answer(text) from public, anon;
grant execute on function private.can_teach_lesson(text), private.results_released(uuid),
  private.scored_items(text), private.norm_answer(text) to authenticated;

-- Lesson questions -------------------------------------------------------------
-- Items of an open lesson. Order words always come in a fixed shuffled order (the stored order is
-- the answer); for order items the revealed `answers` lists the correct sentence first.
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
    i.id, i.section_id, i.position, i.prompt, i.back, i.options,
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
revoke execute on function public.lesson_items(text) from public, anon;
grant execute on function public.lesson_items(text) to authenticated;

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
  return a;
end;
$$;
revoke execute on function public.submit_attempt(text) from public, anon;
grant execute on function public.submit_attempt(text) to authenticated;

-- Learners only save their choices while the attempt is in progress; status and score
-- are set by submit_attempt(), the learner's teacher, or an admin.
create or replace function public.guard_attempt_status()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if (select auth.uid()) is not null
     and current_setting('app.attempt_rpc', true) is distinct from 'on'
     and not private.can_manage_user(new.user_id) then
    if tg_op = 'INSERT' then
      if new.status <> 'in_progress' then
        raise exception 'Hãy dùng nút Nộp bài';
      end if;
      new.score = '{}'::jsonb;
    else
      if old.status <> 'in_progress' then
        raise exception 'Bài đã nộp, không thể sửa hay nộp lại';
      end if;
      if new.status <> old.status then
        raise exception 'Hãy dùng nút Nộp bài';
      end if;
      new.score = old.score;
    end if;
  end if;
  if new.status = 'submitted' and (tg_op = 'INSERT' or old.status is distinct from 'submitted') then
    new.submitted_at = now();
  end if;
  return new;
end;
$$;

-- Row level security -------------------------------------------------------------
alter policy "Read items of visible lessons" on public.section_items
  using (exists (
    select 1 from public.lesson_sections s
    where s.id = section_id and (select private.can_teach_lesson(s.lesson_id))
  ));
alter policy "Read items of visible lessons" on public.section_items rename to "Teachers read items with answers";

alter table public.attempt_results enable row level security;
create policy "Read released results or own students" on public.attempt_results
  for select to authenticated
  using (exists (
    select 1 from public.attempts a
    where a.id = attempt_id
      and ((select private.can_manage_user(a.user_id))
        or (a.user_id = (select auth.uid()) and (select private.results_released(a.id))))
  ));
-- Teachers clear results when they let a student redo a lesson.
create policy "Teachers clear results of own students" on public.attempt_results
  for delete to authenticated
  using (exists (
    select 1 from public.attempts a where a.id = attempt_id and (select private.can_manage_user(a.user_id))
  ));

create policy "Teachers of the class change result settings" on public.class_lessons
  for update to authenticated
  using ((select public.is_admin()) or (select private.teaches_class(class_id)))
  with check ((select public.is_admin()) or (select private.teaches_class(class_id)));

-- Views ----------------------------------------------------------------------------
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
  p.course_id
from public.lessons l
join public.phases p on p.id = l.phase_id;

-- "completed" now means submitted (or graded).
create or replace view public.lesson_stats
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
