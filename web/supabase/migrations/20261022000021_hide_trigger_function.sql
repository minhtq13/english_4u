-- guard_class_lesson_removal() is a trigger function; it must not be callable as an RPC.
-- (Triggers run regardless of EXECUTE grants.)
revoke execute on function public.guard_class_lesson_removal() from public, anon, authenticated;
