-- Exam sets ("bộ đề thi"): the paper exams a teacher builds at /teacher/exams, kept so they can be opened, changed and
-- printed again. One row is one exam set: the heading (title, grade, school, time...), the exam codes and how each code
-- is shuffled, and the chosen questions. The questions are a snapshot (jsonb, with their answers, explanations and
-- reading passages), so a paper stays as it was written when the lesson it came from is edited or deleted.
-- Each teacher sees and changes only their own sets; an admin sees and manages all of them.

create table public.exam_sets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title text not null check (btrim(title) <> '' and char_length(title) <= 200),
  course_id text references public.courses (id) on delete set null,
  school text not null default '' check (char_length(school) <= 200),
  department text not null default '' check (char_length(department) <= 200),
  school_year text not null default '' check (char_length(school_year) <= 40),
  term text not null default '' check (char_length(term) <= 100),
  minutes integer not null default 45 check (minutes between 1 and 600),
  -- The exam codes as typed ("101, 102, 103, 104"); each code is also the seed that shuffles its paper.
  codes text not null default '101, 102, 103, 104' check (char_length(codes) <= 400),
  mode text not null default 'all' check (mode in ('all', 'options', 'questions')),
  sheet_at text not null default 'top' check (sheet_at in ('top', 'bottom', 'none')),
  questions jsonb not null default '[]'::jsonb
    check (jsonb_typeof(questions) = 'array' and jsonb_array_length(questions) <= 300 and pg_column_size(questions) <= 1500000),
  -- Lets the list show the size of a set without reading its questions.
  question_count integer generated always as (jsonb_array_length(questions)) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.exam_sets is 'Bộ đề thi giấy của giáo viên: thông tin chung, các mã đề, cách trộn và các câu hỏi đã chọn (bản chụp, kèm đáp án).';

create index exam_sets_owner_updated_idx on public.exam_sets (owner_id, updated_at desc);
create index exam_sets_updated_idx on public.exam_sets (updated_at desc);
create index exam_sets_course_idx on public.exam_sets (course_id);

create trigger exam_sets_updated_at
  before update on public.exam_sets
  for each row execute function public.set_updated_at();

alter table public.exam_sets enable row level security;
create policy "Read own exam sets or any as admin" on public.exam_sets
  for select to authenticated
  using (owner_id = (select auth.uid()) or (select private.is_admin()));
create policy "Teachers add own exam sets" on public.exam_sets
  for insert to authenticated
  with check (owner_id = (select auth.uid()) and (select private.my_role()) in ('teacher', 'admin'));
create policy "Update own exam sets or any as admin" on public.exam_sets
  for update to authenticated
  using (owner_id = (select auth.uid()) or (select private.is_admin()))
  with check ((owner_id = (select auth.uid()) or (select private.is_admin())) and (select private.my_role()) in ('teacher', 'admin'));
create policy "Delete own exam sets or any as admin" on public.exam_sets
  for delete to authenticated
  using (owner_id = (select auth.uid()) or (select private.is_admin()));
create policy "session alive" on public.exam_sets
  as restrictive for all to authenticated
  using ((select private.session_alive())) with check ((select private.session_alive()));
