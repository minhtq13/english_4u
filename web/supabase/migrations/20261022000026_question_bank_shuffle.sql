-- Question bank and per-student shuffling.
--  * question_bank: every auto-graded question the reader may see with its answer key, with its lesson and
--    grade, so teachers can reuse questions in new lessons. security_invoker: the section_items RLS
--    (teachers of the grade, admins) decides what is in it.
--  * class_lessons.shuffle: each student of the class gets the questions (and multiple-choice options)
--    in their own fixed order. Answers stay keyed by the original question number, so grading is unchanged.

alter table public.class_lessons add column shuffle boolean not null default false;
comment on column public.class_lessons.shuffle is 'true = mỗi học sinh nhận thứ tự câu và lựa chọn riêng (chấm không đổi).';

create view public.question_bank
with (security_invoker = true) as
select
  i.id,
  s.type,
  i.prompt,
  i.options,
  i.correct_option,
  i.answers,
  i.words,
  i.explanation,
  i.tag,
  l.id as lesson_id,
  l.label as lesson_label,
  l.title as lesson_title,
  ph.course_id
from public.section_items i
join public.lesson_sections s on s.id = i.section_id
join public.lessons l on l.id = s.lesson_id
join public.phases ph on ph.id = l.phase_id
where s.type in ('mcq', 'typed', 'order');
