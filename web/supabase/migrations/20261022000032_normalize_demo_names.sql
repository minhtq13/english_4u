-- Demo clean-up (1/2): consistent names.
--  * The practice-exam lessons (<grade>.1.1) repeated "Luyện đề" in both label and title ("Luyện đề 1 - Luyện đề Unit 1 — …");
--    the label keeps "Luyện đề 1", the title is the unit name, like the textbook lessons.
--  * The em dash (—) in lesson names, headings, descriptions, phase names and section titles/hints becomes a hyphen (-),
--    matching the app. Questions, answers, explanations and explain bodies are not touched (answers are compared as typed).

update public.lessons set title = 'My New School', heading = 'Luyện đề 1 - My New School (dạng bài kiểm tra)' where id = '6.1.1';
update public.lessons set title = 'Hobbies', heading = 'Luyện đề 1 - Hobbies (dạng bài kiểm tra)' where id = '7.1.1';
update public.lessons set title = 'Leisure Time', heading = 'Luyện đề 1 - Leisure Time (dạng bài kiểm tra)' where id = '8.1.1';
update public.lessons set title = 'Local Community', heading = 'Luyện đề 1 - Local Community (dạng bài kiểm tra)' where id = '9.1.1';

update public.lessons set
  label = replace(label, '—', '-'),
  title = replace(title, '—', '-'),
  heading = replace(heading, '—', '-'),
  description = replace(description, '—', '-'),
  subtitle = replace(subtitle, '—', '-')
where label like '%—%' or title like '%—%' or heading like '%—%' or description like '%—%' or subtitle like '%—%';

update public.phases set name = replace(name, '—', '-') where name like '%—%';

update public.lesson_sections set
  title = replace(title, '—', '-'),
  hint = replace(hint, '—', '-'),
  time_label = replace(time_label, '—', '-')
where title like '%—%' or hint like '%—%' or time_label like '%—%';
