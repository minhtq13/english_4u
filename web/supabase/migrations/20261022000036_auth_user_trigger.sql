-- Record the signup trigger that already runs in production but was never written to a migration: every new auth user
-- gets a profiles row (admin when the email is in admin_emails, student otherwise).
-- It lives on auth.users, so a dump of schema public does not contain it and a restore into a new project lost it.
-- Applying this over production changes nothing: same function body, same ACL, same trigger.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url',
    case when exists (select 1 from public.admin_emails a where lower(a.email) = lower(new.email))
      then 'admin'::public.app_role else 'student'::public.app_role end
  );
  return new;
end;
$$;
-- A trigger function must not be callable as an RPC (triggers still fire).
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
