-- Seed: Unit 1 for grades 6–9 (Tiếng Anh Global Success — chương trình THCS).
-- One "Học kỳ 1" phase per grade; lesson ids "<grade>.1", label "Unit 1".

insert into public.phases (course_id, position, name) values
  ('lop-6', 10, 'Học kỳ 1'),
  ('lop-7', 10, 'Học kỳ 1'),
  ('lop-8', 10, 'Học kỳ 1'),
  ('lop-9', 10, 'Học kỳ 1');

insert into public.lessons (id, phase_id, position, label, title, description, heading, subtitle)
select v.id, p.id, 10, 'Unit 1', v.title, v.description, v.heading, v.subtitle
from (values
  ('6.1', 'lop-6', 'My New School', 'Hiện tại đơn & hiện tại tiếp diễn', 'Unit 1 — My New School: hiện tại đơn và hiện tại tiếp diễn', 'Lớp 6 · Global Success · 30 phút'),
  ('7.1', 'lop-7', 'Hobbies', 'Hiện tại đơn, trạng từ tần suất, like / enjoy + V-ing', 'Unit 1 — Hobbies: nói về sở thích', 'Lớp 7 · Global Success · 30 phút'),
  ('8.1', 'lop-8', 'Leisure Time', 'Động từ chỉ sở thích + V-ing / to V', 'Unit 1 — Leisure Time: like, love, adore, fancy… + V-ing hay to V?', 'Lớp 8 · Global Success · 30 phút'),
  ('9.1', 'lop-9', 'Local Community', 'Từ để hỏi + to V, phrasal verbs', 'Unit 1 — Local Community: question words + to V và phrasal verbs', 'Lớp 9 · Global Success · 30 phút')
) as v (id, course_id, title, description, heading, subtitle)
join public.phases p on p.course_id = v.course_id and p.position = 10;

-- Sections ----------------------------------------------------------------
insert into public.lesson_sections (lesson_id, position, type, score_key, title, time_label, hint, body, placeholder, short_input) values
  -- Lớp 6
  ('6.1', 1, 'explain', null, 'Khi nào dùng hiện tại đơn, khi nào dùng hiện tại tiếp diễn?', '8 phút · Hiểu logic', null, $h$
      <p><b>Câu hỏi then chốt:</b> việc này <i>thường xuyên xảy ra</i> hay <i>đang xảy ra ngay lúc nói</i>?</p>
      <table>
        <tr><th></th><th>Hiện tại đơn</th><th>Hiện tại tiếp diễn</th></tr>
        <tr><td>Dùng khi</td><td>Thói quen, thời khoá biểu, sự thật</td><td>Việc <b>đang diễn ra</b> lúc nói</td></tr>
        <tr><td>Dấu hiệu</td><td>every day, always, usually, often, sometimes, never, on Mondays</td><td>now, right now, at the moment, Look!, Listen!</td></tr>
        <tr><td>Khẳng định</td><td>I/You/We/They <b>play</b><br>He/She/It <b>plays</b></td><td>I <b>am playing</b> · He <b>is playing</b> · They <b>are playing</b></td></tr>
        <tr><td>Phủ định</td><td>I <b>don't</b> play · She <b>doesn't</b> play</td><td>I'm <b>not</b> playing · She <b>isn't</b> playing</td></tr>
        <tr><td>Câu hỏi</td><td><b>Do</b> you play…? · <b>Does</b> she play…?</td><td><b>Are</b> you playing…? · <b>Is</b> she playing…?</td></tr>
      </table>
      <div class="box">Every day I <em class="g">walk</em> to school. But today it's raining, so my dad <em class="g">is driving</em> me.</div>
      <div class="warn"><b>Lỗi thường gặp:</b><br>
        He <s>go</s> → He <b>goes</b> (thêm -es sau o, s, sh, ch, x: goes, watches, finishes)<br>
        She <s>studys</s> → She <b>studies</b> (phụ âm + y → ies)<br>
        She <s>is study</s> → She <b>is studying</b> · write → <b>writing</b> · swim → <b>swimming</b></div>
      <h3>Động từ đi với môn học, hoạt động ở trường</h3>
      <p><b>have</b> lessons / breakfast · <b>do</b> homework / exercise · <b>play</b> football / the piano · <b>study</b> Maths / Science</p>$h$, null, false),
  ('6.1', 2, 'cards', null, 'Ghi nhớ nhanh', '3 phút · Flashcards', 'Nhìn mặt trước, tự trả lời, rồi bấm để lật.', null, null, false),
  ('6.1', 3, 'mcq', 'M', 'Chọn đáp án đúng', '7 phút · Trắc nghiệm', null, null, null, false),
  ('6.1', 4, 'typed', 'G', 'Chia động từ trong ngoặc', '5 phút · Điền từ', 'Chỉ gõ phần điền vào chỗ trống.', null, null, true),
  ('6.1', 5, 'order', 'O', 'Sắp xếp thành câu đúng', '3 phút · Sắp xếp', 'Bấm vào từ để thêm vào câu; bấm lại để bỏ ra.', null, null, false),
  ('6.1', 6, 'writing', null, 'Ngôi trường mới của em', '4 phút · Tự viết', 'Viết 4–5 câu: <b>2 câu hiện tại đơn</b> (việc em thường làm ở trường) và <b>2 câu hiện tại tiếp diễn</b> (việc đang diễn ra lúc này).', null, $p$1. Every morning, I ...
2. ...
3. Now, my friends are ...
4. ...$p$, false),
  -- Lớp 7
  ('7.1', 1, 'explain', null, 'Nói về sở thích', '8 phút · Hiểu logic', null, $h$
      <h3>① Hiện tại đơn cho sở thích, thói quen</h3>
      <div class="box">I <em class="g">collect</em> stamps. · My sister <em class="g">doesn't like</em> cooking. · <em class="g">Does</em> your brother <em class="g">play</em> chess?</div>
      <h3>② Trạng từ tần suất</h3>
      <table>
        <tr><th>always</th><th>usually</th><th>often</th><th>sometimes</th><th>rarely</th><th>never</th></tr>
        <tr><td>100%</td><td>~90%</td><td>~70%</td><td>~50%</td><td>~10%</td><td>0%</td></tr>
      </table>
      <p><b>Vị trí:</b> đứng <b>trước</b> động từ thường, <b>sau</b> động từ "be".</p>
      <div class="box">She <em class="g">often goes</em> horse riding. · He <em class="g">is always</em> busy at weekends.</div>
      <h3>③ like / love / enjoy / hate / don't mind + V-ing</h3>
      <div class="box">I <em class="g">enjoy gardening</em>. · My grandma <em class="g">loves arranging</em> flowers.</div>
      <div class="warn"><b>Lỗi thường gặp:</b><br>
        He <s>enjoy</s> → He <b>enjoys</b> · She <s>enjoys to make</s> → She <b>enjoys making</b><br>
        He <s>always is</s> late → He <b>is always</b> late</div>
      <p><b>Sở thích thường gặp:</b> collecting dolls / coins, gardening, horse riding, making models, making pottery, arranging flowers, building dollhouses.</p>$h$, null, false),
  ('7.1', 2, 'cards', null, 'Ghi nhớ nhanh', '3 phút · Flashcards', null, null, null, false),
  ('7.1', 3, 'mcq', 'M', 'Chọn đáp án đúng', '7 phút · Trắc nghiệm', null, null, null, false),
  ('7.1', 4, 'typed', 'G', 'Chia động từ trong ngoặc', '5 phút · Điền từ', 'Chỉ gõ phần điền vào chỗ trống.', null, null, true),
  ('7.1', 5, 'order', 'O', 'Sắp xếp thành câu đúng', '3 phút · Sắp xếp', null, null, null, false),
  ('7.1', 6, 'writing', null, 'Sở thích của em', '4 phút · Tự viết', 'Viết 5 câu về sở thích của em và một người bạn: dùng hiện tại đơn, ít nhất <b>2 trạng từ tần suất</b> và <b>like / love / enjoy + V-ing</b>.', null, $p$My hobby is ...
I usually ...$p$, false),
  -- Lớp 8
  ('8.1', 1, 'explain', null, 'Động từ chỉ sở thích đi với V-ing hay to V?', '8 phút · Hiểu logic', null, $h$
      <table>
        <tr><th>Chỉ đi với V-ing</th><th>Đi được với cả V-ing và to V (nghĩa gần như nhau)</th></tr>
        <tr><td><b>adore</b> (rất thích), <b>fancy</b> (thích, muốn), <b>detest</b> (rất ghét), <b>enjoy</b>, <b>don't mind</b> (không phiền)</td>
            <td><b>like</b>, <b>love</b>, <b>hate</b>, <b>prefer</b></td></tr>
      </table>
      <div class="box">
        My brother <em class="g">adores doing</em> DIY. · I <em class="g">don't mind helping</em> you.<br>
        She <em class="g">detests getting up</em> early. · Do you <em class="g">fancy going</em> out tonight?<br>
        My friends <em class="g">like playing</em> / <em class="g">like to play</em> badminton.
      </div>
      <div class="warn"><b>Phân biệt:</b> <b>would like + to V</b> = muốn (một lần cụ thể)<br>
        I <b>like visiting</b> museums. (nói chung) ≠ I'<b>d like to visit</b> the museum tomorrow. (mong muốn)<br>
        <s>enjoy to read</s>, <s>adore to cook</s>, <s>don't mind to help</s> ✘</div>
      <p><b>Hoạt động thời gian rảnh:</b> doing DIY, hanging out with friends, surfing the net, doing puzzles, messaging friends, going cycling.</p>$h$, null, false),
  ('8.1', 2, 'cards', null, 'Ghi nhớ nhanh', '3 phút · Flashcards', null, null, null, false),
  ('8.1', 3, 'mcq', 'M', 'Chọn đáp án đúng', '7 phút · Trắc nghiệm', null, null, null, false),
  ('8.1', 4, 'typed', 'G', 'Chia động từ trong ngoặc', '5 phút · Điền từ', 'Chỉ gõ phần điền vào chỗ trống.', null, null, true),
  ('8.1', 5, 'order', 'O', 'Sắp xếp thành câu đúng', '3 phút · Sắp xếp', null, null, null, false),
  ('8.1', 6, 'writing', null, 'Thời gian rảnh của em', '4 phút · Tự viết', 'Viết 5 câu về hoạt động em làm khi rảnh, dùng ít nhất <b>4 động từ khác nhau</b> trong số: adore, enjoy, fancy, don''t mind, detest, prefer, would like.', null, $p$In my free time, I adore ...$p$, false),
  -- Lớp 9
  ('9.1', 1, 'explain', null, 'Từ để hỏi + to V và phrasal verbs', '8 phút · Hiểu logic', null, $h$
      <h3>① Question words + to V</h3>
      <p>Sau các động từ <b>know, decide, wonder, ask, tell sb, show sb, explain</b>, ta dùng <b>what / where / when / how / who / which + to V</b> thay cho một mệnh đề có "should / can".</p>
      <div class="box">
        I don't know <em class="g">what to do</em>. (= what I should do)<br>
        Can you show me <em class="g">how to get</em> to the community centre?<br>
        We can't decide <em class="g">where to go</em> this weekend.
      </div>
      <div class="warn">Không dùng <b>why + to V</b>: <s>I wonder why to go.</s> → I wonder why I should go.</div>
      <h3>② Phrasal verbs (động từ + giới từ/trạng từ → nghĩa mới)</h3>
      <table>
        <tr><th>Phrasal verb</th><th>Nghĩa</th><th>Ví dụ</th></tr>
        <tr><td>look after</td><td>chăm sóc</td><td>She <em class="g">looks after</em> the community garden.</td></tr>
        <tr><td>set up</td><td>thành lập</td><td>They <em class="g">set up</em> a reading club.</td></tr>
        <tr><td>pass down</td><td>truyền lại (cho thế hệ sau)</td><td>Craftsmen <em class="g">pass down</em> their skills.</td></tr>
        <tr><td>find out</td><td>tìm ra, tìm hiểu</td><td>Let's <em class="g">find out</em> about our village's history.</td></tr>
        <tr><td>turn down</td><td>từ chối</td><td>He <em class="g">turned down</em> the offer.</td></tr>
        <tr><td>come back</td><td>quay lại</td><td>When will you <em class="g">come back</em>?</td></tr>
        <tr><td>close down</td><td>đóng cửa hẳn</td><td>The old cinema <em class="g">closed down</em>.</td></tr>
      </table>$h$, null, false),
  ('9.1', 2, 'cards', null, 'Ghi nhớ nhanh', '3 phút · Flashcards', null, null, null, false),
  ('9.1', 3, 'mcq', 'M', 'Chọn đáp án đúng', '6 phút · Trắc nghiệm', null, null, null, false),
  ('9.1', 4, 'typed', 'T', 'Viết lại câu với từ để hỏi + to V', '4 phút · Viết lại câu', null, null, null, false),
  ('9.1', 5, 'typed', 'G', 'Điền phrasal verb đúng dạng', '3 phút · Điền từ', 'Dùng: look after / find out / turn down / come back. Chỉ gõ phần điền.', null, null, true),
  ('9.1', 6, 'order', 'O', 'Sắp xếp thành câu đúng', '2 phút · Sắp xếp', null, null, null, false),
  ('9.1', 7, 'writing', null, 'Giới thiệu khu phố / làng của em', '4 phút · Tự viết', 'Viết 5 câu: dùng <b>2 cấu trúc từ để hỏi + to V</b> và ít nhất <b>3 phrasal verbs</b>.', null, $p$In my neighbourhood, ...$p$, false);

-- Items -------------------------------------------------------------------
insert into public.section_items (section_id, position, prompt, back, options, correct_option, answers, words, explanation, tag)
select s.id, v.position, v.prompt, v.back, v.options, v.correct_option, v.answers, v.words, v.explanation, v.tag
from (values
  -- 6.1 · cards
  ('6.1', 2, 1, 'every day, usually, on Mondays', 'Hiện tại đơn<br><i>I walk to school every day.</i>', null::text[], null::smallint, null::text[], null::text[], null, null),
  ('6.1', 2, 2, 'now, at the moment, Look!', 'Hiện tại tiếp diễn<br><i>Look! They are playing.</i>', null, null, null, null, null, null),
  ('6.1', 2, 3, 'he / she / it + V…', 'thêm -s / -es<br><i>plays, goes, watches, studies</i>', null, null, null, null, null, null),
  ('6.1', 2, 4, 'am / is / are + ?', 'V-ing<br><i>is reading, are swimming</i>', null, null, null, null, null, null),
  ('6.1', 2, 5, 'Câu hỏi hiện tại đơn', 'Do / Does + S + V?<br><i>Does she like Maths?</i>', null, null, null, null, null, null),
  ('6.1', 2, 6, '___ homework / ___ the piano', 'do homework · play the piano', null, null, null, null, null, null),
  -- 6.1 · mcq
  ('6.1', 3, 1, 'My brother ___ to school by bike every day.', null, array['go', 'goes', 'is going'], 2, null, null, 'every day → hiện tại đơn; he → goes.', 'present simple'),
  ('6.1', 3, 2, 'Look! The students ___ football in the schoolyard.', null, array['play', 'plays', 'are playing'], 3, null, null, 'Look! → đang diễn ra → are playing.', 'present continuous'),
  ('6.1', 3, 3, 'We ___ English on Mondays and Thursdays.', null, array['have', 'has', 'are having'], 1, null, null, 'Thời khoá biểu → hiện tại đơn; we → have.', 'present simple'),
  ('6.1', 3, 4, '___ your best friend live near the school?', null, array['Do', 'Does', 'Is'], 2, null, null, 'Chủ ngữ số ít (your best friend) → Does.', 'question'),
  ('6.1', 3, 5, 'Mai ___ her homework at the moment.', null, array['does', 'is doing', 'do'], 2, null, null, 'at the moment → is doing.', 'present continuous'),
  ('6.1', 3, 6, 'I usually ___ breakfast at 6.30.', null, array['have', 'has', 'am having'], 1, null, null, 'usually → hiện tại đơn; I → have.', 'present simple'),
  ('6.1', 3, 7, 'Listen! Someone ___ the piano in the music room.', null, array['plays', 'is playing', 'play'], 2, null, null, 'Listen! → đang diễn ra.', 'present continuous'),
  ('6.1', 3, 8, 'Minh ___ like Maths. He thinks it''s difficult.', null, array['don''t', 'doesn''t', 'isn''t'], 2, null, null, 'he → doesn''t + V.', 'negative'),
  -- 6.1 · typed (short)
  ('6.1', 4, 1, 'She ___ (study) Science on Tuesdays.', null, null, null, array['studies'], null, 'she + study → studies (phụ âm + y → ies).', 'spelling'),
  ('6.1', 4, 2, 'They ___ (not / wear) uniforms on Saturdays.', null, null, null, array['don''t wear', 'do not wear'], null, 'they → don''t + V.', 'negative'),
  ('6.1', 4, 3, 'Be quiet! The teacher ___ (talk).', null, null, null, array['is talking'], null, 'Be quiet! → đang diễn ra.', 'present continuous'),
  ('6.1', 4, 4, 'My father ___ (watch) the news every evening.', null, null, null, array['watches'], null, 'watch → watches (thêm -es sau ch).', 'spelling'),
  ('6.1', 4, 5, 'What ___ (you / do) now? — I''m reading a book.', null, null, null, array['are you doing'], null, 'now → Are you doing…?', 'present continuous'),
  ('6.1', 4, 6, 'Nam ___ (swim) in the school pool right now.', null, null, null, array['is swimming'], null, 'swim → swimming (gấp đôi m).', 'spelling'),
  -- 6.1 · order
  ('6.1', 5, 1, null, null, null, null, null, array['My school', 'has', 'a big library', 'and', 'a computer room'], 'Sự thật về trường → hiện tại đơn (has).', null),
  ('6.1', 5, 2, null, null, null, null, null, array['We', 'are learning', 'English', 'at the moment'], 'at the moment → hiện tại tiếp diễn.', null),
  ('6.1', 5, 3, null, null, null, null, null, array['Does', 'your teacher', 'give', 'you', 'a lot of homework'], 'Does + S + V…?', null),

  -- 7.1 · cards
  ('7.1', 2, 1, 'always', '100% — luôn luôn', null, null, null, null, null, null),
  ('7.1', 2, 2, 'never', '0% — không bao giờ', null, null, null, null, null, null),
  ('7.1', 2, 3, 'Vị trí trạng từ tần suất', 'trước động từ thường, sau "be"<br><i>She often reads. He is never late.</i>', null, null, null, null, null, null),
  ('7.1', 2, 4, 'enjoy / love / like + ?', 'V-ing<br><i>I enjoy making models.</i>', null, null, null, null, null, null),
  ('7.1', 2, 5, 'He / She + like', 'likes<br><i>She likes gardening.</i>', null, null, null, null, null, null),
  ('7.1', 2, 6, 'Hỏi về tần suất', 'How often…?<br><i>How often do you go swimming?</i>', null, null, null, null, null, null),
  -- 7.1 · mcq
  ('7.1', 3, 1, 'My dad enjoys ___ in the garden at weekends.', null, array['work', 'working', 'to working'], 2, null, null, 'enjoy + V-ing.', 'enjoy + V-ing'),
  ('7.1', 3, 2, 'I ___ go swimming because I''m afraid of water.', null, array['always', 'often', 'never'], 3, null, null, 'Sợ nước → không bao giờ đi bơi → never.', 'frequency'),
  ('7.1', 3, 3, 'Choose the correct sentence:', null, array['He always is late.', 'He is always late.', 'Always he is late.'], 2, null, null, 'Trạng từ tần suất đứng sau "be".', 'frequency position'),
  ('7.1', 3, 4, 'Lan ___ making models. It''s boring for her.', null, array['doesn''t like', 'don''t like', 'likes'], 1, null, null, 'Thấy chán → không thích; Lan → doesn''t like.', 'negative'),
  ('7.1', 3, 5, '___ your brother like horse riding?', null, array['Do', 'Does', 'Is'], 2, null, null, 'your brother (số ít) → Does.', 'question'),
  ('7.1', 3, 6, 'My grandmother loves ___ flowers.', null, array['arrange', 'arranging', 'arranges'], 2, null, null, 'love + V-ing.', 'love + V-ing'),
  ('7.1', 3, 7, 'They usually ___ board games after dinner.', null, array['play', 'plays', 'playing'], 1, null, null, 'they → play.', 'present simple'),
  ('7.1', 3, 8, 'How often do you go jogging? — ___', null, array['Twice a week.', 'At 6 o''clock.', 'In the park.'], 1, null, null, 'How often → hỏi tần suất → Twice a week.', 'how often'),
  -- 7.1 · typed (short)
  ('7.1', 4, 1, 'My sister ___ (not / like) gardening.', null, null, null, array['doesn''t like', 'does not like'], null, 'she → doesn''t + V.', 'negative'),
  ('7.1', 4, 2, 'I enjoy ___ (make) pottery.', null, null, null, array['making'], null, 'enjoy + V-ing; make → making.', 'enjoy + V-ing'),
  ('7.1', 4, 3, 'He ___ (collect) stamps from different countries.', null, null, null, array['collects'], null, 'he → collects.', 'present simple'),
  ('7.1', 4, 4, 'We ___ (often / go) fishing on Sundays.', null, null, null, array['often go'], null, 'Trạng từ tần suất đứng trước động từ thường.', 'frequency position'),
  ('7.1', 4, 5, 'Do you enjoy ___ (cook)?', null, null, null, array['cooking'], null, 'enjoy + V-ing.', 'enjoy + V-ing'),
  -- 7.1 · order
  ('7.1', 5, 1, null, null, null, null, null, array['I', 'usually', 'go', 'cycling', 'with my friends'], 'usually đứng trước động từ thường.', null),
  ('7.1', 5, 2, null, null, null, null, null, array['My mother', 'is', 'never', 'late', 'for work'], 'never đứng sau "be".', null),
  ('7.1', 5, 3, null, null, null, null, null, array['What', 'do you', 'like', 'doing', 'in your free time'], 'like + V-ing.', null),

  -- 8.1 · cards
  ('8.1', 2, 1, 'adore / fancy / detest + ?', 'V-ing<br><i>I adore reading comics.</i>', null, null, null, null, null, null),
  ('8.1', 2, 2, 'like / love / hate / prefer + ?', 'V-ing hoặc to V<br><i>like playing = like to play</i>', null, null, null, null, null, null),
  ('8.1', 2, 3, 'don''t mind + ?', 'V-ing — không phiền<br><i>I don''t mind waiting.</i>', null, null, null, null, null, null),
  ('8.1', 2, 4, 'would like + ?', 'to V — muốn<br><i>I''d like to join the club.</i>', null, null, null, null, null, null),
  ('8.1', 2, 5, 'detest', 'rất ghét (mạnh hơn hate)', null, null, null, null, null, null),
  ('8.1', 2, 6, 'fancy', 'thích, có hứng<br><i>Do you fancy going out?</i>', null, null, null, null, null, null),
  -- 8.1 · mcq
  ('8.1', 3, 1, 'My brother adores ___ DIY projects.', null, array['doing', 'to do', 'do'], 1, null, null, 'adore + V-ing.', 'adore + V-ing'),
  ('8.1', 3, 2, 'I don''t mind ___ the dishes after dinner.', null, array['wash', 'to wash', 'washing'], 3, null, null, 'don''t mind + V-ing.', 'don''t mind + V-ing'),
  ('8.1', 3, 3, 'Do you fancy ___ to the cinema tonight?', null, array['going', 'to go', 'go'], 1, null, null, 'fancy + V-ing.', 'fancy + V-ing'),
  ('8.1', 3, 4, 'She detests ___ up early on Sundays.', null, array['get', 'getting', 'to get'], 2, null, null, 'detest + V-ing.', 'detest + V-ing'),
  ('8.1', 3, 5, 'Mai likes ___ out with her friends at the weekend.', null, array['hang', 'to hang', 'hangs'], 2, null, null, 'like + V-ing hoặc to V → to hang.', 'like + to V'),
  ('8.1', 3, 6, 'I''d like ___ a new board game for my birthday.', null, array['getting', 'to get', 'get'], 2, null, null, 'would like + to V.', 'would like + to V'),
  ('8.1', 3, 7, 'Which sentence is WRONG?', null, array['He enjoys surfing the net.', 'He enjoys to surf the net.', 'He loves to surf the net.'], 2, null, null, 'enjoy chỉ đi với V-ing.', 'enjoy + V-ing'),
  ('8.1', 3, 8, 'My parents prefer ___ at home in the evening.', null, array['staying', 'stay', 'stays'], 1, null, null, 'prefer + V-ing (hoặc to V).', 'prefer'),
  -- 8.1 · typed (short)
  ('8.1', 4, 1, 'Nam detests ___ (do) puzzles.', null, null, null, array['doing'], null, 'detest + V-ing.', 'detest + V-ing'),
  ('8.1', 4, 2, 'Would you like ___ (join) our book club?', null, null, null, array['to join'], null, 'would like + to V.', 'would like + to V'),
  ('8.1', 4, 3, 'I don''t mind ___ (help) you with the project.', null, null, null, array['helping'], null, 'don''t mind + V-ing.', 'don''t mind + V-ing'),
  ('8.1', 4, 4, 'They love ___ (play) volleyball on the beach.', null, null, null, array['playing', 'to play'], null, 'love + V-ing hoặc to V.', 'love'),
  ('8.1', 4, 5, 'My sister fancies ___ (learn) how to make cakes.', null, null, null, array['learning'], null, 'fancy + V-ing.', 'fancy + V-ing'),
  -- 8.1 · order
  ('8.1', 5, 1, null, null, null, null, null, array['My cousin', 'adores', 'messaging', 'her friends', 'online'], 'adore + V-ing.', null),
  ('8.1', 5, 2, null, null, null, null, null, array['I', 'don''t mind', 'doing', 'the housework'], 'don''t mind + V-ing.', null),
  ('8.1', 5, 3, null, null, null, null, null, array['Would you like', 'to go', 'cycling', 'with us'], 'would like + to V.', null),

  -- 9.1 · cards
  ('9.1', 2, 1, 'how to + V', 'cách làm gì<br><i>how to get there</i>', null, null, null, null, null, null),
  ('9.1', 2, 2, 'what to + V', 'làm gì<br><i>I don''t know what to say.</i>', null, null, null, null, null, null),
  ('9.1', 2, 3, 'where to + V', 'ở đâu, đi đâu<br><i>where to park</i>', null, null, null, null, null, null),
  ('9.1', 2, 4, 'look after', 'chăm sóc', null, null, null, null, null, null),
  ('9.1', 2, 5, 'set up', 'thành lập', null, null, null, null, null, null),
  ('9.1', 2, 6, 'pass down', 'truyền lại cho thế hệ sau', null, null, null, null, null, null),
  -- 9.1 · mcq
  ('9.1', 3, 1, 'I don''t know ___ to get to the community centre.', null, array['how', 'why', 'what'], 1, null, null, 'Cách đi đến → how to get.', 'question word + to V'),
  ('9.1', 3, 2, 'Could you tell me ___ to buy fresh vegetables near here?', null, array['where', 'why', 'who'], 1, null, null, 'Mua ở đâu → where to buy.', 'question word + to V'),
  ('9.1', 3, 3, 'We can''t decide ___ to invite to the event.', null, array['who', 'how', 'where'], 1, null, null, 'Mời ai → who to invite.', 'question word + to V'),
  ('9.1', 3, 4, 'The old library ___ last year because few people used it.', null, array['closed down', 'looked after', 'found out'], 1, null, null, 'Đóng cửa hẳn → closed down.', 'phrasal verbs'),
  ('9.1', 3, 5, 'My grandparents ___ me when my parents are at work.', null, array['look after', 'turn down', 'set up'], 1, null, null, 'Chăm sóc → look after.', 'phrasal verbs'),
  ('9.1', 3, 6, 'The volunteers ___ a new reading club for children.', null, array['set up', 'came back', 'passed down'], 1, null, null, 'Thành lập → set up.', 'phrasal verbs'),
  ('9.1', 3, 7, 'These folk songs have been ___ from generation to generation.', null, array['passed down', 'turned down', 'found out'], 1, null, null, 'Truyền lại qua các thế hệ → passed down.', 'phrasal verbs'),
  ('9.1', 3, 8, 'Which sentence is WRONG?', null, array['She explained how to make the pottery.', 'I wonder why to go there.', 'Tell me what to bring.'], 2, null, null, 'Không dùng why + to V.', 'question word + to V'),
  -- 9.1 · typed (rewrite)
  ('9.1', 4, 1, 'I don''t know what I should say. <i>(what + to V)</i>', null, null, null, array['I don''t know what to say.', 'I do not know what to say.'], null, 'what I should say → what to say.', 'question word + to V'),
  ('9.1', 4, 2, 'Can you show me how I can use this machine? <i>(how + to V)</i>', null, null, null, array['Can you show me how to use this machine?'], null, 'how I can use → how to use.', 'question word + to V'),
  ('9.1', 4, 3, 'We are wondering where we should go this weekend. <i>(where + to V)</i>', null, null, null, array['We are wondering where to go this weekend.', 'We''re wondering where to go this weekend.'], null, 'where we should go → where to go.', 'question word + to V'),
  -- 9.1 · typed (phrasal verbs, short)
  ('9.1', 5, 1, 'She ___ (từ chối) the job offer because it was too far from home.', null, null, null, array['turned down'], null, 'Quá khứ của turn down → turned down.', 'phrasal verbs'),
  ('9.1', 5, 2, 'We need to ___ (tìm hiểu) more about the history of our village.', null, null, null, array['find out'], null, 'need to + find out.', 'phrasal verbs'),
  ('9.1', 5, 3, 'When will your uncle ___ (quay lại) from Ho Chi Minh City?', null, null, null, array['come back'], null, 'will + come back.', 'phrasal verbs'),
  ('9.1', 5, 4, 'Who ___ (chăm sóc) the garden in your neighbourhood?', null, null, null, array['looks after'], null, 'Who (số ít) → looks after.', 'phrasal verbs'),
  -- 9.1 · order
  ('9.1', 6, 1, null, null, null, null, null, array['I', 'don''t know', 'where', 'to park', 'my bike'], 'where + to V.', null),
  ('9.1', 6, 2, null, null, null, null, null, array['Local artisans', 'pass down', 'their skills', 'to', 'the next generation'], 'pass down = truyền lại.', null)
) as v (lesson_id, section_position, position, prompt, back, options, correct_option, answers, words, explanation, tag)
join public.lesson_sections s on s.lesson_id = v.lesson_id and s.position = v.section_position;
