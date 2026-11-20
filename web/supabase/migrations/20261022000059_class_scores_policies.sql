-- Migration 58 gave each class-score table a select policy for students and a FOR ALL policy for teachers, so
-- every read evaluated two permissive policies (advisor: multiple_permissive_policies). One select policy now covers
-- both, and the teachers' FOR ALL policy becomes separate insert / update / delete policies. Same access as before.
--
-- Rollback: put back the policies of migration 58 (drop the policies below, recreate "<table>: teachers manage" FOR ALL
-- and restore the select policy's using clause).

drop policy "class_sessions: teachers manage" on public.class_sessions;
alter policy "class_sessions: own class reads" on public.class_sessions using (class_id = (select private.my_class_id()) or (select private.teaches_class(class_id)) or (select private.is_admin()));
alter policy "class_sessions: own class reads" on public.class_sessions rename to "class_sessions: read";
create policy "class_sessions: teachers insert" on public.class_sessions for insert to authenticated with check ((select private.teaches_class(class_id)) or (select private.is_admin()));
create policy "class_sessions: teachers update" on public.class_sessions for update to authenticated using ((select private.teaches_class(class_id)) or (select private.is_admin())) with check ((select private.teaches_class(class_id)) or (select private.is_admin()));
create policy "class_sessions: teachers delete" on public.class_sessions for delete to authenticated using ((select private.teaches_class(class_id)) or (select private.is_admin()));

drop policy "score_columns: teachers manage" on public.score_columns;
alter policy "score_columns: own class reads" on public.score_columns using (class_id = (select private.my_class_id()) or (select private.teaches_class(class_id)) or (select private.is_admin()));
alter policy "score_columns: own class reads" on public.score_columns rename to "score_columns: read";
create policy "score_columns: teachers insert" on public.score_columns for insert to authenticated with check ((select private.teaches_class(class_id)) or (select private.is_admin()));
create policy "score_columns: teachers update" on public.score_columns for update to authenticated using ((select private.teaches_class(class_id)) or (select private.is_admin())) with check ((select private.teaches_class(class_id)) or (select private.is_admin()));
create policy "score_columns: teachers delete" on public.score_columns for delete to authenticated using ((select private.teaches_class(class_id)) or (select private.is_admin()));

drop policy "participation: teachers manage" on public.participation_points;
alter policy "participation: own reads" on public.participation_points using (student_id = (select auth.uid()) or (select private.teaches_class(class_id)) or (select private.is_admin()));
alter policy "participation: own reads" on public.participation_points rename to "participation: read";
create policy "participation: teachers insert" on public.participation_points for insert to authenticated with check ((select private.teaches_class(class_id)) or (select private.is_admin()));
create policy "participation: teachers update" on public.participation_points for update to authenticated using ((select private.teaches_class(class_id)) or (select private.is_admin())) with check ((select private.teaches_class(class_id)) or (select private.is_admin()));
create policy "participation: teachers delete" on public.participation_points for delete to authenticated using ((select private.teaches_class(class_id)) or (select private.is_admin()));

drop policy "attendance: teachers manage" on public.attendance;
alter policy "attendance: own reads" on public.attendance using (student_id = (select auth.uid()) or (select private.teaches_class(private.class_of_session(session_id))) or (select private.is_admin()));
alter policy "attendance: own reads" on public.attendance rename to "attendance: read";
create policy "attendance: teachers insert" on public.attendance for insert to authenticated with check ((select private.teaches_class(private.class_of_session(session_id))) or (select private.is_admin()));
create policy "attendance: teachers update" on public.attendance for update to authenticated using ((select private.teaches_class(private.class_of_session(session_id))) or (select private.is_admin())) with check ((select private.teaches_class(private.class_of_session(session_id))) or (select private.is_admin()));
create policy "attendance: teachers delete" on public.attendance for delete to authenticated using ((select private.teaches_class(private.class_of_session(session_id))) or (select private.is_admin()));

drop policy "score_entries: teachers manage" on public.score_entries;
alter policy "score_entries: own reads" on public.score_entries using (student_id = (select auth.uid()) or (select private.teaches_class(private.class_of_column(column_id))) or (select private.is_admin()));
alter policy "score_entries: own reads" on public.score_entries rename to "score_entries: read";
create policy "score_entries: teachers insert" on public.score_entries for insert to authenticated with check ((select private.teaches_class(private.class_of_column(column_id))) or (select private.is_admin()));
create policy "score_entries: teachers update" on public.score_entries for update to authenticated using ((select private.teaches_class(private.class_of_column(column_id))) or (select private.is_admin())) with check ((select private.teaches_class(private.class_of_column(column_id))) or (select private.is_admin()));
create policy "score_entries: teachers delete" on public.score_entries for delete to authenticated using ((select private.teaches_class(private.class_of_column(column_id))) or (select private.is_admin()));
