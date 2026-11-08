-- Streak: one row per student per day on which they themselves saved or submitted work. Written only by a trigger
-- (nobody has an insert policy), read by the student and by the teachers of their class. The day is the Vietnamese
-- calendar day. Work done by a teacher on a student's behalf, and the cron jobs that close lessons, do not count.

create table public.study_days (
  user_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,
  primary key (user_id, day)
);
comment on table public.study_days is 'Days (Vietnam time) on which a student saved or submitted work; written by the attempts trigger only.';

alter table public.study_days enable row level security;

create policy "study_days: read own or managed" on public.study_days for select to authenticated
  using (user_id = (select auth.uid()) or (select private.can_manage_user(user_id)));

create policy "session alive" on public.study_days as restrictive for all to authenticated
  using ((select private.session_alive())) with check ((select private.session_alive()));

create or replace function private.record_study_day()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
begin
  if new.user_id = (select auth.uid()) then
    insert into public.study_days (user_id, day)
    values (new.user_id, (now() at time zone 'Asia/Ho_Chi_Minh')::date)
    on conflict do nothing;
  end if;
  return new;
end;
$function$;

revoke execute on function private.record_study_day() from public, anon, authenticated;

create trigger attempts_study_day
  after insert or update of answers, writing, status on public.attempts
  for each row execute function private.record_study_day();
