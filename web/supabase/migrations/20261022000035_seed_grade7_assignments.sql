-- Seed (grade 7, Unit 1 Hobbies): a homework sheet, a 15-minute test and a 45-minute test.
--   7.1.2 Bài tập về nhà 1 (position 11)   7.1.3 Kiểm tra 15 phút (16)   7.1.4 Kiểm tra 45 phút (17)
-- Not given to any class: teachers give them with "Giao cho lớp". Items are written with a temporary helper
-- pg_temp.q(lesson, section position, item position, prompt, options, correct, answers, words, explanation, tag, back);
-- list arguments are "|" separated.

create function pg_temp.q(lesson text, sec int, pos int, prompt text, opts text, correct int, answers text, words text, expl text, tag text, back text default null)
returns void language sql as $f$
  insert into public.section_items (section_id, position, prompt, back, options, correct_option, answers, words, explanation, tag)
  select s.id, pos, prompt, back, string_to_array(opts, '|'), correct, string_to_array(answers, '|'), string_to_array(words, '|'), expl, tag
  from public.lesson_sections s where s.lesson_id = lesson and s.position = sec;
$f$;

-- 7.1.2 Bài tập về nhà 1 ------------------------------------------------------------
insert into public.lessons (id, phase_id, position, label, title, description, heading, subtitle)
select '7.1.2', p.id, 11, $$Bài tập về nhà 1$$, $$Hobbies$$,
  $$Ôn hiện tại đơn, trạng từ tần suất và like / enjoy + V-ing: trắc nghiệm, chia động từ, sắp xếp câu, viết đoạn ngắn$$,
  $$Bài tập về nhà 1 - Hobbies$$, $$Lớp 7 · Global Success · về nhà, khoảng 20 phút$$
from public.phases p where p.course_id = 'lop-7' and p.position = 10;

insert into public.lesson_sections (lesson_id, position, type, score_key, title, time_label, hint, body, short_input, placeholder) values
  ('7.1.2', 1, 'explain', null, $$Nhắc lại trước khi làm$$, '3 phút', null, $$<p><b>Ba điều cần nhớ:</b></p>
<div class="box"><b>like / love / enjoy / hate / don't mind + V-ing</b>: <i>She enjoys painting. · I don't mind washing the dishes.</i></div>
<div class="box"><b>Trạng từ tần suất</b> (<em class="g">always, usually, often, sometimes, never</em>) đứng <b>trước động từ thường</b> và <b>sau to be</b>: <i>He often goes fishing. · She is never late.</i></div>
<div class="warn"><b>Chú ý:</b> He / She / It + V-s / es (watch → watches, go → goes, fish → fishes); phủ định và câu hỏi dùng <b>doesn't / Does</b> + V nguyên mẫu.</div>$$, false, null),
  ('7.1.2', 2, 'mcq', 'M', $$Chọn đáp án đúng$$, '5 phút', null, null, false, null),
  ('7.1.2', 3, 'typed', 'G', $$Chia động từ trong ngoặc$$, '6 phút', $$Chỉ gõ phần điền vào chỗ trống.$$, null, true, null),
  ('7.1.2', 4, 'order', 'O', $$Sắp xếp thành câu đúng$$, '3 phút', $$Bấm vào từ để thêm vào câu; bấm lại để bỏ ra.$$, null, false, null),
  ('7.1.2', 5, 'writing', null, $$Sở thích của em$$, '5 phút',
    $$Viết 5-6 câu về sở thích của em: em thích hoạt động gì, thường làm khi nào và với ai. Dùng ít nhất <b>2 trạng từ tần suất</b> và <b>1 câu có like / enjoy + V-ing</b>.$$, null, false,
    E'1. My hobby is ...\n2. I often ...\n3. I enjoy ...\n4. I usually ... with ...');

select pg_temp.q('7.1.2', 2, 1, $$My brother enjoys ___ board games with his friends.$$, 'play|to play|playing', 3, null, null, $$<b>enjoy + V-ing</b> → playing.$$, 'verb + V-ing');
select pg_temp.q('7.1.2', 2, 2, $$She is ___ late for school. She always arrives early.$$, 'always|never|often', 2, null, null, $$"always arrives early" → không bao giờ muộn; trạng từ đứng sau to be → is <b>never</b> late.$$, 'adverbs of frequency');
select pg_temp.q('7.1.2', 2, 3, $$My mother ___ cooking. She cooks every evening.$$, 'love|loves|is loving', 2, null, null, $$Sở thích lặp lại; my mother (she) → <b>loves</b>.$$, 'present simple');
select pg_temp.q('7.1.2', 2, 4, $$___ your father go fishing at weekends?$$, 'Do|Does|Is', 2, null, null, $$your father (he) → <b>Does</b> + V nguyên mẫu.$$, 'question form');
select pg_temp.q('7.1.2', 2, 5, $$I don't mind ___ the dishes after dinner.$$, 'wash|washing|washes', 2, null, null, $$<b>don't mind + V-ing</b>.$$, 'verb + V-ing');
select pg_temp.q('7.1.2', 2, 6, $$Which activity needs a camera?$$, 'taking photos|arranging flowers|collecting coins', 1, null, null, $$<b>Taking photos</b> (chụp ảnh) cần máy ảnh.$$, 'vocabulary');

select pg_temp.q('7.1.2', 3, 1, $$Minh ___ (go) swimming every Sunday.$$, null, null, 'goes', null, $$Thói quen; Minh (he) → go + es = <b>goes</b>.$$, 'spelling');
select pg_temp.q('7.1.2', 3, 2, $$My sister ___ (not / like) cooking.$$, null, null, $$doesn't like|does not like$$, null, $$she → <b>doesn't</b> + V nguyên mẫu.$$, 'negative');
select pg_temp.q('7.1.2', 3, 3, $$He ___ (watch) cartoons after school.$$, null, null, 'watches', null, $$watch → <b>watches</b> (tận cùng -ch thêm -es).$$, 'spelling');
select pg_temp.q('7.1.2', 3, 4, $$I really enjoy ___ (read) comic books.$$, null, null, 'reading', null, $$<b>enjoy + V-ing</b> → reading.$$, 'verb + V-ing');
select pg_temp.q('7.1.2', 3, 5, $$They never ___ (play) video games on school days.$$, null, null, 'play', null, $$never + động từ chia theo they → <b>play</b> (không thêm -s).$$, 'adverbs of frequency');

select pg_temp.q('7.1.2', 4, 1, null, null, null, 'At the weekend my brother often goes fishing', 'My brother|often|goes fishing|at the weekend', $$<b>often</b> đứng trước động từ thường (goes).$$, 'adverbs of frequency');
select pg_temp.q('7.1.2', 4, 2, null, null, null, null, $$She|doesn't|enjoy|playing chess$$, $$doesn't + V nguyên mẫu (enjoy); enjoy + V-ing (playing).$$, 'negative');
select pg_temp.q('7.1.2', 4, 3, null, null, null, null, 'Do|you|like|taking photos', $$Câu hỏi: <b>Do</b> + you + V; like + V-ing.$$, 'question form');

-- 7.1.3 Kiểm tra 15 phút ------------------------------------------------------------
insert into public.lessons (id, phase_id, position, label, title, description, heading, subtitle)
select '7.1.3', p.id, 16, $$Kiểm tra 15 phút$$, $$Hobbies$$,
  $$Bài kiểm tra ngắn: trắc nghiệm, chia động từ, tìm lỗi sai (13 câu tự chấm)$$,
  $$Kiểm tra 15 phút - Hobbies$$, $$Lớp 7 · Global Success · 15 phút$$
from public.phases p where p.course_id = 'lop-7' and p.position = 10;

insert into public.lesson_sections (lesson_id, position, type, score_key, title, time_label, hint, body, short_input) values
  ('7.1.3', 1, 'mcq', 'A', $$Chọn đáp án đúng$$, '5 phút', $$Chọn một đáp án đúng cho mỗi câu.$$, null, false),
  ('7.1.3', 2, 'typed', 'B', $$Chia động từ trong ngoặc$$, '5 phút', $$Chỉ gõ phần điền vào chỗ trống.$$, null, true),
  ('7.1.3', 3, 'error', 'C', $$Tìm lỗi sai$$, '5 phút', $$Chọn phần A, B, C hoặc D bị sai trong mỗi câu.$$, null, false);

select pg_temp.q('7.1.3', 1, 1, $$My uncle ___ painting pictures in his free time.$$, 'like|likes|is liking', 2, null, null, $$Sở thích lặp lại; my uncle (he) → <b>likes</b>.$$, 'present simple');
select pg_temp.q('7.1.3', 1, 2, $$My grandfather ___ gets up early. He gets up at 5 every day.$$, 'always|never|rarely', 1, null, null, $$"every day" → <b>always</b> (luôn luôn); trạng từ đứng trước động từ thường.$$, 'adverbs of frequency');
select pg_temp.q('7.1.3', 1, 3, $$He hates ___ up early on Sundays.$$, 'get|getting|to getting', 2, null, null, $$<b>hate + V-ing</b> → getting.$$, 'verb + V-ing');
select pg_temp.q('7.1.3', 1, 4, $$How often do you play chess? - ___.$$, $$Twice a week|At seven o'clock|For two hours$$, 1, null, null, $$<b>How often</b> hỏi tần suất → Twice a week (hai lần một tuần).$$, 'how often');
select pg_temp.q('7.1.3', 1, 5, $$She has a big ___ of dolls from different countries.$$, 'collection|collect|collector', 1, null, null, $$Sau <i>a big</i> cần danh từ: collect → <b>collection</b> (bộ sưu tập).$$, 'word form');
select pg_temp.q('7.1.3', 1, 6, $$He ___ watches TV in the morning because he goes to school.$$, 'never|always|usually', 1, null, null, $$Buổi sáng đi học nên <b>never</b> (không bao giờ) xem TV; trạng từ đứng trước động từ thường.$$, 'adverbs of frequency');

select pg_temp.q('7.1.3', 2, 1, $$Nga ___ (collect) stamps from many countries.$$, null, null, 'collects', null, $$Nga (she) → <b>collects</b>.$$, 'present simple');
select pg_temp.q('7.1.3', 2, 2, $$My brother ___ (not / play) the guitar.$$, null, null, $$doesn't play|does not play$$, null, $$he → <b>doesn't</b> + V nguyên mẫu.$$, 'negative');
select pg_temp.q('7.1.3', 2, 3, $$Mr Lam ___ (fish) at the lake every Sunday.$$, null, null, 'fishes', null, $$fish → <b>fishes</b> (tận cùng -sh thêm -es).$$, 'spelling');
select pg_temp.q('7.1.3', 2, 4, $$I enjoy ___ (listen) to music in my free time.$$, null, null, 'listening', null, $$<b>enjoy + V-ing</b> → listening.$$, 'verb + V-ing');

select pg_temp.q('7.1.3', 3, 1, null, $$My friend|don't|like|dancing.$$, 2, null, null, $$My friend (số ít) → don't → <b>doesn't</b>.$$, 'present simple');
select pg_temp.q('7.1.3', 3, 2, null, 'She|enjoys|to swim|at weekends.', 3, null, null, $$<b>enjoy + V-ing</b>: to swim → swimming.$$, 'verb + V-ing');
select pg_temp.q('7.1.3', 3, 3, null, 'Does|he|plays|the piano?', 3, null, null, $$Sau <b>Does</b> dùng động từ nguyên mẫu: plays → <b>play</b>.$$, 'question form');

-- 7.1.4 Kiểm tra 45 phút ------------------------------------------------------------
insert into public.lessons (id, phase_id, position, label, title, description, heading, subtitle)
select '7.1.4', p.id, 17, $$Kiểm tra 45 phút$$, $$Hobbies$$,
  $$Đề kiểm tra một tiết: phát âm, trọng âm, ngữ pháp, điền đoạn văn, đọc hiểu, nối, tìm lỗi sai, dạng đúng của từ, viết lại câu, viết đoạn văn (39 câu tự chấm)$$,
  $$Kiểm tra 45 phút - Hobbies$$, $$Lớp 7 · Global Success · 45 phút$$
from public.phases p where p.course_id = 'lop-7' and p.position = 10;

insert into public.lesson_sections (lesson_id, position, type, score_key, title, time_label, hint, body, short_input, placeholder) values
  ('7.1.4', 1, 'mcq', 'P', $$Phát âm$$, '3 phút', $$Chọn từ có phần gạch chân phát âm khác các từ còn lại.$$, null, false, null),
  ('7.1.4', 2, 'mcq', 'S', $$Trọng âm$$, '2 phút', $$Chọn từ có trọng âm chính rơi vào âm tiết khác các từ còn lại.$$, null, false, null),
  ('7.1.4', 3, 'mcq', 'M', $$Ngữ pháp và từ vựng$$, '8 phút', $$Chọn một đáp án đúng cho mỗi câu.$$, null, false, null),
  ('7.1.4', 4, 'mcq', 'C', $$Điền vào đoạn văn$$, '5 phút', $$Đọc đoạn văn và chọn từ đúng cho mỗi chỗ trống (1)-(5).$$,
    $$<p>My name is Quan. My hobby <b>(1)</b> ________ cooking. I often <b>(2)</b> ________ with my mother at weekends. She teaches me how to make simple dishes. I enjoy <b>(3)</b> ________ new recipes from the Internet, too.</p><p>My sister doesn't like cooking, but she <b>(4)</b> ________ eating my food! I think cooking is a <b>(5)</b> ________ hobby because I can make healthy meals for my family.</p>$$, false, null),
  ('7.1.4', 5, 'mcq', 'R', $$Đọc hiểu - True / False$$, '5 phút', $$Đọc đoạn văn rồi chọn True (đúng) hoặc False (sai).$$,
    $$<p>Hi, I'm Linh. I'm thirteen years old and I love taking photos. My uncle gave me an old camera on my last birthday. Now I take photos almost every weekend. I usually go to the park near my house because I like taking pictures of flowers and birds.</p><p>My friend Mai doesn't share my hobby. She prefers dancing. She goes to a dance club twice a week. This Saturday, we have a small photo show at school. I am very excited!</p>$$, false, null),
  ('7.1.4', 6, 'match', 'N', $$Nối$$, '4 phút', $$Nối câu hỏi với câu trả lời phù hợp.$$, null, false, null),
  ('7.1.4', 7, 'error', 'E', $$Tìm lỗi sai$$, '4 phút', $$Chọn phần A, B, C hoặc D bị sai trong mỗi câu.$$, null, false, null),
  ('7.1.4', 8, 'typed', 'W', $$Dạng đúng của từ$$, '4 phút', $$Viết dạng đúng của từ trong ngoặc. Chỉ gõ từ cần điền.$$, null, true, null),
  ('7.1.4', 9, 'typed', 'T', $$Viết lại câu$$, '5 phút', $$Viết lại cả câu sao cho nghĩa không đổi, bắt đầu bằng phần cho sẵn.$$, null, false, null),
  ('7.1.4', 10, 'writing', null, $$Viết về sở thích của em$$, '5 phút',
    $$Viết 5-6 câu về sở thích của em: em thích làm gì, làm khi nào, với ai và vì sao em thích. Dùng trạng từ tần suất và like / enjoy + V-ing.$$, null, false,
    E'1. My hobby is ...\n2. I often ...\n3. I enjoy ...\n4. I like it because ...');

select pg_temp.q('7.1.4', 1, 1, $$Chọn từ có phần gạch chân phát âm khác.$$, '[sh]ip|[ch]ess|[sh]ort|[sh]ine', 2, null, null, $$<u>ch</u>ess đọc /tʃ/; các từ còn lại đọc /ʃ/.$$, '/ʃ/');
select pg_temp.q('7.1.4', 1, 2, $$Chọn từ có phần gạch chân phát âm khác.$$, 'p[ai]nt|w[ai]t|h[ai]r|tr[ai]n', 3, null, null, $$h<u>ai</u>r đọc /eə/; các từ còn lại đọc /eɪ/.$$, '/eɪ/');
select pg_temp.q('7.1.4', 1, 3, $$Chọn từ có phần gạch chân phát âm khác.$$, 'collect[s]|make[s]|enjoy[s]|like[s]', 3, null, null, $$enjoy<u>s</u> đọc /z/ (sau nguyên âm); các từ còn lại đọc /s/ (sau phụ âm vô thanh).$$, 'đuôi -s');

select pg_temp.q('7.1.4', 2, 1, $$Chọn từ có trọng âm khác.$$, 'hobby|collect|garden|paint', 2, null, null, $$col<u>lect</u> có trọng âm ở âm tiết thứ 2; các từ còn lại ở âm tiết thứ 1.$$, 'stress');
select pg_temp.q('7.1.4', 2, 2, $$Chọn từ có trọng âm khác.$$, 'favourite|enjoy|music|pleasure', 2, null, null, $$en<u>joy</u> có trọng âm ở âm tiết thứ 2; các từ còn lại ở âm tiết thứ 1.$$, 'stress');

select pg_temp.q('7.1.4', 3, 1, $$Lan ___ to the gym three times a week.$$, 'go|goes|is going', 2, null, null, $$three times a week → hiện tại đơn; Lan (she) → <b>goes</b>.$$, 'present simple');
select pg_temp.q('7.1.4', 3, 2, $$I ___ like horror films. They scare me.$$, $$don't|doesn't|am not$$, 1, null, null, $$I → <b>don't</b> + like.$$, 'negative');
select pg_temp.q('7.1.4', 3, 3, $$My sister loves ___ new recipes.$$, 'try|trying|to tries', 2, null, null, $$<b>love + V-ing</b> → trying.$$, 'verb + V-ing');
select pg_temp.q('7.1.4', 3, 4, $$I ___ stay up late. I go to bed at 9 every day.$$, 'never|always|usually', 1, null, null, $$Đi ngủ lúc 9 giờ mỗi ngày → <b>never</b> thức khuya.$$, 'adverbs of frequency');
select pg_temp.q('7.1.4', 3, 5, $$___ your cousins enjoy playing board games?$$, 'Do|Does|Are', 1, null, null, $$your cousins (they) → <b>Do</b> + V nguyên mẫu.$$, 'question form');
select pg_temp.q('7.1.4', 3, 6, $$My hobby is ___ stamps.$$, 'collect|collecting|to collects', 2, null, null, $$Sau to be nói về hoạt động: <b>collecting</b> (sưu tầm).$$, 'V-ing');
select pg_temp.q('7.1.4', 3, 7, $$Hung is very ___. He always has new ideas for his models.$$, 'creative|create|creation', 1, null, null, $$Sau <i>is very</i> cần tính từ: <b>creative</b> (sáng tạo).$$, 'word form');
select pg_temp.q('7.1.4', 3, 8, $$Tuan is bored. He doesn't know what to do in his ___ time.$$, 'free|freely|freedom', 1, null, null, $$Cụm cố định: <b>free time</b> (thời gian rảnh).$$, 'collocation');

select pg_temp.q('7.1.4', 4, 1, '(1)', 'is|are|am|be', 1, null, null, $$My hobby (số ít) → <b>is</b>.$$, 'to be');
select pg_temp.q('7.1.4', 4, 2, '(2)', 'cook|cooks|cooking|to cook', 1, null, null, $$I often + V nguyên mẫu → <b>cook</b>.$$, 'present simple');
select pg_temp.q('7.1.4', 4, 3, '(3)', 'try|tries|trying|to try', 3, null, null, $$<b>enjoy + V-ing</b> → trying.$$, 'V-ing');
select pg_temp.q('7.1.4', 4, 4, '(4)', 'love|loves|is loving|loving', 2, null, null, $$she → <b>loves</b> (hiện tại đơn).$$, 'present simple');
select pg_temp.q('7.1.4', 4, 5, '(5)', 'use|useful|usefully|using', 2, null, null, $$Trước danh từ <i>hobby</i> cần tính từ: <b>useful</b> (hữu ích).$$, 'word form');

select pg_temp.q('7.1.4', 5, 1, $$Linh got her camera from her uncle.$$, 'True|False', 1, null, null, $$"My uncle gave me an old camera on my last birthday."$$, 'đọc hiểu');
select pg_temp.q('7.1.4', 5, 2, $$Linh takes photos every day.$$, 'True|False', 2, null, null, $$Linh chụp ảnh <b>hầu như mỗi cuối tuần</b>: "almost every weekend".$$, 'đọc hiểu');
select pg_temp.q('7.1.4', 5, 3, $$Linh likes taking pictures of people.$$, 'True|False', 2, null, null, $$Linh thích chụp <b>hoa và chim</b>: "flowers and birds".$$, 'đọc hiểu');
select pg_temp.q('7.1.4', 5, 4, $$Mai goes to a dance club twice a week.$$, 'True|False', 1, null, null, $$"She goes to a dance club twice a week."$$, 'đọc hiểu');

select pg_temp.q('7.1.4', 6, 1, $$What do you do in your free time?$$, null, null, null, null, $$Hỏi hoạt động lúc rảnh → trả lời bằng việc em làm.$$, 'question words', $$I usually play badminton with my brother.$$);
select pg_temp.q('7.1.4', 6, 2, $$How often do you go cycling?$$, null, null, null, null, $$<b>How often</b> hỏi tần suất → trả lời bằng tần suất.$$, 'question words', $$Twice a week.$$);
select pg_temp.q('7.1.4', 6, 3, $$Does your sister like painting?$$, null, null, null, null, $$Câu hỏi Yes/No với Does → Yes, she does. / No, she doesn't.$$, 'question form', $$Yes, she does. She loves it.$$);
select pg_temp.q('7.1.4', 6, 4, $$Why do you like board games?$$, null, null, null, null, $$<b>Why</b> hỏi lý do → trả lời bằng Because …$$, 'question words', $$Because they are fun and I can play with friends.$$);
select pg_temp.q('7.1.4', 6, 5, $$Who do you play chess with?$$, null, null, null, null, $$<b>Who … with</b> hỏi người cùng làm → trả lời bằng tên người.$$, 'question words', $$I play with my grandfather.$$);

select pg_temp.q('7.1.4', 7, 1, null, $$She|doesn't|likes|painting.$$, 3, null, null, $$Sau <b>doesn't</b> dùng động từ nguyên mẫu: likes → <b>like</b>.$$, 'negative');
select pg_temp.q('7.1.4', 7, 2, null, 'I|enjoy|to play|board games.', 3, null, null, $$<b>enjoy + V-ing</b>: to play → playing.$$, 'V-ing');
select pg_temp.q('7.1.4', 7, 3, null, 'Tom and Jerry|plays|badminton|every Sunday.', 2, null, null, $$Tom and Jerry (they) → plays → <b>play</b>.$$, 'present simple');
select pg_temp.q('7.1.4', 7, 4, null, 'Does|your sister|collects|dolls?', 3, null, null, $$Sau <b>Does</b> dùng động từ nguyên mẫu: collects → <b>collect</b>.$$, 'question form');

select pg_temp.q('7.1.4', 8, 1, $$My brother is very ___. He can paint beautiful pictures. (ART)$$, null, null, 'artistic', null, $$Sau <i>is very</i> cần tính từ: art → <b>artistic</b> (có năng khiếu nghệ thuật).$$, 'word form');
select pg_temp.q('7.1.4', 8, 2, $$Collecting coins is an ___ hobby. (INTEREST)$$, null, null, 'interesting', null, $$Trước danh từ <i>hobby</i> cần tính từ; <i>an</i> + nguyên âm: <b>interesting</b>.$$, 'word form');
select pg_temp.q('7.1.4', 8, 3, $$My grandfather goes to the park ___ in the morning. (REGULAR)$$, null, null, 'regularly', null, $$Bổ nghĩa cho động từ <i>goes</i> cần trạng từ: <b>regularly</b>.$$, 'word form');
select pg_temp.q('7.1.4', 8, 4, $$Gardening is very ___. It helps me feel calm. (RELAX)$$, null, null, 'relaxing', null, $$Sau <i>is very</i> cần tính từ chỉ tính chất của hoạt động: <b>relaxing</b> (thư giãn).$$, 'word form');

select pg_temp.q('7.1.4', 9, 1, $$She likes dancing. (negative) → She …$$, null, null, $$She doesn't like dancing|She does not like dancing$$, null, $$Phủ định hiện tại đơn: <b>doesn't</b> + V nguyên mẫu.$$, 'negative');
select pg_temp.q('7.1.4', 9, 2, $$Hoa goes swimming every Sunday. (question) → Does …$$, null, null, $$Does Hoa go swimming every Sunday|Does Hoa go swimming every Sunday?$$, null, $$Câu hỏi hiện tại đơn: <b>Does</b> + S + V nguyên mẫu (go).$$, 'question form');
select pg_temp.q('7.1.4', 9, 3, $$Nam's hobby is playing the guitar. → Nam …$$, null, null, $$Nam likes playing the guitar|Nam loves playing the guitar|Nam enjoys playing the guitar$$, null, $$Sở thích là làm gì → <b>like / love / enjoy + V-ing</b>.$$, 'verb + V-ing');
select pg_temp.q('7.1.4', 9, 4, $$Mai never watches TV in the morning. → Mai doesn't …$$, null, null, $$Mai doesn't watch TV in the morning|Mai does not watch TV in the morning$$, null, $$<b>never</b> (không bao giờ) = phủ định: doesn't + V nguyên mẫu (watch).$$, 'never');
