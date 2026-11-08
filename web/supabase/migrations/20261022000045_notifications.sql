-- In-app notifications and class announcements.
--  * class_announcements: a teacher of the class (or an admin) posts a short message; the class's students read it.
--  * notifications: one row per person, written only by the triggers below and the hourly due-soon job (nobody has
--    an insert policy). A person reads and marks their own as read. `kind` + `params` are translated by the app, so
--    no language is stored. `dedupe` stops the same notice being written twice.
-- Triggers: a lesson given to a class, work graded, feedback written, an announcement posted; the job
-- private.notify_due_soon() (hourly) warns students whose open lesson is due within 24 hours and who have not submitted.

create table public.class_announcements (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index class_announcements_class_idx on public.class_announcements (class_id, created_at desc);
create index class_announcements_author_idx on public.class_announcements (author_id);
comment on table public.class_announcements is 'Short messages from a teacher to one class.';

alter table public.class_announcements enable row level security;

create policy "announcements: read own class or taught" on public.class_announcements for select to authenticated
  using (class_id = (select private.my_class_id()) or (select private.teaches_class(class_id)) or (select private.is_admin()));
create policy "announcements: teachers post" on public.class_announcements for insert to authenticated
  with check (author_id = (select auth.uid()) and ((select private.teaches_class(class_id)) or (select private.is_admin())));
create policy "announcements: author or admin deletes" on public.class_announcements for delete to authenticated
  using (author_id = (select auth.uid()) or (select private.is_admin()));
create policy "session alive" on public.class_announcements as restrictive for all to authenticated
  using ((select private.session_alive())) with check ((select private.session_alive()));

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('lesson_given', 'due_soon', 'graded', 'feedback', 'announcement')),
  params jsonb not null default '{}'::jsonb,
  link text,
  dedupe text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create unique index notifications_dedupe_idx on public.notifications (user_id, dedupe) where dedupe is not null;
comment on table public.notifications is 'In-app notices for one person; kind + params are translated by the app. Written by triggers only.';

alter table public.notifications enable row level security;

create policy "notifications: read own" on public.notifications for select to authenticated using (user_id = (select auth.uid()));
create policy "notifications: update own" on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "notifications: delete own" on public.notifications for delete to authenticated using (user_id = (select auth.uid()));
create policy "session alive" on public.notifications as restrictive for all to authenticated
  using ((select private.session_alive())) with check ((select private.session_alive()));

-- A person may only mark a notice read: no other column can be changed through the API.
revoke update on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;

-- ---- writers (security definer, never callable through the API) ----

create or replace function private.notify_class(target_class uuid, k text, p jsonb, to_link text, dedupe_key text)
 returns void
 language sql
 security definer
 set search_path to ''
as $function$
  insert into public.notifications (user_id, kind, params, link, dedupe)
  select pr.id, k, p, to_link, dedupe_key
  from public.profiles pr
  where pr.class_id = target_class and pr.role = 'student' and pr.active
  on conflict (user_id, dedupe) where dedupe is not null do nothing
$function$;

create or replace function private.on_lesson_given()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
begin
  if new.for_all then
    perform private.notify_class(new.class_id, 'lesson_given', jsonb_build_object('lesson_id', new.lesson_id),
      '/lessons/' || new.lesson_id, 'given:' || new.lesson_id);
  end if;
  return new;
end;
$function$;

create or replace function private.on_lesson_pick()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
begin
  insert into public.notifications (user_id, kind, params, link, dedupe)
  values (new.student_id, 'lesson_given', jsonb_build_object('lesson_id', new.lesson_id), '/lessons/' || new.lesson_id, 'given:' || new.lesson_id)
  on conflict (user_id, dedupe) where dedupe is not null do nothing;
  return new;
end;
$function$;

create or replace function private.on_attempt_graded()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
begin
  -- Feedback marks the attempt graded too, and writes its own notice: only a release without a comment notifies here.
  if not exists (select 1 from public.feedback f where f.attempt_id = new.id) then
    insert into public.notifications (user_id, kind, params, link)
    values (new.user_id, 'graded', jsonb_build_object('lesson_id', new.lesson_id), '/lessons/' || new.lesson_id);
  end if;
  return new;
end;
$function$;

create or replace function private.on_feedback_written()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare a public.attempts;
begin
  select * into a from public.attempts where id = new.attempt_id;
  if a.id is not null then
    insert into public.notifications (user_id, kind, params, link)
    values (a.user_id, 'feedback', jsonb_build_object('lesson_id', a.lesson_id), '/lessons/' || a.lesson_id);
  end if;
  return new;
end;
$function$;

create or replace function private.on_announcement()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
begin
  perform private.notify_class(new.class_id, 'announcement', jsonb_build_object('announcement_id', new.id), '/', 'announce:' || new.id);
  return new;
end;
$function$;

create or replace function private.notify_due_soon()
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare n integer;
begin
  with due as (
    select cl.class_id, cl.lesson_id, cl.due_at, cl.for_all
    from public.class_lessons cl
    where not cl.closed and cl.due_at > now() and cl.due_at <= now() + interval '24 hours'
  ), ins as (
    insert into public.notifications (user_id, kind, params, link, dedupe)
    select p.id, 'due_soon', jsonb_build_object('lesson_id', d.lesson_id, 'due_at', d.due_at), '/lessons/' || d.lesson_id,
      'due:' || d.lesson_id || ':' || to_char(d.due_at at time zone 'utc', 'YYYYMMDDHH24MI')
    from due d
    join public.profiles p on p.class_id = d.class_id and p.role = 'student' and p.active
    where (d.for_all or exists (
        select 1 from public.class_lesson_students s
        where s.class_id = d.class_id and s.lesson_id = d.lesson_id and s.student_id = p.id))
      and not exists (
        select 1 from public.attempts a
        where a.user_id = p.id and a.lesson_id = d.lesson_id and a.status <> 'in_progress')
    on conflict (user_id, dedupe) where dedupe is not null do nothing
    returning 1
  )
  select count(*) into n from ins;
  return n;
end;
$function$;

revoke execute on function private.notify_class(uuid, text, jsonb, text, text) from public, anon, authenticated;
revoke execute on function private.on_lesson_given() from public, anon, authenticated;
revoke execute on function private.on_lesson_pick() from public, anon, authenticated;
revoke execute on function private.on_attempt_graded() from public, anon, authenticated;
revoke execute on function private.on_feedback_written() from public, anon, authenticated;
revoke execute on function private.on_announcement() from public, anon, authenticated;
revoke execute on function private.notify_due_soon() from public, anon, authenticated;

create trigger class_lessons_notify after insert on public.class_lessons for each row execute function private.on_lesson_given();
create trigger class_lesson_students_notify after insert on public.class_lesson_students for each row execute function private.on_lesson_pick();
create trigger attempts_notify_graded after update of status on public.attempts for each row
  when (old.status is distinct from new.status and new.status = 'graded') execute function private.on_attempt_graded();
create trigger feedback_notify after insert on public.feedback for each row execute function private.on_feedback_written();
create trigger announcements_notify after insert on public.class_announcements for each row execute function private.on_announcement();

select cron.schedule('notify-due-soon', '7 * * * *', 'select private.notify_due_soon()');
