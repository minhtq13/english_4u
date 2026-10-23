-- Faster grading:
--  * comment_templates: each teacher's reusable feedback snippets (only the owner sees them).
--  * release_class_results(): mark every submitted attempt of a lesson in a class as graded, so the class sees
--    its results without a comment per student (for worksheets that are only auto-graded).

create table public.comment_templates (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body text not null check (btrim(body) <> ''),
  created_at timestamptz not null default now()
);
comment on table public.comment_templates is 'Nhận xét mẫu của từng giáo viên, bấm để chèn khi chấm bài.';
create index comment_templates_teacher_idx on public.comment_templates (teacher_id, created_at);

alter table public.comment_templates enable row level security;
create policy "Teachers read own templates" on public.comment_templates
  for select to authenticated using (teacher_id = (select auth.uid()));
create policy "Teachers add own templates" on public.comment_templates
  for insert to authenticated
  with check (teacher_id = (select auth.uid()) and (select private.my_role()) in ('teacher', 'admin'));
create policy "Teachers delete own templates" on public.comment_templates
  for delete to authenticated using (teacher_id = (select auth.uid()));

create or replace function public.release_class_results(target_class uuid, target_lesson text)
returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  n integer;
begin
  if not (private.is_admin() or private.teaches_class(target_class)) then
    raise exception 'Chỉ giáo viên của lớp mới trả kết quả được';
  end if;
  update public.attempts a set status = 'graded'
  from public.profiles p
  where p.id = a.user_id and p.class_id = target_class
    and a.lesson_id = target_lesson and a.status = 'submitted';
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke execute on function public.release_class_results(uuid, text) from public, anon;
grant execute on function public.release_class_results(uuid, text) to authenticated;
