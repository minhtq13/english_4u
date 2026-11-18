-- Badges (huy hiệu). The rules live in the database so a browser cannot award itself anything: `badges` lists the
-- badges and their targets, `user_badges` records who earned which and when, and `my_badges()` is the only writer:
-- it counts the caller's own work, records what has just been reached and returns every badge with the caller's
-- progress (`is_new` is true only on the call that first awarded it, for the "new badge" popup). A badge, once
-- earned, stays. Results that are not released to the student yet never count, so a badge cannot reveal a score.
--
-- Rollback: drop function public.my_badges(); drop table public.user_badges; drop table public.badges;

create table public.badges (
  key text primary key,
  target integer not null check (target > 0),
  position integer not null
);
comment on table public.badges is 'The badges a student can earn and the number each needs; the rules are in my_badges().';

create table public.user_badges (
  user_id uuid not null references public.profiles (id) on delete cascade,
  badge text not null references public.badges (key) on delete cascade,
  earned_at timestamptz not null default now(),
  primary key (user_id, badge)
);
comment on table public.user_badges is 'Badges earned; written only by my_badges().';
create index user_badges_badge_idx on public.user_badges (badge);

insert into public.badges (key, target, position) values
  ('on_time_5', 5, 1),
  ('perfect', 1, 2),
  ('streak_7', 7, 3),
  ('streak_30', 30, 4),
  ('course_done', 5, 5),
  ('review_50', 50, 6),
  ('fast_100', 1, 7);

alter table public.badges enable row level security;
alter table public.user_badges enable row level security;

create policy "badges: read" on public.badges for select to authenticated using (true);
create policy "user_badges: read own or managed" on public.user_badges for select to authenticated
  using (user_id = (select auth.uid()) or (select private.can_manage_user(user_id)));

create policy "session alive" on public.badges as restrictive for all to authenticated
  using ((select private.session_alive())) with check ((select private.session_alive()));
create policy "session alive" on public.user_badges as restrictive for all to authenticated
  using ((select private.session_alive())) with check ((select private.session_alive()));

create or replace function public.my_badges()
 returns table (badge text, earned_at timestamptz, progress integer, target integer, is_new boolean)
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  me uuid := (select auth.uid());
  cls uuid;
  v_ontime integer; v_perfect integer; v_fast integer; v_streak integer;
  v_assigned integer; v_done integer; v_cards integer;
  prog jsonb;
  fresh text[];
begin
  perform private.session_alive();
  if me is null then
    raise exception 'Bạn cần đăng nhập để xem huy hiệu';
  end if;
  select p.class_id into cls from public.profiles p where p.id = me;

  -- Submitted before the class's deadline (work closed by the clock after the deadline does not count).
  select count(*) into v_ontime
  from public.attempts a
  join public.class_lessons cl on cl.lesson_id = a.lesson_id and cl.class_id = cls
  where a.user_id = me and a.status <> 'in_progress' and cl.due_at is not null and a.submitted_at <= cl.due_at;

  -- Every answer right, counted only once the result has been released to the student.
  select count(*) into v_perfect
  from public.attempts a
  where a.user_id = me and a.status <> 'in_progress' and coalesce((a.score ->> 'total')::int, 0) > 0
    and (a.score ->> 'ok')::int = (a.score ->> 'total')::int and private.results_released(a.id);

  select count(*) into v_fast
  from public.attempts a
  where a.user_id = me and a.status <> 'in_progress' and coalesce((a.score ->> 'total')::int, 0) > 0
    and (a.score ->> 'ok')::int = (a.score ->> 'total')::int and private.results_released(a.id)
    and a.submitted_at - a.created_at < interval '10 minutes';

  -- Longest run of consecutive study days.
  select coalesce(max(n), 0) into v_streak
  from (
    select count(*) as n
    from (select d.day, d.day - (row_number() over (order by d.day))::int as grp from public.study_days d where d.user_id = me) t
    group by grp
  ) r;

  -- Lessons given to the student's class (to everyone, or to them by name) and how many are handed in.
  select count(*), count(*) filter (where exists (
      select 1 from public.attempts a where a.user_id = me and a.lesson_id = cl.lesson_id and a.status <> 'in_progress'))
  into v_assigned, v_done
  from public.class_lessons cl
  where cl.class_id = cls and (cl.for_all or exists (
    select 1 from public.class_lesson_students s where s.class_id = cl.class_id and s.lesson_id = cl.lesson_id and s.student_id = me));

  select count(*) into v_cards from public.card_reviews c where c.user_id = me;

  prog := jsonb_build_object(
    'on_time_5', v_ontime, 'perfect', v_perfect, 'streak_7', v_streak, 'streak_30', v_streak,
    'course_done', case when v_assigned >= 5 and v_done = v_assigned then 5 else least(v_done, 4) end,
    'review_50', v_cards, 'fast_100', v_fast);

  with ins as (
    insert into public.user_badges (user_id, badge)
    select me, b.key from public.badges b where (prog ->> b.key)::int >= b.target
    on conflict do nothing
    returning user_badges.badge
  )
  select coalesce(array_agg(ins.badge), '{}') into fresh from ins;

  return query
  select b.key, ub.earned_at, least((prog ->> b.key)::int, b.target), b.target, b.key = any (fresh)
  from public.badges b
  left join public.user_badges ub on ub.user_id = me and ub.badge = b.key
  order by b.position;
end;
$function$;

revoke execute on function public.my_badges() from public, anon;
grant execute on function public.my_badges() to authenticated;
