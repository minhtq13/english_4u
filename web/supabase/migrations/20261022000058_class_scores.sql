-- Marks a teacher keeps for what happens in class, beside the lessons done on the site: attendance per session
-- (present / late / excused / absent), a +1 each time a student speaks up, and columns of marks 0-10 for oral checks
-- of the last lesson ("kiểm tra bài cũ") and homework. The teachers of the class (and admins) write them; a student
-- reads only their own rows. A row may only name a student who is in that class (trigger).
--
-- Rollback:
--   drop table public.score_entries; drop table public.score_columns; drop table public.participation_points;
--   drop table public.attendance; drop table public.class_sessions;
--   drop function private.check_score_student(); drop function private.class_of_session(uuid);
--   drop function private.class_of_column(uuid);

create table public.class_sessions (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  held_on date not null default current_date,
  term smallint not null check (term in (1, 2)),
  note text check (note is null or char_length(note) <= 200),
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (class_id, held_on)
);
create index class_sessions_term_idx on public.class_sessions (class_id, term, held_on);
create index class_sessions_created_by_idx on public.class_sessions (created_by);
comment on table public.class_sessions is 'One class meeting on one day, for attendance.';

create table public.attendance (
  session_id uuid not null references public.class_sessions (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  status text not null check (status in ('present', 'late', 'excused', 'absent')),
  primary key (session_id, student_id)
);
create index attendance_student_idx on public.attendance (student_id);
comment on table public.attendance is 'Where one student stood at one class session.';

create table public.participation_points (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  term smallint not null check (term in (1, 2)),
  points smallint not null default 1 check (points between 1 and 5),
  note text check (note is null or char_length(note) <= 200),
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index participation_points_class_idx on public.participation_points (class_id, student_id, term);
create index participation_points_student_idx on public.participation_points (student_id, term);
create index participation_points_created_by_idx on public.participation_points (created_by);
comment on table public.participation_points is 'Bonus points for speaking up in class, one row per award.';

create table public.score_columns (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  kind text not null check (kind in ('oral', 'homework')),
  title text not null check (char_length(btrim(title)) between 1 and 80),
  held_on date not null default current_date,
  term smallint not null check (term in (1, 2)),
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index score_columns_term_idx on public.score_columns (class_id, term, held_on);
create index score_columns_created_by_idx on public.score_columns (created_by);
comment on table public.score_columns is 'A column of class marks (oral check or homework) on one day.';

create table public.score_entries (
  column_id uuid not null references public.score_columns (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  score numeric(4, 2) not null check (score between 0 and 10),
  primary key (column_id, student_id)
);
create index score_entries_student_idx on public.score_entries (student_id);
comment on table public.score_entries is 'One student''s mark in one score column.';

create or replace function private.class_of_session(target uuid)
returns uuid
language sql stable security definer set search_path = ''
as $$ select class_id from public.class_sessions where id = target $$;

create or replace function private.class_of_column(target uuid)
returns uuid
language sql stable security definer set search_path = ''
as $$ select class_id from public.score_columns where id = target $$;

revoke execute on function private.class_of_session(uuid) from public, anon;
revoke execute on function private.class_of_column(uuid) from public, anon;
grant execute on function private.class_of_session(uuid) to authenticated;
grant execute on function private.class_of_column(uuid) to authenticated;

-- A mark may only name a student of the class it belongs to.
create or replace function private.check_score_student()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare target uuid;
begin
  if tg_table_name = 'attendance' then
    target := private.class_of_session(new.session_id);
  elsif tg_table_name = 'score_entries' then
    target := private.class_of_column(new.column_id);
  else
    target := new.class_id;
  end if;
  if not exists (
    select 1 from public.profiles p where p.id = new.student_id and p.class_id = target and p.role = 'student'
  ) then
    raise exception 'Học sinh không thuộc lớp này';
  end if;
  return new;
end;
$$;
revoke execute on function private.check_score_student() from public, anon, authenticated;

create trigger attendance_student before insert or update of student_id, session_id on public.attendance
  for each row execute function private.check_score_student();
create trigger participation_student before insert or update of student_id, class_id on public.participation_points
  for each row execute function private.check_score_student();
create trigger score_entries_student before insert or update of student_id, column_id on public.score_entries
  for each row execute function private.check_score_student();

alter table public.class_sessions enable row level security;
alter table public.attendance enable row level security;
alter table public.participation_points enable row level security;
alter table public.score_columns enable row level security;
alter table public.score_entries enable row level security;

create policy "class_sessions: own class reads" on public.class_sessions for select to authenticated
  using (class_id = (select private.my_class_id()));
create policy "class_sessions: teachers manage" on public.class_sessions for all to authenticated
  using ((select private.teaches_class(class_id)) or (select private.is_admin()))
  with check ((select private.teaches_class(class_id)) or (select private.is_admin()));

create policy "score_columns: own class reads" on public.score_columns for select to authenticated
  using (class_id = (select private.my_class_id()));
create policy "score_columns: teachers manage" on public.score_columns for all to authenticated
  using ((select private.teaches_class(class_id)) or (select private.is_admin()))
  with check ((select private.teaches_class(class_id)) or (select private.is_admin()));

create policy "participation: own reads" on public.participation_points for select to authenticated
  using (student_id = (select auth.uid()));
create policy "participation: teachers manage" on public.participation_points for all to authenticated
  using ((select private.teaches_class(class_id)) or (select private.is_admin()))
  with check ((select private.teaches_class(class_id)) or (select private.is_admin()));

create policy "attendance: own reads" on public.attendance for select to authenticated
  using (student_id = (select auth.uid()));
create policy "attendance: teachers manage" on public.attendance for all to authenticated
  using ((select private.teaches_class(private.class_of_session(session_id))) or (select private.is_admin()))
  with check ((select private.teaches_class(private.class_of_session(session_id))) or (select private.is_admin()));

create policy "score_entries: own reads" on public.score_entries for select to authenticated
  using (student_id = (select auth.uid()));
create policy "score_entries: teachers manage" on public.score_entries for all to authenticated
  using ((select private.teaches_class(private.class_of_column(column_id))) or (select private.is_admin()))
  with check ((select private.teaches_class(private.class_of_column(column_id))) or (select private.is_admin()));

create policy "session alive" on public.class_sessions as restrictive for all to authenticated
  using ((select private.session_alive())) with check ((select private.session_alive()));
create policy "session alive" on public.attendance as restrictive for all to authenticated
  using ((select private.session_alive())) with check ((select private.session_alive()));
create policy "session alive" on public.participation_points as restrictive for all to authenticated
  using ((select private.session_alive())) with check ((select private.session_alive()));
create policy "session alive" on public.score_columns as restrictive for all to authenticated
  using ((select private.session_alive())) with check ((select private.session_alive()));
create policy "session alive" on public.score_entries as restrictive for all to authenticated
  using ((select private.session_alive())) with check ((select private.session_alive()));
