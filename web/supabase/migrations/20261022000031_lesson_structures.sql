-- Saved lesson structures: a teacher keeps the outline of a lesson (section types, titles, times, hints,
-- exam-format presets, number of empty questions) under a name and starts later lessons from it.
-- Only the outline is stored, never questions or answers. Each teacher sees only their own structures.

create table public.lesson_structures (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name text not null check (btrim(name) <> '' and char_length(name) <= 80),
  sections jsonb not null check (jsonb_typeof(sections) = 'array' and jsonb_array_length(sections) between 1 and 40),
  created_at timestamptz not null default now(),
  unique (teacher_id, name)
);
comment on table public.lesson_structures is 'Cấu trúc bài đã lưu của từng giáo viên: danh sách phần (loại, tiêu đề, thời gian, gợi ý, số câu), không chứa nội dung câu hỏi.';

alter table public.lesson_structures enable row level security;
create policy "Teachers read own structures" on public.lesson_structures
  for select to authenticated using (teacher_id = (select auth.uid()));
create policy "Teachers add own structures" on public.lesson_structures
  for insert to authenticated
  with check (teacher_id = (select auth.uid()) and (select private.my_role()) in ('teacher', 'admin'));
create policy "Teachers update own structures" on public.lesson_structures
  for update to authenticated
  using (teacher_id = (select auth.uid()))
  with check (teacher_id = (select auth.uid()) and (select private.my_role()) in ('teacher', 'admin'));
create policy "Teachers delete own structures" on public.lesson_structures
  for delete to authenticated using (teacher_id = (select auth.uid()));
