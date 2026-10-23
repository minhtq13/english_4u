-- Demo clean-up (2/2): remove the test data made while trying the editor.
--  * Lessons 6.101 "Minh test - Minh test tên bài" (one submitted attempt of 0/3 by dinhphuongthao) and
--    6.102 "Unit 2, Reading 1 - My PC" (2 True/False questions, no attempts). Their sections, questions and class
--    assignments go with them; the attempt is removed first because attempts.lesson_id is ON DELETE RESTRICT.
--  * error_log row "Thêm nhận xét" of hocsinh1 (lesson 6.1) and comment template "Nhận xét template" of giaovien1.
-- Kept on purpose: the other attempts (6.1, 6.1.1, 19.1) as demo results, and the saved structure "Đề kiểm tra 1 tiết".

delete from public.attempt_results where attempt_id in (select id from public.attempts where lesson_id in ('6.101', '6.102'));
delete from public.feedback where attempt_id in (select id from public.attempts where lesson_id in ('6.101', '6.102'));
delete from public.attempts where lesson_id in ('6.101', '6.102');
delete from public.lessons where id in ('6.101', '6.102');
delete from public.error_log where lesson_id = '6.1' and note = 'Thêm nhận xét';
delete from public.comment_templates where body = 'Nhận xét template';
