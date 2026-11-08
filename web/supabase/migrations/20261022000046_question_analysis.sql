-- Question analysis for teachers: for one lesson of one class, how many students answered each question, how many were
-- right, and the three wrong answers given most often. Runs as the caller (security invoker), so RLS decides which
-- attempts a teacher sees: only students of the classes they teach (admins see every class).
create or replace function public.question_analysis(target_class uuid, target_lesson text)
 returns table (qid text, q text, answered integer, ok integer, wrong jsonb)
 language sql
 stable
 set search_path to ''
as $function$
  with res as (
    select r.key as res_qid, r.value ->> 'q' as res_q, coalesce((r.value ->> 'ok')::boolean, false) as res_ok, r.value ->> 'given' as res_given
    from public.attempts a
    join public.profiles p on p.id = a.user_id
    join public.attempt_results ar on ar.attempt_id = a.id
    cross join lateral jsonb_each(ar.answers) r
    where a.lesson_id = target_lesson and p.class_id = target_class
  )
  select res.res_qid, max(res.res_q), count(*)::integer, (count(*) filter (where res.res_ok))::integer,
    coalesce((
      select jsonb_agg(jsonb_build_object('given', w.given, 'n', w.n) order by w.n desc, w.given)
      from (
        select r2.res_given as given, count(*) as n
        from res r2
        where r2.res_qid = res.res_qid and not r2.res_ok
        group by r2.res_given
        order by count(*) desc, r2.res_given
        limit 3
      ) w
    ), '[]'::jsonb)
  from res
  group by res.res_qid
  order by res.res_qid
$function$;

revoke execute on function public.question_analysis(uuid, text) from public, anon;
grant execute on function public.question_analysis(uuid, text) to authenticated;
