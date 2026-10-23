-- Classes (6T1, 6T2…) inside each grade, three roles, and per-class lesson unlocking.
--   student: joins one class with its join code (once), studies the lessons unlocked for that class
--   teacher: works only with the classes assigned to them (students, grading, unlocking, statistics)
--   admin:   everything; the B1→B2 track is admin-only for now
-- Access rules are enforced here with RLS; the app only mirrors them.

-- Tables -----------------------------------------------------------------
create table public.classes (
  id uuid primary key default gen_random_uuid(),
  course_id text not null references public.courses (id) on update cascade,
  name text not null,
  join_code text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6)),
  created_at timestamptz not null default now(),
  unique (course_id, name)
);
comment on table public.classes is 'Lớp cụ thể trong một khối (vd 6T1). Học sinh vào lớp bằng join_code.';
create index classes_course_idx on public.classes (course_id);

create table public.class_teachers (
  class_id uuid not null references public.classes (id) on delete cascade,
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (class_id, teacher_id)
);
comment on table public.class_teachers is 'Phân công giáo viên dạy lớp.';
create index class_teachers_teacher_idx on public.class_teachers (teacher_id);

create table public.class_lessons (
  class_id uuid not null references public.classes (id) on delete cascade,
  lesson_id text not null references public.lessons (id) on update cascade on delete cascade,
  unlocked_by uuid default auth.uid() references public.profiles (id) on delete set null,
  unlocked_at timestamptz not null default now(),
  primary key (class_id, lesson_id)
);
comment on table public.class_lessons is 'Bài đã được mở cho lớp. Bài không có dòng ở đây là đang khoá với học sinh lớp đó.';
create index class_lessons_lesson_idx on public.class_lessons (lesson_id);
create index class_lessons_unlocked_by_idx on public.class_lessons (unlocked_by);

alter table public.profiles add column class_id uuid references public.classes (id) on delete set null;
create index profiles_class_idx on public.profiles (class_id);
comment on column public.profiles.class_id is 'Lớp của học sinh. Học sinh tự vào bằng mã lớp một lần; giáo viên của lớp / admin chuyển lớp.';
comment on column public.profiles.course_id is 'Không còn dùng (trước đây: khoá tự chọn). Khoá của học sinh lấy theo lớp.';

-- Seed classes and hide the B1→B2 track from everyone but admins.
insert into public.classes (course_id, name) values
  ('lop-6', '6T1'), ('lop-6', '6T2'),
  ('lop-7', '7T1'), ('lop-7', '7T2'),
  ('lop-8', '8T1'), ('lop-8', '8T2'),
  ('lop-9', '9T1'), ('lop-9', '9T2');
update public.courses set is_published = false where id = 'b1-b2';

-- Helper functions (definer, outside the API schema) --------------------------
create or replace function private.my_role()
returns public.app_role
language sql stable security definer set search_path = ''
as $$ select role from public.profiles where id = (select auth.uid()) $$;

create or replace function private.my_class_id()
returns uuid
language sql stable security definer set search_path = ''
as $$ select class_id from public.profiles where id = (select auth.uid()) $$;

create or replace function private.teaches_class(target uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.class_teachers
    where class_id = target and teacher_id = (select auth.uid())
  )
$$;

create or replace function private.can_manage_user(target uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select private.is_admin() or exists (
    select 1 from public.profiles p
    join public.class_teachers ct on ct.class_id = p.class_id
    where p.id = target and ct.teacher_id = (select auth.uid())
  )
$$;

create or replace function private.course_of_lesson(target text)
returns text
language sql stable security definer set search_path = ''
as $$
  select ph.course_id from public.lessons l join public.phases ph on ph.id = l.phase_id where l.id = target
$$;

-- Course outline is visible to admins, teachers of a class in the course, and its students.
create or replace function private.can_see_course(target text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select private.is_admin()
    or exists (
      select 1 from public.classes c
      join public.class_teachers ct on ct.class_id = c.id
      where c.course_id = target and ct.teacher_id = (select auth.uid())
    )
    or exists (
      select 1 from public.profiles p
      join public.classes c on c.id = p.class_id
      where p.id = (select auth.uid()) and c.course_id = target
    )
$$;

-- Lesson content: admins, teachers of the course, and students whose class has it unlocked.
create or replace function private.can_open_lesson(target text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select private.is_admin()
    or exists (
      select 1 from public.classes c
      join public.class_teachers ct on ct.class_id = c.id
      where c.course_id = private.course_of_lesson(target) and ct.teacher_id = (select auth.uid())
    )
    or exists (
      select 1 from public.class_lessons cl
      join public.profiles p on p.class_id = cl.class_id
      where p.id = (select auth.uid()) and cl.lesson_id = target
    )
$$;

revoke execute on function private.my_role(), private.my_class_id(), private.teaches_class(uuid),
  private.can_manage_user(uuid), private.course_of_lesson(text), private.can_see_course(text),
  private.can_open_lesson(text) from public, anon;
grant execute on function private.my_role(), private.my_class_id(), private.teaches_class(uuid),
  private.can_manage_user(uuid), private.course_of_lesson(text), private.can_see_course(text),
  private.can_open_lesson(text) to authenticated;

-- Guards ---------------------------------------------------------------------
-- Only admins change roles/emails. Students never change their own class (except the one-time
-- join through join_class); a teacher may move a student between classes they both teach.
create or replace function public.guard_profile_update()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if (select auth.uid()) is null or public.is_admin() then
    return new;
  end if;
  if new.role is distinct from old.role or new.email is distinct from old.email then
    raise exception 'Bạn không có quyền đổi vai trò hoặc email';
  end if;
  if new.class_id is distinct from old.class_id then
    if current_setting('app.joining_class', true) = 'on' and old.id = (select auth.uid()) and old.class_id is null then
      return new;
    end if;
    if old.id <> (select auth.uid())
       and old.class_id is not null and private.teaches_class(old.class_id)
       and (new.class_id is null or private.teaches_class(new.class_id)) then
      return new;
    end if;
    raise exception 'Học sinh không thể tự đổi lớp. Hãy nhờ giáo viên của lớp.';
  end if;
  return new;
end;
$$;

-- Only teachers (or admins) can be assigned to a class.
create or replace function public.guard_class_teacher()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if not exists (select 1 from public.profiles where id = new.teacher_id and role in ('teacher', 'admin')) then
    raise exception 'Chỉ phân công được tài khoản có vai trò giáo viên hoặc admin';
  end if;
  return new;
end;
$$;
create trigger class_teachers_guard
  before insert or update on public.class_teachers
  for each row execute function public.guard_class_teacher();

-- A teacher of the learner (or an admin) marks attempts as graded.
create or replace function public.guard_attempt_status()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.status = 'graded'
     and (tg_op = 'INSERT' or old.status is distinct from 'graded')
     and not private.can_manage_user(new.user_id) then
    raise exception 'Chỉ giáo viên của lớp mới chấm được bài';
  end if;
  if new.status = 'submitted' and (tg_op = 'INSERT' or old.status is distinct from 'submitted') then
    new.submitted_at = now();
  end if;
  return new;
end;
$$;

-- Students join a class once with its code.
create or replace function public.join_class(code text)
returns public.classes
language plpgsql security definer set search_path = ''
as $$
declare
  me public.profiles;
  target public.classes;
begin
  select * into me from public.profiles where id = (select auth.uid());
  if me.id is null then
    raise exception 'Bạn cần đăng nhập';
  end if;
  if me.role <> 'student' then
    raise exception 'Chỉ học sinh mới cần nhập mã lớp';
  end if;
  if me.class_id is not null then
    raise exception 'Bạn đã ở trong một lớp. Hãy nhờ giáo viên nếu cần chuyển lớp.';
  end if;
  select * into target from public.classes where join_code = upper(trim(code));
  if target.id is null then
    raise exception 'Mã lớp không đúng. Kiểm tra lại với giáo viên.';
  end if;
  perform set_config('app.joining_class', 'on', true);
  update public.profiles set class_id = target.id where id = me.id;
  return target;
end;
$$;
revoke execute on function public.join_class(text) from public, anon;
grant execute on function public.join_class(text) to authenticated;

-- Row level security -----------------------------------------------------------
alter table public.classes enable row level security;
alter table public.class_teachers enable row level security;
alter table public.class_lessons enable row level security;

create policy "Read own, taught or any class as admin" on public.classes
  for select to authenticated
  using ((select public.is_admin()) or (select private.teaches_class(id)) or id = (select private.my_class_id()));
create policy "Admins insert classes" on public.classes
  for insert to authenticated with check ((select public.is_admin()));
create policy "Admins update classes" on public.classes
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins delete classes" on public.classes
  for delete to authenticated using ((select public.is_admin()));

create policy "Read own assignments or any as admin" on public.class_teachers
  for select to authenticated using ((select public.is_admin()) or teacher_id = (select auth.uid()));
create policy "Admins assign teachers" on public.class_teachers
  for insert to authenticated with check ((select public.is_admin()));
create policy "Admins remove teachers" on public.class_teachers
  for delete to authenticated using ((select public.is_admin()));

create policy "Read unlocks of own or taught class" on public.class_lessons
  for select to authenticated
  using ((select public.is_admin()) or (select private.teaches_class(class_id)) or class_id = (select private.my_class_id()));
create policy "Teachers of the class unlock lessons" on public.class_lessons
  for insert to authenticated
  with check (((select public.is_admin()) or (select private.teaches_class(class_id))) and unlocked_by = (select auth.uid()));
create policy "Teachers of the class lock lessons" on public.class_lessons
  for delete to authenticated using ((select public.is_admin()) or (select private.teaches_class(class_id)));

-- Courses / outline: only what the person's classes cover; unpublished courses are admin-only.
alter policy "Read published courses or any as teacher" on public.courses
  using ((select public.is_admin()) or (is_published and (select private.can_see_course(id))));
alter policy "Read published courses or any as teacher" on public.courses rename to "Read courses of own classes or any as admin";
alter policy "Signed-in users read phases" on public.phases
  using ((select private.can_see_course(course_id)));
alter policy "Signed-in users read phases" on public.phases rename to "Read phases of visible courses";
alter policy "Read published lessons or any as teacher" on public.lessons
  using ((select public.is_admin()) or (is_published and (select private.can_see_course(private.course_of_lesson(id)))));
alter policy "Read published lessons or any as teacher" on public.lessons rename to "Read lessons of visible courses";
-- Titles are listed (with a lock) but the content needs the lesson to be open for the reader.
alter policy "Read sections of visible lessons" on public.lesson_sections
  using ((select private.can_open_lesson(lesson_id)));
alter policy "Read sections of visible lessons" on public.lesson_sections rename to "Read sections of open lessons";

-- Content editing stays admin-only; names now say so.
alter policy "Teachers insert courses" on public.courses rename to "Admins insert courses";
alter policy "Teachers update courses" on public.courses rename to "Admins update courses";
alter policy "Teachers delete courses" on public.courses rename to "Admins delete courses";
alter policy "Teachers insert phases" on public.phases rename to "Admins insert phases";
alter policy "Teachers update phases" on public.phases rename to "Admins update phases";
alter policy "Teachers delete phases" on public.phases rename to "Admins delete phases";
alter policy "Teachers insert lessons" on public.lessons rename to "Admins insert lessons";
alter policy "Teachers update lessons" on public.lessons rename to "Admins update lessons";
alter policy "Teachers delete lessons" on public.lessons rename to "Admins delete lessons";
alter policy "Teachers insert sections" on public.lesson_sections rename to "Admins insert sections";
alter policy "Teachers update sections" on public.lesson_sections rename to "Admins update sections";
alter policy "Teachers delete sections" on public.lesson_sections rename to "Admins delete sections";
alter policy "Teachers insert items" on public.section_items rename to "Admins insert items";
alter policy "Teachers update items" on public.section_items rename to "Admins update items";
alter policy "Teachers delete items" on public.section_items rename to "Admins delete items";

-- People: yourself, your students (teacher), everyone (admin).
alter policy "Read own profile or any as teacher" on public.profiles
  using (id = (select auth.uid()) or (select private.can_manage_user(id)));
alter policy "Read own profile or any as teacher" on public.profiles rename to "Read own profile, own students or any as admin";
alter policy "Update own profile or any as teacher" on public.profiles
  using (id = (select auth.uid()) or (select private.can_manage_user(id)))
  with check (id = (select auth.uid()) or (select private.can_manage_user(id)));
alter policy "Update own profile or any as teacher" on public.profiles rename to "Update own profile, own students or any as admin";

-- Attempts: students (and admins) work on open lessons; teachers read and grade their students.
alter policy "Read own attempts or any as teacher" on public.attempts
  using (user_id = (select auth.uid()) or (select private.can_manage_user(user_id)));
alter policy "Read own attempts or any as teacher" on public.attempts rename to "Read own attempts or own students";
alter policy "Create own attempts" on public.attempts
  with check (
    user_id = (select auth.uid())
    and (select private.my_role()) in ('student', 'admin')
    and (select private.can_open_lesson(lesson_id))
  );
alter policy "Create own attempts" on public.attempts rename to "Create own attempts on open lessons";
alter policy "Update own attempts or any as teacher" on public.attempts
  using (user_id = (select auth.uid()) or (select private.can_manage_user(user_id)))
  with check (user_id = (select auth.uid()) or (select private.can_manage_user(user_id)));
alter policy "Update own attempts or any as teacher" on public.attempts rename to "Update own attempts or own students";

-- Feedback and error log: written by the learner's teacher (or an admin).
alter policy "Read feedback on own attempts or any as teacher" on public.feedback
  using (exists (select 1 from public.attempts a where a.id = attempt_id));
alter policy "Read feedback on own attempts or any as teacher" on public.feedback rename to "Read feedback on visible attempts";
alter policy "Teachers write feedback" on public.feedback
  with check (
    teacher_id = (select auth.uid())
    and exists (select 1 from public.attempts a where a.id = attempt_id and private.can_manage_user(a.user_id))
  );
alter policy "Teachers edit feedback" on public.feedback
  using (exists (select 1 from public.attempts a where a.id = attempt_id and private.can_manage_user(a.user_id)))
  with check (exists (select 1 from public.attempts a where a.id = attempt_id and private.can_manage_user(a.user_id)));
alter policy "Teachers delete feedback" on public.feedback
  using (exists (select 1 from public.attempts a where a.id = attempt_id and private.can_manage_user(a.user_id)));

alter policy "Read own error log or any as teacher" on public.error_log
  using (user_id = (select auth.uid()) or (select private.can_manage_user(user_id)));
alter policy "Read own error log or any as teacher" on public.error_log rename to "Read own error log or own students";
alter policy "Teachers add errors" on public.error_log
  with check ((select private.can_manage_user(user_id)));
alter policy "Teachers edit errors" on public.error_log
  using ((select private.can_manage_user(user_id))) with check ((select private.can_manage_user(user_id)));
alter policy "Teachers delete errors" on public.error_log
  using ((select private.can_manage_user(user_id)));
