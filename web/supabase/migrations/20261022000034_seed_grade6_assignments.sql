-- Seed (grade 6, Unit 1 My New School): a homework sheet, a 15-minute test and a 45-minute test.
--   6.1.2 Bài tập về nhà 1 (position 11)   6.1.3 Kiểm tra 15 phút (16)   6.1.4 Kiểm tra 45 phút (17)
-- Not given to any class: teachers give them with "Giao cho lớp". Items are written with a temporary helper
-- pg_temp.q(lesson, section position, item position, prompt, options, correct, answers, words, explanation, tag, back);
-- list arguments are "|" separated.

create function pg_temp.q(lesson text, sec int, pos int, prompt text, opts text, correct int, answers text, words text, expl text, tag text, back text default null)
returns void language sql as $f$
  insert into public.section_items (section_id, position, prompt, back, options, correct_option, answers, words, explanation, tag)
  select s.id, pos, prompt, back, string_to_array(opts, '|'), correct, string_to_array(answers, '|'), string_to_array(words, '|'), expl, tag
  from public.lesson_sections s where s.lesson_id = lesson and s.position = sec;
$f$;

-- 6.1.2 Bài tập về nhà 1 ------------------------------------------------------------
insert into public.lessons (id, phase_id, position, label, title, description, heading, subtitle)
select '6.1.2', p.id, 11, $$Bài tập về nhà 1$$, $$My New School$$,
  $$Ôn hiện tại đơn và hiện tại tiếp diễn: trắc nghiệm, chia động từ, sắp xếp câu, viết đoạn ngắn$$,
  $$Bài tập về nhà 1 - My New School$$, $$Lớp 6 · Global Success · về nhà, khoảng 20 phút$$
from public.phases p where p.course_id = 'lop-6' and p.position = 10;

insert into public.lesson_sections (lesson_id, position, type, score_key, title, time_label, hint, body, short_input, placeholder) values
  ('6.1.2', 1, 'explain', null, $$Nhắc lại trước khi làm$$, '3 phút', null, $$<p><b>Hai thì cần phân biệt:</b></p>
<div class="box"><b>Hiện tại đơn</b> (thói quen, sự thật): <em class="g">every day, usually, on Mondays</em><br>He / She / It + <b>V-s / es</b>: <i>She goes to school by bike.</i><br>Phủ định và câu hỏi: <b>don't / doesn't</b>, <b>Do / Does</b> + V nguyên mẫu.</div>
<div class="box"><b>Hiện tại tiếp diễn</b> (đang xảy ra): <em class="g">now, at the moment, Look!, Listen!</em><br><b>am / is / are + V-ing</b>: <i>They are playing football now.</i></div>
<div class="warn"><b>Chú ý chính tả:</b> go → goes, watch → watches, study → studies; run → running, swim → swimming (gấp đôi phụ âm cuối).</div>$$, false, null),
  ('6.1.2', 2, 'mcq', 'M', $$Chọn đáp án đúng$$, '5 phút', null, null, false, null),
  ('6.1.2', 3, 'typed', 'G', $$Chia động từ trong ngoặc$$, '6 phút', $$Chỉ gõ phần điền vào chỗ trống.$$, null, true, null),
  ('6.1.2', 4, 'order', 'O', $$Sắp xếp thành câu đúng$$, '3 phút', $$Bấm vào từ để thêm vào câu; bấm lại để bỏ ra.$$, null, false, null),
  ('6.1.2', 5, 'writing', null, $$Giới thiệu trường của em$$, '5 phút',
    $$Viết 5-6 câu: trường của em ở đâu, em thường làm gì ở trường (<b>hiện tại đơn</b>) và bạn bè đang làm gì lúc này (<b>hiện tại tiếp diễn</b>).$$, null, false,
    E'1. My school is ...\n2. Every day, I ...\n3. At break time, my friends and I ...\n4. Now, ...');

select pg_temp.q('6.1.2', 2, 1, $$Lan ___ to school by bus every morning.$$, 'go|goes|is going', 2, null, null, $$every morning → hiện tại đơn; Lan (she) → <b>goes</b>.$$, 'present simple');
select pg_temp.q('6.1.2', 2, 2, $$Be quiet! The teacher ___ at the moment.$$, 'talks|is talking|talk', 2, null, null, $$at the moment → đang diễn ra → <b>is talking</b>.$$, 'present continuous');
select pg_temp.q('6.1.2', 2, 3, $$___ your classmates like Maths?$$, 'Do|Does|Are', 1, null, null, $$classmates = they (số nhiều) → <b>Do</b> + like.$$, 'question form');
select pg_temp.q('6.1.2', 2, 4, $$My friends ___ in the library now.$$, 'study|studies|are studying', 3, null, null, $$now → hiện tại tiếp diễn; my friends (they) → <b>are studying</b>.$$, 'present continuous');
select pg_temp.q('6.1.2', 2, 5, $$We ___ have classes on Sundays.$$, $$don't|doesn't|aren't$$, 1, null, null, $$we → <b>don't</b> + V nguyên mẫu.$$, 'negative');
select pg_temp.q('6.1.2', 2, 6, $$Which word is a school subject?$$, 'ruler|Geography|uniform', 2, null, null, $$<b>Geography</b> (Địa lí) là môn học; ruler = thước kẻ, uniform = đồng phục.$$, 'vocabulary');

select pg_temp.q('6.1.2', 3, 1, $$Nam ___ (play) football with his friends after school.$$, null, null, 'plays', null, $$Thói quen; Nam (he) → <b>plays</b>.$$, 'present simple');
select pg_temp.q('6.1.2', 3, 2, $$Look! The boys ___ (run) in the yard.$$, null, null, 'are running', null, $$Look! → đang diễn ra; run → <b>running</b> (gấp đôi n).$$, 'spelling');
select pg_temp.q('6.1.2', 3, 3, $$My mother ___ (not / work) at my school.$$, null, null, $$doesn't work|does not work$$, null, $$she → <b>doesn't</b> + V nguyên mẫu.$$, 'negative');
select pg_temp.q('6.1.2', 3, 4, $$She ___ (have) English on Mondays and Thursdays.$$, null, null, 'has', null, $$have → <b>has</b> với she (động từ bất quy tắc).$$, 'irregular verb');
select pg_temp.q('6.1.2', 3, 5, $$They ___ (not / study) at the moment. They are having a break.$$, null, null, $$aren't studying|are not studying$$, null, $$at the moment → tiếp diễn, phủ định: <b>aren't + V-ing</b>.$$, 'negative continuous');

select pg_temp.q('6.1.2', 4, 1, null, null, null, $$Every morning our school starts at seven o'clock$$, $$Our school|starts|at seven o'clock|every morning$$, $$every morning → hiện tại đơn; our school (it) → <b>starts</b>.$$, 'present simple');
select pg_temp.q('6.1.2', 4, 2, null, null, null, 'Now the students are playing basketball in the gym', $$The students|are playing|basketball|in the gym|now$$, $$now → hiện tại tiếp diễn: <b>are playing</b>.$$, 'present continuous');
select pg_temp.q('6.1.2', 4, 3, null, null, null, $$On Sundays she doesn't go to school$$, $$She|doesn't|go|to school|on Sundays$$, $$she → <b>doesn't</b> + V nguyên mẫu (go).$$, 'negative');

-- 6.1.3 Kiểm tra 15 phút ------------------------------------------------------------
insert into public.lessons (id, phase_id, position, label, title, description, heading, subtitle)
select '6.1.3', p.id, 16, $$Kiểm tra 15 phút$$, $$My New School$$,
  $$Bài kiểm tra ngắn: trắc nghiệm, chia động từ, tìm lỗi sai (13 câu tự chấm)$$,
  $$Kiểm tra 15 phút - My New School$$, $$Lớp 6 · Global Success · 15 phút$$
from public.phases p where p.course_id = 'lop-6' and p.position = 10;

insert into public.lesson_sections (lesson_id, position, type, score_key, title, time_label, hint, body, short_input) values
  ('6.1.3', 1, 'mcq', 'A', $$Chọn đáp án đúng$$, '5 phút', $$Chọn một đáp án đúng cho mỗi câu.$$, null, false),
  ('6.1.3', 2, 'typed', 'B', $$Chia động từ trong ngoặc$$, '5 phút', $$Chỉ gõ phần điền vào chỗ trống.$$, null, true),
  ('6.1.3', 3, 'error', 'C', $$Tìm lỗi sai$$, '5 phút', $$Chọn phần A, B, C hoặc D bị sai trong mỗi câu.$$, null, false);

select pg_temp.q('6.1.3', 1, 1, $$Mr Hung ___ Maths at our school.$$, 'teach|teaches|is teaching', 2, null, null, $$Nghề nghiệp, việc lặp lại → hiện tại đơn; Mr Hung (he) → <b>teaches</b>.$$, 'present simple');
select pg_temp.q('6.1.3', 1, 2, $$Listen! Someone ___ the piano in the music room.$$, 'plays|play|is playing', 3, null, null, $$Listen! → đang diễn ra → <b>is playing</b>.$$, 'present continuous');
select pg_temp.q('6.1.3', 1, 3, $$___ your school have a swimming pool?$$, 'Do|Does|Is', 2, null, null, $$your school = it (số ít) → <b>Does</b> + have.$$, 'question form');
select pg_temp.q('6.1.3', 1, 4, $$We ___ in the classroom now. We are in the library.$$, $$don't study|aren't studying|doesn't study$$, 2, null, null, $$now → tiếp diễn; phủ định: <b>aren't studying</b>.$$, 'negative continuous');
select pg_temp.q('6.1.3', 1, 5, $$I need a ___ to draw a circle.$$, 'compass|calculator|ruler', 1, null, null, $$<b>compass</b> (com-pa) dùng để vẽ đường tròn; calculator = máy tính, ruler = thước kẻ.$$, 'vocabulary');
select pg_temp.q('6.1.3', 1, 6, $$They ___ their uniforms on Mondays.$$, 'wear|wears|are wearing', 1, null, null, $$on Mondays → thói quen → hiện tại đơn; they → <b>wear</b>.$$, 'present simple');

select pg_temp.q('6.1.3', 2, 1, $$Hoa ___ (go) to bed at ten o'clock.$$, null, null, 'goes', null, $$Thói quen; Hoa (she) → go + es = <b>goes</b>.$$, 'spelling');
select pg_temp.q('6.1.3', 2, 2, $$The children ___ (play) in the yard now.$$, null, null, 'are playing', null, $$now → <b>are playing</b>.$$, 'present continuous');
select pg_temp.q('6.1.3', 2, 3, $$My brother ___ (not / like) Geography.$$, null, null, $$doesn't like|does not like$$, null, $$he → <b>doesn't</b> + V nguyên mẫu.$$, 'negative');
select pg_temp.q('6.1.3', 2, 4, $$Look! It ___ (rain).$$, null, null, 'is raining', null, $$Look! → đang diễn ra: <b>is raining</b>.$$, 'present continuous');

select pg_temp.q('6.1.3', 3, 1, null, $$Our teacher|don't|give|us much homework.$$, 2, null, null, $$Our teacher (số ít) → don't → <b>doesn't</b>.$$, 'present simple');
select pg_temp.q('6.1.3', 3, 2, null, 'Look!|The boys|playing|football in the yard.', 3, null, null, $$Look! → đang diễn ra: playing → <b>are playing</b>.$$, 'present continuous');
select pg_temp.q('6.1.3', 3, 3, null, 'She|is|go|to the library now.', 3, null, null, $$is + V-ing: go → <b>going</b> (is going).$$, 'present continuous');

-- 6.1.4 Kiểm tra 45 phút ------------------------------------------------------------
insert into public.lessons (id, phase_id, position, label, title, description, heading, subtitle)
select '6.1.4', p.id, 17, $$Kiểm tra 45 phút$$, $$My New School$$,
  $$Đề kiểm tra một tiết: phát âm, trọng âm, ngữ pháp, điền đoạn văn, đọc hiểu, nối, tìm lỗi sai, dạng đúng của từ, viết lại câu, viết đoạn văn (39 câu tự chấm)$$,
  $$Kiểm tra 45 phút - My New School$$, $$Lớp 6 · Global Success · 45 phút$$
from public.phases p where p.course_id = 'lop-6' and p.position = 10;

insert into public.lesson_sections (lesson_id, position, type, score_key, title, time_label, hint, body, short_input, placeholder) values
  ('6.1.4', 1, 'mcq', 'P', $$Phát âm$$, '3 phút', $$Chọn từ có phần gạch chân phát âm khác các từ còn lại.$$, null, false, null),
  ('6.1.4', 2, 'mcq', 'S', $$Trọng âm$$, '2 phút', $$Chọn từ có trọng âm chính rơi vào âm tiết khác các từ còn lại.$$, null, false, null),
  ('6.1.4', 3, 'mcq', 'M', $$Ngữ pháp và từ vựng$$, '8 phút', $$Chọn một đáp án đúng cho mỗi câu.$$, null, false, null),
  ('6.1.4', 4, 'mcq', 'C', $$Điền vào đoạn văn$$, '5 phút', $$Đọc đoạn văn và chọn từ đúng cho mỗi chỗ trống (1)-(5).$$,
    $$<p>Hi, I'm Mai. I <b>(1)</b> ________ in grade 6 at Nguyen Du Secondary School. My school <b>(2)</b> ________ a big yard and a library. Every day, I <b>(3)</b> ________ to school by bike with my friend Linh.</p><p>We <b>(4)</b> ________ Maths, English and Science on Mondays. Look! Linh <b>(5)</b> ________ a book in the library. She loves reading.</p>$$, false, null),
  ('6.1.4', 5, 'mcq', 'R', $$Đọc hiểu - True / False$$, '5 phút', $$Đọc đoạn văn rồi chọn True (đúng) hoặc False (sai).$$,
    $$<p>Tom is a new student at Green Hill School. He is eleven years old. His school is not far from his house, so he walks to school every day. Today is Monday and Tom has Science at nine o'clock.</p><p>At break time, Tom usually plays table tennis with his classmates in the gym. His favourite subject is Music because he can play the guitar. Right now, Tom is in the music room. He is practising a new song.</p>$$, false, null),
  ('6.1.4', 6, 'match', 'N', $$Nối$$, '4 phút', $$Nối câu hỏi với câu trả lời phù hợp.$$, null, false, null),
  ('6.1.4', 7, 'error', 'E', $$Tìm lỗi sai$$, '4 phút', $$Chọn phần A, B, C hoặc D bị sai trong mỗi câu.$$, null, false, null),
  ('6.1.4', 8, 'typed', 'W', $$Dạng đúng của từ$$, '4 phút', $$Viết dạng đúng của từ trong ngoặc. Chỉ gõ từ cần điền.$$, null, true, null),
  ('6.1.4', 9, 'typed', 'T', $$Viết lại câu$$, '5 phút', $$Viết lại cả câu sao cho nghĩa không đổi, bắt đầu bằng phần cho sẵn.$$, null, false, null),
  ('6.1.4', 10, 'writing', null, $$Viết về trường của em$$, '5 phút',
    $$Viết 5-6 câu giới thiệu về trường hoặc lớp của em: trường ở đâu, em học những môn gì, em thường làm gì ở trường và bạn bè đang làm gì lúc này.$$, null, false,
    E'1. My school is ...\n2. I have ... on ...\n3. At break time, I usually ...\n4. Now, my friends are ...');

select pg_temp.q('6.1.4', 1, 1, $$Chọn từ có phần gạch chân phát âm khác.$$, '[ch]air|[ch]ess|s[ch]ool|tea[ch]er', 3, null, null, $$s<u>ch</u>ool đọc /k/; các từ còn lại đọc /tʃ/.$$, '/tʃ/');
select pg_temp.q('6.1.4', 1, 2, $$Chọn từ có phần gạch chân phát âm khác.$$, 'b[oo]k|f[oo]d|c[oo]l|m[oo]n', 1, null, null, $$b<u>oo</u>k đọc /ʊ/; các từ còn lại đọc /uː/.$$, '/uː/');
select pg_temp.q('6.1.4', 1, 3, $$Chọn từ có phần gạch chân phát âm khác.$$, '[th]ink|[th]ank|[th]is|[th]ree', 3, null, null, $$<u>th</u>is đọc /ð/; các từ còn lại đọc /θ/.$$, '/θ/');

select pg_temp.q('6.1.4', 2, 1, $$Chọn từ có trọng âm khác.$$, 'teacher|student|homework|computer', 4, null, null, $$com<u>pu</u>ter có trọng âm ở âm tiết thứ 2; các từ còn lại ở âm tiết thứ 1.$$, 'stress');
select pg_temp.q('6.1.4', 2, 2, $$Chọn từ có trọng âm khác.$$, 'subject|English|playground|Geography', 4, null, null, $$Ge<u>og</u>raphy có trọng âm ở âm tiết thứ 2; các từ còn lại ở âm tiết thứ 1.$$, 'stress');

select pg_temp.q('6.1.4', 3, 1, $$Our class ___ at 7.30 every morning.$$, 'start|starts|is starting', 2, null, null, $$every morning → hiện tại đơn; our class (it) → <b>starts</b>.$$, 'present simple');
select pg_temp.q('6.1.4', 3, 2, $$Listen! The girls ___ an English song.$$, 'sing|sings|are singing', 3, null, null, $$Listen! → đang diễn ra; the girls (they) → <b>are singing</b>.$$, 'present continuous');
select pg_temp.q('6.1.4', 3, 3, $$___ you often play sports at break time?$$, 'Are|Do|Does', 2, null, null, $$you → <b>Do</b> + V nguyên mẫu (often là trạng từ tần suất).$$, 'question form');
select pg_temp.q('6.1.4', 3, 4, $$Mr Tan ___ have a car. He goes to school by bike.$$, $$don't|doesn't|isn't$$, 2, null, null, $$Mr Tan (he) → <b>doesn't</b> + have.$$, 'negative');
select pg_temp.q('6.1.4', 3, 5, $$I usually do my ___ in the evening.$$, 'homework|uniform|library', 1, null, null, $$Cụm cố định: <b>do homework</b> (làm bài tập về nhà).$$, 'collocation');
select pg_temp.q('6.1.4', 3, 6, $$Hoa is writing in her ___ now.$$, 'notebook|playground|canteen', 1, null, null, $$Viết vào <b>notebook</b> (vở); playground = sân chơi, canteen = căng-tin.$$, 'vocabulary');
select pg_temp.q('6.1.4', 3, 7, $$What ___ she doing at the moment?$$, 'do|does|is', 3, null, null, $$at the moment → tiếp diễn: What <b>is</b> she doing?$$, 'present continuous');
select pg_temp.q('6.1.4', 3, 8, $$We ___ lunch in the school canteen every day.$$, 'have|has|are having', 1, null, null, $$every day → hiện tại đơn; we → <b>have</b> (have lunch).$$, 'present simple');

select pg_temp.q('6.1.4', 4, 1, '(1)', 'am|is|are|be', 1, null, null, $$Chủ ngữ <b>I</b> → <b>am</b>.$$, 'to be');
select pg_temp.q('6.1.4', 4, 2, '(2)', 'have|has|is having|are having', 2, null, null, $$My school (it, số ít) → <b>has</b> (sở hữu, hiện tại đơn).$$, 'present simple');
select pg_temp.q('6.1.4', 4, 3, '(3)', 'go|goes|is going|going', 1, null, null, $$Every day → hiện tại đơn; I → <b>go</b>.$$, 'present simple');
select pg_temp.q('6.1.4', 4, 4, '(4)', 'has|have|are having|is having', 2, null, null, $$we → <b>have</b>; lịch học lặp lại (on Mondays) → hiện tại đơn.$$, 'present simple');
select pg_temp.q('6.1.4', 4, 5, '(5)', 'reads|read|is reading|reading', 3, null, null, $$Look! → đang diễn ra → <b>is reading</b>.$$, 'present continuous');

select pg_temp.q('6.1.4', 5, 1, $$Tom goes to school by bus.$$, 'True|False', 2, null, null, $$Tom <b>đi bộ</b> đến trường: "he walks to school every day".$$, 'đọc hiểu');
select pg_temp.q('6.1.4', 5, 2, $$Tom has Science on Monday.$$, 'True|False', 1, null, null, $$"Today is Monday and Tom has Science at nine o'clock."$$, 'đọc hiểu');
select pg_temp.q('6.1.4', 5, 3, $$Tom plays table tennis in the schoolyard at break time.$$, 'True|False', 2, null, null, $$Tom chơi bóng bàn <b>trong phòng tập (gym)</b>, không phải ở sân trường.$$, 'đọc hiểu');
select pg_temp.q('6.1.4', 5, 4, $$Tom is practising a song now.$$, 'True|False', 1, null, null, $$"Right now, Tom is in the music room. He is practising a new song."$$, 'đọc hiểu');

select pg_temp.q('6.1.4', 6, 1, $$Where is your school?$$, null, null, null, null, $$Hỏi nơi chốn (Where) → trả lời bằng địa điểm.$$, 'question words', $$It's in the city centre.$$);
select pg_temp.q('6.1.4', 6, 2, $$How many classes does your school have?$$, null, null, null, null, $$Hỏi số lượng (How many) → trả lời bằng số.$$, 'question words', $$It has twenty-four classes.$$);
select pg_temp.q('6.1.4', 6, 3, $$What is Nam doing now?$$, null, null, null, null, $$Câu hỏi thì tiếp diễn → trả lời thì tiếp diễn.$$, 'present continuous', $$He is reading in the library.$$);
select pg_temp.q('6.1.4', 6, 4, $$When does the first lesson start?$$, null, null, null, null, $$Hỏi thời gian (When) → trả lời bằng giờ.$$, 'question words', $$At seven thirty.$$);
select pg_temp.q('6.1.4', 6, 5, $$Do you like Science?$$, null, null, null, null, $$Câu hỏi Yes/No với Do → Yes, I do. / No, I don't.$$, 'question form', $$Yes, I do. It's interesting.$$);

select pg_temp.q('6.1.4', 7, 1, null, 'My mother|work|in a hospital|every day.', 2, null, null, $$My mother (she) → work → <b>works</b>.$$, 'present simple');
select pg_temp.q('6.1.4', 7, 2, null, 'Listen!|The teacher|is talk|to the students.', 3, null, null, $$Listen! → đang diễn ra: is talk → <b>is talking</b>.$$, 'present continuous');
select pg_temp.q('6.1.4', 7, 3, null, 'Does|your brother|goes|to this school?', 3, null, null, $$Sau <b>Does</b> dùng động từ nguyên mẫu: goes → <b>go</b>.$$, 'question form');
select pg_temp.q('6.1.4', 7, 4, null, 'Mai and Lan|is|playing|badminton now.', 2, null, null, $$Mai and Lan (they) → is → <b>are</b>.$$, 'to be');

select pg_temp.q('6.1.4', 8, 1, $$Ms Hoa is a ___ teacher. She is always kind to us. (FRIEND)$$, null, null, 'friendly', null, $$Trước danh từ <i>teacher</i> cần tính từ: friend → <b>friendly</b>.$$, 'word form');
select pg_temp.q('6.1.4', 8, 2, $$I like English because it is ___. (INTEREST)$$, null, null, 'interesting', null, $$Sau <i>is</i> cần tính từ mô tả môn học: <b>interesting</b> (thú vị).$$, 'word form');
select pg_temp.q('6.1.4', 8, 3, $$Nam is a good basketball ___. (PLAY)$$, null, null, 'player', null, $$Cần danh từ chỉ người: play → <b>player</b> (cầu thủ).$$, 'word form');
select pg_temp.q('6.1.4', 8, 4, $$My sister enjoys ___ pictures. (DRAW)$$, null, null, 'drawing', null, $$<b>enjoy + V-ing</b>: draw → drawing.$$, 'V-ing');

select pg_temp.q('6.1.4', 9, 1, $$Lan walks to school. → Lan goes to school …$$, null, null, 'Lan goes to school on foot', null, $$walk = go … <b>on foot</b>.$$, 'on foot');
select pg_temp.q('6.1.4', 9, 2, $$Nam studies at this school. → Does …$$, null, null, $$Does Nam study at this school|Does Nam study at this school?$$, null, $$Câu hỏi hiện tại đơn: <b>Does</b> + S + V nguyên mẫu (study).$$, 'question form');
select pg_temp.q('6.1.4', 9, 3, $$They are watching TV. (negative) → They …$$, null, null, $$They aren't watching TV|They are not watching TV$$, null, $$Phủ định tiếp diễn: be + <b>not</b> + V-ing.$$, 'negative continuous');
select pg_temp.q('6.1.4', 9, 4, $$Mai goes to school by bike. → Mai rides …$$, null, null, 'Mai rides a bike to school|Mai rides her bike to school', null, $$go by bike = <b>ride a bike</b>; chủ ngữ số ít → rides.$$, 'ride a bike');
