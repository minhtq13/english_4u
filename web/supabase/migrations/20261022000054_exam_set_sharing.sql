-- Sharing exam sets. The owner of an exam set (or an admin) can share it with other teachers and admins, never with
-- students: the person it is shared with can open, print and export it, and, when the owner allows it ("can_edit"),
-- change it too. Only the owner (or an admin) deletes the set or manages who it is shared with, and a person it was
-- shared with can drop the share for themselves.
--
-- Teachers cannot read each other's profiles, so a security definer function lists the staff (teachers and admins:
-- name and username only) for the "share with" search and for showing who made a shared set.

-- ---------------------------------------------------------------- helpers (security definer: they read the tables
-- without RLS, so the policies of exam_sets and exam_set_shares can use each other without recursing)

create function private.is_staff(u uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p where p.id = u and p.active and p.role in ('teacher', 'admin'));
$$;
revoke execute on function private.is_staff(uuid) from public, anon;
grant execute on function private.is_staff(uuid) to authenticated;

create function private.owns_exam(e uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.exam_sets s where s.id = e and s.owner_id = (select auth.uid()));
$$;
revoke execute on function private.owns_exam(uuid) from public, anon;
grant execute on function private.owns_exam(uuid) to authenticated;

-- ---------------------------------------------------------------- the shares

create table public.exam_set_shares (
  exam_id uuid not null references public.exam_sets (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  can_edit boolean not null default false,
  created_by uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (exam_id, user_id)
);
comment on table public.exam_set_shares is 'Bộ đề thi được chia sẻ cho giáo viên / quản trị viên khác: chỉ xem hoặc được sửa (can_edit).';
create index exam_set_shares_user_idx on public.exam_set_shares (user_id);
create index exam_set_shares_created_by_idx on public.exam_set_shares (created_by);

-- (Created after the table, which its body reads.) Is the exam set shared with the caller? With need_edit, only a share that lets them change it counts.
create function private.exam_shared_with_me(e uuid, need_edit boolean default false)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.exam_set_shares h
    where h.exam_id = e and h.user_id = (select auth.uid()) and (not need_edit or h.can_edit)
  );
$$;
revoke execute on function private.exam_shared_with_me(uuid, boolean) from public, anon;
grant execute on function private.exam_shared_with_me(uuid, boolean) to authenticated;

alter table public.exam_set_shares enable row level security;
create policy "See shares of own exam sets, shares with me, or any as admin" on public.exam_set_shares
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.owns_exam(exam_id)) or (select private.is_admin()));
create policy "Share own exam sets with other staff" on public.exam_set_shares
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and user_id <> (select auth.uid())
    and (select private.is_staff(user_id))
    and (select private.my_role()) in ('teacher', 'admin')
    and ((select private.owns_exam(exam_id)) or (select private.is_admin()))
  );
create policy "Change shares of own exam sets" on public.exam_set_shares
  for update to authenticated
  using ((select private.owns_exam(exam_id)) or (select private.is_admin()))
  with check (
    user_id <> (select auth.uid())
    and (select private.is_staff(user_id))
    and ((select private.owns_exam(exam_id)) or (select private.is_admin()))
  );
create policy "Remove shares of own exam sets or my own share" on public.exam_set_shares
  for delete to authenticated
  using (user_id = (select auth.uid()) or (select private.owns_exam(exam_id)) or (select private.is_admin()));
create policy "session alive" on public.exam_set_shares
  as restrictive for all to authenticated
  using ((select private.session_alive())) with check ((select private.session_alive()));

-- ---------------------------------------------------------------- exam_sets: readable and (when allowed) editable by the people it is shared with

alter policy "Read own exam sets or any as admin" on public.exam_sets
  rename to "Read own, shared or any as admin exam sets";
alter policy "Read own, shared or any as admin exam sets" on public.exam_sets
  using (owner_id = (select auth.uid()) or (select private.is_admin()) or (select private.exam_shared_with_me(id)));

alter policy "Update own exam sets or any as admin" on public.exam_sets
  rename to "Update own, editable shared or any as admin exam sets";
alter policy "Update own, editable shared or any as admin exam sets" on public.exam_sets
  using (owner_id = (select auth.uid()) or (select private.is_admin()) or (select private.exam_shared_with_me(id, true)))
  with check (
    (owner_id = (select auth.uid()) or (select private.is_admin()) or (select private.exam_shared_with_me(id, true)))
    and (select private.my_role()) in ('teacher', 'admin')
  );

-- Whoever may change a set, nobody changes who made it (a person it is shared with could otherwise take it over).
create function private.guard_exam_set()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.owner_id is distinct from old.owner_id then
    raise exception 'Không đổi được người tạo của bộ đề thi.';
  end if;
  return new;
end;
$$;
create trigger exam_sets_guard
  before update on public.exam_sets
  for each row execute function private.guard_exam_set();

-- ---------------------------------------------------------------- staff directory

-- Teachers and admins (id, name, username, role) for the share dialog and for naming who made a shared set.
-- With ids: those people. Without: active staff other than the caller, whose name or username contains `term`.
create function public.staff_directory(term text default null, ids uuid[] default null)
returns table (id uuid, full_name text, username text, role public.app_role)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.session_alive();
  if (select private.my_role()) not in ('teacher', 'admin') then
    raise exception 'Chỉ giáo viên và quản trị viên được xem danh sách giáo viên.';
  end if;
  return query
    select p.id, p.full_name, p.username, p.role
    from public.profiles p
    where p.role in ('teacher', 'admin')
      and case
        when ids is not null then p.id = any (ids)
        else p.active and p.id <> (select auth.uid())
          and (coalesce(btrim(term), '') = ''
            or p.full_name ilike '%' || replace(replace(btrim(term), '%', ''), '_', '') || '%'
            or p.username ilike '%' || replace(replace(btrim(term), '%', ''), '_', '') || '%')
      end
    order by p.full_name nulls last, p.username
    limit 30;
end;
$$;
revoke execute on function public.staff_directory(text, uuid[]) from public, anon;
grant execute on function public.staff_directory(text, uuid[]) to authenticated;
