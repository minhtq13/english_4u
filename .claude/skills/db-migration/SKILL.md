---
name: db-migration
description: Change the Supabase database of the web app (tables, columns, RLS policies, triggers, RPC functions, views, indexes). Use for any schema or permission change, or when verifying how RLS treats a role.
---

# Database migration

The live project (ref `aqguszxitrgbdczvqres`) is changed only through the Supabase MCP. There is no local stack, so every migration lands in production the moment it is applied.

## Steps

1. **Inspect.** Read the newest files in `web/supabase/migrations/` and query the live state you will touch (`pg_policy`, `pg_trigger`, `information_schema.columns`, `pg_indexes`) with read-only `execute_sql`. Done when you can name every policy, trigger and view the change affects.
2. **Write the file** `web/supabase/migrations/<highest prefix + 1>_<snake_name>.sql`, opening with a comment that says why. Follow the SQL rules below. Done when every rule is satisfied.
3. **Apply** it with `apply_migration`, name = the file's `<snake_name>`, query = the file content byte for byte. A `{"status":"declined"}` result means the MCP judged a statement destructive. Rewrite that statement (see the rules), keeping the file and the applied SQL identical.
4. **Verify behaviour** as each affected role with the rollback test below. Done when every new permission is shown both allowed for the role that should have it and refused for one that should not.
5. **Run `get_advisors`** for `security` and `performance`. New findings are fixed, or explained to the user as intended (RPCs that students must call, such as `join_class`, `lesson_items` and `submit_attempt`, always warn).
6. **Sync the app**: add new tables, views, columns and RPCs to `web/app/types/database.types.ts`, update the table list in `web/README.md` when a user-visible table changes, then `npm run typecheck`.

## SQL rules

- The MCP refuses statements it deems destructive: `UPDATE`/`DELETE` without `WHERE` and `DROP`. It also refuses a function whose body contains `DELETE`, even with a `WHERE` (seen with `save_lesson`); for those, ask the user to run the file in Supabase Dashboard → SQL Editor, then check `pg_proc` that it landed. Give every `UPDATE`/`DELETE` a `WHERE`. Change a view with `create or replace view`, keeping its columns in order and appending new ones at the end. Change a policy with `alter policy … using (…) with check (…)`, and rename it with `alter policy … rename to`.
- A new enum value goes in its own migration (`alter type … add value if not exists`) before any migration that uses it.
- Permission helpers live in schema `private` as `language sql stable security definer set search_path = ''`, with `revoke execute … from public, anon` and `grant execute … to authenticated`. Existing helpers: `is_admin`, `my_role`, `my_class_id`, `teaches_class`, `can_manage_user`, `course_of_lesson`, `course_of_phase`, `teaches_course`, `can_see_course`, `can_open_lesson`, `can_work_lesson`, `can_teach_lesson`, `can_edit_lesson`, `lesson_has_attempts`, `results_released`, `scored_items`, `grade_attempt` (grades and submits one attempt; not callable by users).
- A read policy that looks a row up by its own id (e.g. `course_of_lesson(id)`) finds nothing for a row being inserted, and `INSERT … ON CONFLICT DO UPDATE` checks the read policy on the new row. Derive such facts from the row's own columns (`course_of_phase(phase_id)`).
- In policies, wrap per-statement calls as `(select auth.uid())` and `(select private.fn(...))` so Postgres evaluates them once.
- Views are `with (security_invoker = true)` so RLS applies to the reader.
- RPCs called from the browser are `public`, `security definer set search_path = ''`, and check the caller themselves. A trigger bypass flag set with `set_config('app.<flag>', 'on', true)` is switched back `off` right after the statement it covers.
- Trigger functions in `public` are exposed as RPCs unless you `revoke execute … from public, anon, authenticated` (triggers still fire); do it for every new one, especially `security definer` ones.
- Messages in `raise exception` are Vietnamese: the UI shows them to users.
- Index every new foreign key and every column a page filters, joins or sorts on.

## Rollback test

Run the scenario inside one `DO` block that ends by raising its findings, so the whole transaction rolls back and no data changes. Use real accounts from `profiles`, and keep test data to rows inside this block. The user has declined inserting fake `auth.users` rows.

```sql
do $$
declare r jsonb := '{}'; stu uuid;
begin
  select id into stu from public.profiles where email = '<student email>';
  -- setup as postgres (UPDATE … WHERE … is fine here, it is rolled back)
  perform set_config('request.jwt.claims', json_build_object('sub', stu, 'role', 'authenticated')::text, true);
  set local role authenticated;
  r := r || jsonb_build_object('visible_rows', (select count(*) from public.<table>));
  begin
    update public.<table> set <col> = <value> where <cond>;
    r := r || '{"forbidden_update":"allowed!"}';
  exception when others then r := r || jsonb_build_object('forbidden_update', sqlerrm); end;
  raise exception 'TEST %', r;   -- result arrives as the error message; everything rolls back
end $$;
```
