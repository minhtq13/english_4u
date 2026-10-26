-- A username is only a login when the auth user's email is <username>@users.english4u.internal. The manage-accounts
-- edge function changes both together, but an admin (or the SQL / Table Editor) could change profiles.username alone,
-- and four accounts drifted that way: the pages showed hs.04, hs.03, gv.01, gv.02 while the logins were still
-- test.hs, hocsinh1, giaovien1, test.gv, so signing in with the shown name failed ("wrong password").
--  * Data: every username account's login email (auth.users, its email identity, profiles.email) now follows its
--    username, so the shown name is the login; passwords and Google sign-in are unchanged.
--  * Guard: profiles.username changes only through the edge function (service role), which renames the login too.

update auth.users u
set email = p.username || '@users.english4u.internal', updated_at = now()
from public.profiles p
where p.id = u.id and p.username is not null
  and u.email like '%@users.english4u.internal' and u.email <> p.username || '@users.english4u.internal';

update auth.identities i
set identity_data = jsonb_set(i.identity_data, '{email}', to_jsonb(u.email)), updated_at = now()
from auth.users u
where i.user_id = u.id and i.provider = 'email'
  and u.email like '%@users.english4u.internal' and i.identity_data ->> 'email' is distinct from u.email;

update public.profiles p
set email = u.email
from auth.users u
where u.id = p.id and u.email like '%@users.english4u.internal' and p.email is distinct from u.email;

create or replace function public.guard_profile_update()
 returns trigger
 language plpgsql
 set search_path to ''
as $function$
begin
  -- The login is <username>@users.english4u.internal: only the edge function renames both together.
  if new.username is distinct from old.username and current_user <> 'service_role' then
    raise exception 'Tên đăng nhập chỉ đổi được bằng nút Sửa ở trang quản lý tài khoản';
  end if;
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
$function$;
