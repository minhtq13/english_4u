-- Accounts issued by admins and teachers: log in with a username and password.
--  * profiles.username: the login name (lower-case). The auth user behind it has the email
--    <username>@users.english4u.internal (a reserved, never-delivered domain); see the
--    manage-accounts edge function, which creates and edits these accounts with the service role.
--  * profiles.active: false = locked (the auth user is banned), shown in the management pages.
-- Only the edge function (service role) or an admin changes username / active.

alter table public.profiles add column username text;
alter table public.profiles add column active boolean not null default true;
alter table public.profiles add constraint profiles_username_format
  check (username ~ '^[a-z0-9][a-z0-9._-]{2,31}$');
create unique index profiles_username_key on public.profiles (username);
comment on column public.profiles.username is 'Tên đăng nhập do admin / giáo viên cấp (chữ thường, số, . _ -).';
comment on column public.profiles.active is 'false = tài khoản bị khoá, không đăng nhập được.';

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
  if new.username is distinct from old.username or new.active is distinct from old.active then
    raise exception 'Tên đăng nhập và trạng thái tài khoản chỉ đổi được ở trang quản lý học sinh';
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

-- Class pages list students with their login name and state.
create or replace view public.student_progress
with (security_invoker = true) as
select
  p.id as user_id,
  p.full_name,
  p.email,
  p.class_id,
  c.name as class_name,
  c.course_id,
  a.submitted, a.waiting, a.ok, a.done, a.last_activity,
  (select count(*) from public.error_log e where e.user_id = p.id and e.status <> 'fixed')::integer as open_errors,
  p.username,
  p.active
from public.profiles p
join public.classes c on c.id = p.class_id
cross join lateral (
  select
    (count(*) filter (where t.status <> 'in_progress'))::integer as submitted,
    (count(*) filter (where t.status = 'submitted'))::integer as waiting,
    coalesce(sum((t.score ->> 'ok')::integer), 0)::integer as ok,
    coalesce(sum((t.score ->> 'done')::integer), 0)::integer as done,
    max(t.updated_at) as last_activity
  from public.attempts t
  where t.user_id = p.id
) a
where p.role = 'student';
