-- Attempts and error log entries point at real lessons.
-- Renaming a lesson id carries over; a lesson with attempts cannot be deleted by accident.
alter table public.attempts
  add constraint attempts_lesson_id_fkey
  foreign key (lesson_id) references public.lessons (id) on update cascade on delete restrict;

alter table public.error_log
  add constraint error_log_lesson_id_fkey
  foreign key (lesson_id) references public.lessons (id) on update cascade on delete set null;

create index attempts_lesson_idx on public.attempts (lesson_id);
create index error_log_lesson_idx on public.error_log (lesson_id);
