-- "Cho làm lại" (let a student redo a lesson) used to be two calls from the browser: delete the attempt's
-- graded results, then reset the attempt to in_progress. A failure between them left a submitted attempt
-- without results. allow_redo() does both in one transaction, with the same permission the two RLS
-- policies gave (private.can_manage_user: the student's teacher, or an admin).

create or replace function public.allow_redo(target uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner uuid;
  st public.attempt_status;
begin
  select a.user_id, a.status into owner, st from public.attempts a where a.id = target;
  if owner is null or not private.can_manage_user(owner) then
    raise exception 'Không tìm thấy bài làm, hoặc bạn không quản lý học sinh này';
  end if;
  if st = 'in_progress' then
    raise exception 'Bài này chưa nộp, học sinh vẫn đang làm';
  end if;
  delete from public.attempt_results r where r.attempt_id = target;
  update public.attempts a set status = 'in_progress', score = '{}'::jsonb where a.id = target;
end;
$$;

revoke execute on function public.allow_redo(uuid) from public, anon;
grant execute on function public.allow_redo(uuid) to authenticated;
