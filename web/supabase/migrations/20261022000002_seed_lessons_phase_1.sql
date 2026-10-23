-- Seed: Giai đoạn 1 — Câu phức (tuần 1–4)

insert into public.phases (id, name) values
  (1, 'Giai đoạn 1 — Câu phức (tuần 1–4)'),
  (2, 'Giai đoạn 2 — Modal verbs (tuần 5–7)'),
  (3, 'Giai đoạn 3 — Cấu trúc B2 (tuần 8–11)'),
  (4, 'Giai đoạn 4 — Tổng hợp (tuần 12–13)');

-- Bài 19.1
insert into public.lessons (id, phase_id, position, title, description, heading, subtitle) values
  ('19.1', 1, 10, 'Relative clauses — xác định', 'who / which / that / whose / where / when', 'Relative Clauses — mệnh đề quan hệ xác định', 'Giai đoạn 1 · 30 phút · who / which / that / whose / where / when');
insert into public.lesson_sections (lesson_id, position, type, score_key, title, time_label, hint, body, placeholder, short_input) values
  ('19.1', 1, 'mcq', 'W'::text, 'Kiểm tra nhanh bài cũ', '4 phút · Warm-up'::text, '4 câu chẩn đoán từ các bài đã học — giúp tôi biết phần nào cần ôn lại.'::text, null::text, null::text, false),
  ('19.1', 2, 'explain', null::text, 'Mệnh đề quan hệ dùng để làm gì?', '6 phút · Hiểu logic'::text, null::text, '
      <p><b>Logic:</b> mệnh đề quan hệ <b>xác định danh từ nào</b> bạn đang nói tới. Nó ghép 2 câu thành 1, thay danh từ lặp lại bằng một đại từ quan hệ.</p>
      <div class="box">I know <b>a girl</b>. <b>She</b> speaks five languages.<br>→ I know a girl <em class="g">who</em> speaks five languages.</div>
      <table>
        <tr><th>Từ</th><th>Thay cho</th><th>Ví dụ</th></tr>
        <tr><td><b>who</b></td><td>người</td><td>The man <em class="g">who</em> called you is my boss.</td></tr>
        <tr><td><b>which</b></td><td>vật / con vật</td><td>The phone <em class="g">which</em> I bought is broken.</td></tr>
        <tr><td><b>that</b></td><td>người hoặc vật (chỉ trong mệnh đề xác định)</td><td>The book <em class="g">that</em> you lent me is great.</td></tr>
        <tr><td><b>whose</b> + N</td><td>sở hữu (của ai / của cái gì)</td><td>I have a friend <em class="g">whose</em> father is a pilot.</td></tr>
        <tr><td><b>where</b></td><td>nơi chốn (= in/at which)</td><td>This is the café <em class="g">where</em> we met.</td></tr>
        <tr><td><b>when</b></td><td>thời gian (= on/in which)</td><td>I remember the day <em class="g">when</em> I passed the exam.</td></tr>
      </table>
      <h3>3 quy tắc quan trọng</h3>
      <div class="warn"><b>① Không lặp lại chủ ngữ/tân ngữ</b> — lỗi rất phổ biến của người Việt:<br>
        The man who I met <s>him</s> yesterday… → The man who I met yesterday…</div>
      <div class="warn"><b>② Được bỏ who/which/that khi nó là TÂN NGỮ</b> (phía sau còn chủ ngữ khác):<br>
        The film <s>(that)</s> <b>we</b> watched was boring. ✔ bỏ được<br>
        The film <b>that</b> won the prize was boring. ✘ không bỏ được (that là chủ ngữ của "won")</div>
      <div class="warn"><b>③ where vs which</b> — sau <b>where</b> là một câu đầy đủ; <b>which</b> thì câu sau thiếu chủ ngữ/tân ngữ:<br>
        This is the hotel <b>where</b> we stayed. (stayed <i>in it</i> → nơi chốn)<br>
        This is the hotel <b>which</b> we booked. (booked <i>it</i> → tân ngữ)</div>'::text, null::text, false),
  ('19.1', 3, 'cards', null::text, 'Lật thẻ để ghi nhớ', '3 phút · Flashcards'::text, 'Nhìn mặt trước, tự nói đáp án trong đầu, rồi bấm để lật.'::text, null::text, null::text, false),
  ('19.1', 4, 'mcq', 'M'::text, 'Chọn đại từ quan hệ đúng', '5 phút · Trắc nghiệm'::text, 'Mỗi câu chỉ được chọn 1 lần. Đọc kỹ giải thích khi sai.'::text, null::text, null::text, false),
  ('19.1', 5, 'typed', 'E'::text, 'Mỗi câu có 1 lỗi — viết lại câu đúng', '5 phút · Sửa lỗi'::text, 'Gõ lại cả câu đã sửa rồi bấm Kiểm tra (hoặc Enter).'::text, null::text, null::text, false),
  ('19.1', 6, 'typed', 'C'::text, 'Nối 2 câu thành 1 bằng mệnh đề quan hệ', '4 phút · Nối câu'::text, 'Không dùng dấu phẩy. Có thể có nhiều đáp án đúng.'::text, null::text, null::text, false),
  ('19.1', 7, 'writing', null::text, 'Viết về cuộc sống của bạn', '3 phút · Tự viết'::text, 'Viết 4 câu, mỗi câu dùng một từ: <b>who</b>, <b>which/that</b>, <b>whose</b>, <b>where</b>. Ví dụ: <i>I have a colleague whose hobby is running marathons.</i>'::text, null::text, '1. ...
2. ...
3. ...
4. ...'::text, false);
insert into public.section_items (section_id, position, prompt, back, options, correct_option, answers, words, explanation, tag)
select s.id, v.position, v.prompt, v.back, v.options, v.correct_option, v.answers, v.words, v.explanation, v.tag
from (values
  (1, 1, 'She said she ___ the film before.'::text, null::text, array['has seen', 'had seen', 'saw']::text[], 2::smallint, null::text[], null::text[], 'Reported speech: present perfect → past perfect khi lùi thì.'::text, 'Reported speech'::text),
  (1, 2, 'The bridge ___ in 1990.'::text, null::text, array['built', 'was built', 'has built']::text[], 2::smallint, null::text[], null::text[], 'Cây cầu không tự xây → bị động: was built.'::text, 'Passive'::text),
  (1, 3, 'If I ___ more time, I would learn Japanese.'::text, null::text, array['have', 'had', 'would have']::text[], 2::smallint, null::text[], null::text[], 'Second conditional: If + past simple, would + V.'::text, '2nd conditional'::text),
  (1, 4, 'I''ve lived here ___ 2019.'::text, null::text, array['for', 'since', 'from']::text[], 2::smallint, null::text[], null::text[], 'since + mốc thời gian; for + khoảng thời gian.'::text, 'Present perfect'::text),
  (3, 1, 'who'::text, 'người — chủ ngữ hoặc tân ngữ<br><i>the teacher who helped me</i>'::text, null::text[], null::smallint, null::text[], null::text[], null::text, null::text),
  (3, 2, 'which'::text, 'vật, con vật<br><i>the laptop which I use</i>'::text, null::text[], null::smallint, null::text[], null::text[], null::text, null::text),
  (3, 3, 'whose + N'::text, 'sở hữu<br><i>a boy whose bike was stolen</i>'::text, null::text[], null::smallint, null::text[], null::text[], null::text, null::text),
  (3, 4, 'where'::text, 'nơi chốn + câu đầy đủ<br><i>the town where I grew up</i>'::text, null::text[], null::smallint, null::text[], null::text[], null::text, null::text),
  (3, 5, 'when'::text, 'thời gian<br><i>the year when we met</i>'::text, null::text[], null::smallint, null::text[], null::text[], null::text, null::text),
  (3, 6, 'Bỏ đại từ khi nào?'::text, 'Khi nó là TÂN NGỮ<br><i>the cake (that) she made</i>'::text, null::text[], null::smallint, null::text[], null::text[], null::text, null::text),
  (4, 1, 'The woman ___ lives next door is a doctor.'::text, null::text, array['who', 'which', 'whose']::text[], 1::smallint, null::text[], null::text[], 'Người + làm chủ ngữ của ''lives'' → who.'::text, null::text),
  (4, 2, 'This is the restaurant ___ we had our first date.'::text, null::text, array['which', 'where', 'who']::text[], 2::smallint, null::text[], null::text[], 'Sau chỗ trống là câu đầy đủ ''we had our first date'' → nơi chốn → where.'::text, null::text),
  (4, 3, 'I met a man ___ son plays for Hanoi FC.'::text, null::text, array['who', 'whose', 'that']::text[], 2::smallint, null::text[], null::text[], '''___ son'' = con trai CỦA ông ấy → whose.'::text, null::text),
  (4, 4, 'The bag ___ I left on the bus had my passport in it.'::text, null::text, array['who', 'where', 'which']::text[], 3::smallint, null::text[], null::text[], 'Cái túi (vật) là tân ngữ của ''left'' → which (hoặc that, hoặc bỏ).'::text, null::text),
  (4, 5, 'Do you remember the day ___ we first met?'::text, null::text, array['when', 'which', 'where']::text[], 1::smallint, null::text[], null::text[], 'the day + câu đầy đủ → thời gian → when.'::text, null::text),
  (4, 6, 'The museum ___ we visited was closed on Mondays.'::text, null::text, array['where', 'which', 'whose']::text[], 2::smallint, null::text[], null::text[], 'visited the museum → museum là TÂN NGỮ của ''visited'' → which, không phải where.'::text, null::text),
  (4, 7, 'Students ___ homework is late will lose points.'::text, null::text, array['who', 'whose', 'which']::text[], 2::smallint, null::text[], null::text[], 'bài tập CỦA học sinh → whose + homework.'::text, null::text),
  (4, 8, 'Which sentence is CORRECT?'::text, null::text, array['The car that I bought it is red.', 'The car I bought is red.', 'The car where I bought is red.']::text[], 2::smallint, null::text[], null::text[], 'Car là tân ngữ → bỏ được that. Câu 1 thừa ''it''; câu 3 sai ''where''.'::text, null::text),
  (5, 1, 'The girl who she sits next to me is very funny.'::text, null::text, null::text[], null::smallint, array['The girl who sits next to me is very funny.', 'The girl that sits next to me is very funny.']::text[], null::text[], 'Thừa ''she'' — who đã là chủ ngữ rồi.'::text, null::text),
  (5, 2, 'I lost the watch who my dad gave me.'::text, null::text, null::text[], null::smallint, array['I lost the watch which my dad gave me.', 'I lost the watch that my dad gave me.', 'I lost the watch my dad gave me.']::text[], null::text[], 'Đồng hồ là vật → which/that (hoặc bỏ), không dùng who.'::text, null::text),
  (5, 3, 'That''s the man whose his car was stolen.'::text, null::text, null::text[], null::smallint, array['That''s the man whose car was stolen.', 'That is the man whose car was stolen.']::text[], null::text[], 'whose đã mang nghĩa ''của ông ấy'' → bỏ ''his''.'::text, null::text),
  (5, 4, 'The city which I was born is very small.'::text, null::text, null::text[], null::smallint, array['The city where I was born is very small.', 'The city in which I was born is very small.', 'The city which I was born in is very small.', 'The city that I was born in is very small.', 'The city I was born in is very small.']::text[], null::text[], '''I was born'' là câu đầy đủ, cần ''in'' → where (= in which).'::text, null::text),
  (5, 5, 'The movie that we watched it last night was amazing.'::text, null::text, null::text[], null::smallint, array['The movie that we watched last night was amazing.', 'The movie which we watched last night was amazing.', 'The movie we watched last night was amazing.']::text[], null::text[], 'Thừa ''it'' — that đã là tân ngữ của ''watched''.'::text, null::text),
  (6, 1, 'I have a neighbour. She keeps three cats.'::text, null::text, null::text[], null::smallint, array['I have a neighbour who keeps three cats.', 'I have a neighbour that keeps three cats.', 'I have a neighbor who keeps three cats.', 'I have a neighbor that keeps three cats.']::text[], null::text[], 'She → who (người, chủ ngữ).'::text, null::text),
  (6, 2, 'This is the laptop. I bought it last week.'::text, null::text, null::text[], null::smallint, array['This is the laptop which I bought last week.', 'This is the laptop that I bought last week.', 'This is the laptop I bought last week.']::text[], null::text[], 'it → which/that (tân ngữ) — có thể bỏ.'::text, null::text),
  (6, 3, 'I know a boy. His mother is a famous singer.'::text, null::text, null::text[], null::smallint, array['I know a boy whose mother is a famous singer.']::text[], null::text[], 'His mother → whose mother.'::text, null::text),
  (6, 4, 'We visited the village. My grandparents live there.'::text, null::text, null::text[], null::smallint, array['We visited the village where my grandparents live.', 'We visited the village in which my grandparents live.', 'We visited the village which my grandparents live in.', 'We visited the village that my grandparents live in.', 'We visited the village my grandparents live in.']::text[], null::text[], 'there → where.'::text, null::text)
) as v (section_position, position, prompt, back, options, correct_option, answers, words, explanation, tag)
join public.lesson_sections s on s.lesson_id = '19.1' and s.position = v.section_position;

-- Bài 19.2
insert into public.lessons (id, phase_id, position, title, description, heading, subtitle) values
  ('19.2', 1, 20, 'Relative clauses — không xác định', 'dấu phẩy, không dùng that', 'Relative Clauses — mệnh đề quan hệ không xác định', 'Giai đoạn 1 · 30 phút · dấu phẩy, không dùng that, which thay cả mệnh đề');
insert into public.lesson_sections (lesson_id, position, type, score_key, title, time_label, hint, body, placeholder, short_input) values
  ('19.2', 1, 'mcq', 'W'::text, 'Warm-up', '3 phút · Ôn bài 19.1'::text, null::text, null::text, null::text, false),
  ('19.2', 2, 'explain', null::text, 'Xác định vs Không xác định', '7 phút · Hiểu logic'::text, null::text, '
      <p><b>Câu hỏi then chốt:</b> nếu bỏ mệnh đề đi, người nghe có còn biết bạn đang nói về <i>ai / cái gì</i> không?</p>
      <table>
        <tr><th></th><th>Xác định (defining)</th><th>Không xác định (non-defining)</th></tr>
        <tr><td>Chức năng</td><td>Cần để biết <b>là ai / cái nào</b></td><td>Chỉ <b>thêm thông tin</b>, đã biết là ai rồi</td></tr>
        <tr><td>Dấu phẩy</td><td>Không</td><td><b>Có</b> (2 đầu)</td></tr>
        <tr><td>that</td><td>Dùng được</td><td><b>KHÔNG</b> dùng</td></tr>
        <tr><td>Bỏ đại từ</td><td>Được (nếu là tân ngữ)</td><td><b>KHÔNG</b> được bỏ</td></tr>
      </table>
      <div class="box">
        My brother <b>who lives in Da Nang</b> is a doctor.<br>
        → Tôi có <i>nhiều</i> anh trai; tôi đang nói người sống ở Đà Nẵng.<br><br>
        My brother<b>, who lives in Da Nang,</b> is a doctor.<br>
        → Tôi chỉ có <i>một</i> anh trai; "sống ở Đà Nẵng" chỉ là thông tin thêm.
      </div>
      <h3>Khi nào gần như luôn dùng dấu phẩy?</h3>
      <p>Sau <b>tên riêng</b> (Hanoi, Messi, Mr. Nam), <b>người duy nhất</b> (my mother, my father), hoặc vật đã được xác định rõ.</p>
      <div class="warn"><b>which thay cho cả mệnh đề phía trước:</b><br>
        He passed the exam<b>, which</b> surprised everyone. (cái gây ngạc nhiên = việc anh ấy đỗ)<br>
        <s>He passed the exam, that surprised everyone.</s> ✘</div>'::text, null::text, false),
  ('19.2', 3, 'cards', null::text, 'Ghi nhớ nhanh', '2 phút · Flashcards'::text, null::text, null::text, null::text, false),
  ('19.2', 4, 'mcq', 'M'::text, 'Chọn đáp án đúng', '5 phút · Trắc nghiệm'::text, null::text, null::text, null::text, false),
  ('19.2', 5, 'mcq', 'P'::text, 'Câu này có cần dấu phẩy không?', '4 phút · Dấu phẩy'::text, 'Hãy tự hỏi: bỏ mệnh đề đi, có còn biết là ai/cái gì không?'::text, null::text, null::text, false),
  ('19.2', 6, 'typed', 'E'::text, 'Sửa lỗi sai', '4 phút · Sửa lỗi'::text, 'Viết lại cả câu đúng (giữ dấu phẩy).'::text, null::text, null::text, false),
  ('19.2', 7, 'typed', 'C'::text, 'Nối câu bằng mệnh đề có dấu phẩy', '3 phút · Nối câu'::text, null::text, null::text, null::text, false),
  ('19.2', 8, 'writing', null::text, 'Viết về người và nơi bạn biết', '3 phút · Tự viết'::text, '4 câu có dấu phẩy: 1 câu <b>, who</b> (về một người thân), 1 câu <b>, which</b> (về một thành phố), 1 câu <b>, whose</b>, 1 câu <b>, which</b> thay cả mệnh đề.'::text, null::text, '1. My mother, who ...
2. ...
3. ...
4. ...'::text, false);
insert into public.section_items (section_id, position, prompt, back, options, correct_option, answers, words, explanation, tag)
select s.id, v.position, v.prompt, v.back, v.options, v.correct_option, v.answers, v.words, v.explanation, v.tag
from (values
  (1, 1, 'The house ___ we rented was near the beach.'::text, null::text, array['which', 'where', 'who']::text[], 1::smallint, null::text[], null::text[], 'rented the house → house là tân ngữ → which (không phải where).'::text, 'where vs which'::text),
  (1, 2, 'I talked to a woman ___ daughter studies in Japan.'::text, null::text, array['who', 'whose', 'which']::text[], 2::smallint, null::text[], null::text[], 'con gái CỦA bà ấy → whose.'::text, 'whose'::text),
  (1, 3, 'The man who ___ me the way was very kind.'::text, null::text, array['showed', 'he showed', 'showing']::text[], 1::smallint, null::text[], null::text[], 'who đã là chủ ngữ → không thêm ''he''.'::text, 'thừa đại từ'::text),
  (1, 4, 'This is the gym ___ I work out every morning.'::text, null::text, array['which', 'where', 'that']::text[], 2::smallint, null::text[], null::text[], '''I work out'' là câu đầy đủ → nơi chốn → where.'::text, 'where vs which'::text),
  (3, 1, 'Non-defining = ?'::text, 'Thông tin thêm<br>bỏ đi câu vẫn rõ nghĩa'::text, null::text[], null::smallint, null::text[], null::text[], null::text, null::text),
  (3, 2, 'Dấu phẩy?'::text, 'Có, ở cả 2 đầu mệnh đề<br><i>Hue, which is in central Vietnam, ...</i>'::text, null::text[], null::smallint, null::text[], null::text[], null::text, null::text),
  (3, 3, 'Dùng that?'::text, 'KHÔNG trong mệnh đề có dấu phẩy'::text, null::text[], null::smallint, null::text[], null::text[], null::text, null::text),
  (3, 4, 'Bỏ who/which?'::text, 'KHÔNG được bỏ trong non-defining'::text, null::text[], null::smallint, null::text[], null::text[], null::text, null::text),
  (3, 5, ', which ...'::text, 'Thay cho cả mệnh đề trước<br><i>It rained, which ruined our trip.</i>'::text, null::text[], null::smallint, null::text[], null::text[], null::text, null::text),
  (4, 1, 'Hanoi, ___ is the capital of Vietnam, has over 8 million people.'::text, null::text, array['which', 'that', 'where']::text[], 1::smallint, null::text[], null::text[], 'Có dấu phẩy → không dùng that. Hanoi là chủ ngữ của ''is'' → which.'::text, null::text),
  (4, 2, 'My mother, ___ is 60, still goes jogging every day.'::text, null::text, array['who', 'that', 'whose']::text[], 1::smallint, null::text[], null::text[], 'Người + có dấu phẩy → who.'::text, null::text),
  (4, 3, 'He failed the test, ___ surprised everyone.'::text, null::text, array['which', 'that', 'what']::text[], 1::smallint, null::text[], null::text[], 'which thay cho cả việc ''anh ấy trượt''.'::text, null::text),
  (4, 4, 'Which sentence means ''I have only ONE sister''?'::text, null::text, array['My sister who lives in Hue is a nurse.', 'My sister, who lives in Hue, is a nurse.']::text[], 2::smallint, null::text[], null::text[], 'Có dấu phẩy → thông tin thêm → chỉ có 1 chị/em gái.'::text, null::text),
  (4, 5, '''The students who studied hard passed the exam.'' nghĩa là:'::text, null::text, array['Tất cả học sinh đều đỗ', 'Chỉ những học sinh học chăm mới đỗ']::text[], 2::smallint, null::text[], null::text[], 'Không phẩy → xác định → chỉ nhóm học sinh học chăm.'::text, null::text),
  (4, 6, '''The students, who studied hard, passed the exam.'' nghĩa là:'::text, null::text, array['Tất cả học sinh (và họ đều học chăm) đã đỗ', 'Chỉ một số học sinh đỗ']::text[], 1::smallint, null::text[], null::text[], 'Có phẩy → thông tin thêm về TẤT CẢ học sinh.'::text, null::text),
  (4, 7, 'Mr. Nam, ___ car I borrowed, is my neighbour.'::text, null::text, array['who', 'whose', 'which']::text[], 2::smallint, null::text[], null::text[], 'xe CỦA ông Nam → whose.'::text, null::text),
  (4, 8, 'We stayed at the Sunrise Hotel, ___ we had a great view of the sea.'::text, null::text, array['which', 'where', 'that']::text[], 2::smallint, null::text[], null::text[], '''we had a great view'' là câu đầy đủ → nơi chốn → where.'::text, null::text),
  (5, 1, 'My father who is a teacher loves reading.'::text, null::text, array['Cần dấu phẩy', 'Không cần']::text[], 1::smallint, null::text[], null::text[], 'Bạn chỉ có 1 bố → thông tin thêm → My father, who is a teacher, loves reading.'::text, null::text),
  (5, 2, 'The people who work here are very friendly.'::text, null::text, array['Cần dấu phẩy', 'Không cần']::text[], 2::smallint, null::text[], null::text[], 'Cần biết ''những người nào'' → xác định.'::text, null::text),
  (5, 3, 'Messi who was born in Argentina is a famous footballer.'::text, null::text, array['Cần dấu phẩy', 'Không cần']::text[], 1::smallint, null::text[], null::text[], 'Tên riêng đã xác định → non-defining.'::text, null::text),
  (5, 4, 'I lost the book that you gave me.'::text, null::text, array['Cần dấu phẩy', 'Không cần']::text[], 2::smallint, null::text[], null::text[], 'Cần biết ''quyển sách nào''. Có ''that'' → chắc chắn là defining.'::text, null::text),
  (5, 5, 'Da Lat which I visited last year is famous for its flowers.'::text, null::text, array['Cần dấu phẩy', 'Không cần']::text[], 1::smallint, null::text[], null::text[], 'Tên riêng → Da Lat, which I visited last year, is ...'::text, null::text),
  (6, 1, 'My brother, that works in a bank, is very rich.'::text, null::text, null::text[], null::smallint, array['My brother, who works in a bank, is very rich.']::text[], null::text[], 'Có dấu phẩy → không dùng that.'::text, null::text),
  (6, 2, 'Paris, I visited last summer, is beautiful.'::text, null::text, null::text[], null::smallint, array['Paris, which I visited last summer, is beautiful.']::text[], null::text[], 'Non-defining không được bỏ đại từ.'::text, null::text),
  (6, 3, 'She didn''t call me, that made me sad.'::text, null::text, null::text[], null::smallint, array['She didn''t call me, which made me sad.', 'She did not call me, which made me sad.']::text[], null::text[], 'Thay cả mệnh đề → which.'::text, null::text),
  (6, 4, 'Mr. Tuan, who he teaches us maths, is very strict.'::text, null::text, null::text[], null::smallint, array['Mr. Tuan, who teaches us maths, is very strict.', 'Mr. Tuan, who teaches us math, is very strict.']::text[], null::text[], 'Thừa ''he''.'::text, null::text),
  (7, 1, 'My grandmother is 85. She still cooks every day.'::text, null::text, null::text[], null::smallint, array['My grandmother, who is 85, still cooks every day.']::text[], null::text[], 'Bà chỉ có 1 → non-defining.'::text, null::text),
  (7, 2, 'I passed the exam. This made my parents happy.'::text, null::text, null::text[], null::smallint, array['I passed the exam, which made my parents happy.']::text[], null::text[], 'This = cả việc đỗ → , which.'::text, null::text),
  (7, 3, 'Ha Long Bay is beautiful. Millions of tourists visit it every year.'::text, null::text, null::text[], null::smallint, array['Ha Long Bay, which millions of tourists visit every year, is beautiful.', 'Ha Long Bay, which is visited by millions of tourists every year, is beautiful.', 'Ha Long Bay, which is beautiful, is visited by millions of tourists every year.']::text[], null::text[], 'Tên riêng → non-defining; it → which.'::text, null::text)
) as v (section_position, position, prompt, back, options, correct_option, answers, words, explanation, tag)
join public.lesson_sections s on s.lesson_id = '19.2' and s.position = v.section_position;

-- Bài 20
insert into public.lessons (id, phase_id, position, title, description, heading, subtitle) values
  ('20', 1, 30, 'Relative clauses nâng cao', 'bỏ đại từ, giới từ + which, rút gọn', 'Relative Clauses nâng cao — rút gọn & giới từ', 'Giai đoạn 1 · 30 phút · bỏ đại từ, giới từ + which/whom, V-ing / V3 rút gọn');
insert into public.lesson_sections (lesson_id, position, type, score_key, title, time_label, hint, body, placeholder, short_input) values
  ('20', 1, 'mcq', 'W'::text, 'Warm-up', '3 phút · Ôn bài 19'::text, null::text, null::text, null::text, false),
  ('20', 2, 'explain', null::text, '3 cách làm câu gọn hơn', '7 phút · Hiểu logic'::text, null::text, '
      <h3>① Bỏ đại từ quan hệ khi nó là TÂN NGỮ</h3>
      <div class="box">The song <s>that</s> I love → The song <b>I love</b></div>
      <h3>② Giới từ: đặt cuối (thân mật) hoặc đầu (trang trọng)</h3>
      <div class="box">
        the house <b>(which)</b> I live <b>in</b> &nbsp;— văn nói<br>
        the house <b>in which</b> I live &nbsp;— văn viết<br>
        the person <b>(who)</b> I spoke <b>to</b> = the person <b>to whom</b> I spoke
      </div>
      <div class="warn">Sau giới từ chỉ dùng <b>which</b> (vật) và <b>whom</b> (người). <s>in that</s>, <s>to who</s> ✘</div>
      <h3>③ Rút gọn mệnh đề thành V-ing hoặc V3</h3>
      <table>
        <tr><th>Nghĩa</th><th>Đầy đủ</th><th>Rút gọn</th></tr>
        <tr><td><b>Chủ động</b> → V-ing</td><td>the girl <s>who is</s> singing</td><td>the girl <em class="g">singing</em></td></tr>
        <tr><td><b>Chủ động</b> → V-ing</td><td>people <s>who want</s> to join</td><td>people <em class="g">wanting</em> to join</td></tr>
        <tr><td><b>Bị động</b> → V3</td><td>cars <s>which are</s> made in Japan</td><td>cars <em class="g">made</em> in Japan</td></tr>
        <tr><td>the first/last/only → to V</td><td>the first person <s>who arrived</s></td><td>the first person <em class="g">to arrive</em></td></tr>
      </table>
      <p><b>Mẹo:</b> danh từ <i>tự làm</i> hành động → V-ing. Danh từ <i>bị</i> làm → V3.</p>'::text, null::text, false),
  ('20', 3, 'cards', null::text, 'Ghi nhớ nhanh', '2 phút · Flashcards'::text, null::text, null::text, null::text, false),
  ('20', 4, 'mcq', 'M'::text, 'Chọn đáp án đúng', '6 phút · Trắc nghiệm'::text, null::text, null::text, null::text, false),
  ('20', 5, 'typed', 'T'::text, 'Rút gọn câu theo yêu cầu', '6 phút · Viết lại câu'::text, null::text, null::text, null::text, false),
  ('20', 6, 'order', 'O'::text, 'Sắp xếp thành câu đúng', '3 phút · Sắp xếp'::text, 'Bấm vào từ để thêm vào câu; bấm lại để bỏ ra.'::text, null::text, null::text, false),
  ('20', 7, 'writing', null::text, 'Viết 4 câu', '3 phút · Tự viết'::text, '1 câu bỏ đại từ · 1 câu giới từ + which/whom · 1 câu rút gọn V-ing · 1 câu rút gọn V3.'::text, null::text, '1. The app I use most is ...
2. ...
3. ...
4. ...'::text, false);
insert into public.section_items (section_id, position, prompt, back, options, correct_option, answers, words, explanation, tag)
select s.id, v.position, v.prompt, v.back, v.options, v.correct_option, v.answers, v.words, v.explanation, v.tag
from (values
  (1, 1, 'Lan, ___ you met yesterday, is my cousin.'::text, null::text, array['who', 'that', 'which']::text[], 1::smallint, null::text[], null::text[], 'Có dấu phẩy → không dùng that.'::text, 'non-defining'::text),
  (1, 2, 'He forgot my birthday, ___ really upset me.'::text, null::text, array['which', 'that', 'what']::text[], 1::smallint, null::text[], null::text[], ', which thay cả mệnh đề.'::text, 'non-defining'::text),
  (1, 3, 'The Eiffel Tower, ___ was built in 1889, is in Paris.'::text, null::text, array['which', 'that', 'where']::text[], 1::smallint, null::text[], null::text[], 'Tên riêng + chủ ngữ của ''was built'' → which.'::text, 'non-defining'::text),
  (3, 1, 'Bỏ đại từ'::text, 'khi là tân ngữ<br><i>the film (that) we saw</i>'::text, null::text[], null::smallint, null::text[], null::text[], null::text, null::text),
  (3, 2, 'giới từ + which / whom'::text, '<i>the city in which I live</i><br><i>the man to whom I spoke</i>'::text, null::text[], null::smallint, null::text[], null::text[], null::text, null::text),
  (3, 3, 'Rút gọn chủ động'::text, 'V-ing<br><i>the man standing there</i>'::text, null::text[], null::smallint, null::text[], null::text[], null::text, null::text),
  (3, 4, 'Rút gọn bị động'::text, 'V3<br><i>the money stolen from the bank</i>'::text, null::text[], null::smallint, null::text[], null::text[], null::text, null::text),
  (3, 5, 'the first / only + ?'::text, 'to V<br><i>the only one to pass</i>'::text, null::text[], null::smallint, null::text[], null::text[], null::text, null::text),
  (4, 1, 'The man ___ to my mother is my teacher.'::text, null::text, array['talking', 'talked', 'is talking']::text[], 1::smallint, null::text[], null::text[], 'Người đàn ông tự nói chuyện (chủ động) → talking.'::text, null::text),
  (4, 2, 'Most of the phones ___ in this factory are exported.'::text, null::text, array['making', 'made', 'make']::text[], 2::smallint, null::text[], null::text[], 'Điện thoại được sản xuất (bị động) → made.'::text, null::text),
  (4, 3, 'This is the person ___ I spoke.'::text, null::text, array['to whom', 'whom', 'to who']::text[], 1::smallint, null::text[], null::text[], 'speak to someone → to whom. Sau giới từ không dùng who.'::text, null::text),
  (4, 4, 'The company ___ he works is in District 1.'::text, null::text, array['for which', 'which', 'for that']::text[], 1::smallint, null::text[], null::text[], 'work for a company → for which. Không dùng ''for that''.'::text, null::text),
  (4, 5, 'Anyone ___ to join the club should email me.'::text, null::text, array['wanting', 'wanted', 'wants']::text[], 1::smallint, null::text[], null::text[], 'who wants → wanting (chủ động).'::text, null::text),
  (4, 6, 'She was the first woman ___ the race.'::text, null::text, array['to win', 'winning', 'won']::text[], 1::smallint, null::text[], null::text[], 'the first + to V.'::text, null::text),
  (4, 7, 'Which sentence is WRONG?'::text, null::text, array['The book I''m reading is long.', 'The book is on the table is mine.', 'The book on the table is mine.']::text[], 2::smallint, null::text[], null::text[], 'Không được bỏ ''which'' khi nó là CHỦ NGỮ: The book (which is) on the table → hoặc giữ cả ''which is'', hoặc bỏ cả 2.'::text, null::text),
  (4, 8, 'The houses ___ by the flood will be rebuilt.'::text, null::text, array['destroying', 'destroyed', 'were destroyed']::text[], 2::smallint, null::text[], null::text[], 'Nhà bị lũ phá → bị động → destroyed.'::text, null::text),
  (5, 1, 'The woman who is sitting next to Nam is his wife. <i>(rút gọn)</i>'::text, null::text, null::text[], null::smallint, array['The woman sitting next to Nam is his wife.']::text[], null::text[], 'who is sitting → sitting.'::text, null::text),
  (5, 2, 'The letters which were sent yesterday haven''t arrived. <i>(rút gọn)</i>'::text, null::text, null::text[], null::smallint, array['The letters sent yesterday haven''t arrived.', 'The letters sent yesterday have not arrived.']::text[], null::text[], 'which were sent → sent (bị động).'::text, null::text),
  (5, 3, 'The music that I listen to is mostly jazz. <i>(bỏ đại từ)</i>'::text, null::text, null::text[], null::smallint, array['The music I listen to is mostly jazz.']::text[], null::text[], 'that là tân ngữ → bỏ được.'::text, null::text),
  (5, 4, 'This is the town in which I grew up. <i>(giới từ ra cuối, bỏ which)</i>'::text, null::text, null::text[], null::smallint, array['This is the town I grew up in.']::text[], null::text[], 'in which → ... grew up in.'::text, null::text),
  (5, 5, 'Students who want to take the test must register online. <i>(rút gọn)</i>'::text, null::text, null::text[], null::smallint, array['Students wanting to take the test must register online.']::text[], null::text[], 'who want → wanting.'::text, null::text),
  (6, 1, null::text, null::text, null::text[], null::smallint, null::text[], array['The man', 'sitting', 'next to me', 'was reading', 'a newspaper']::text[], 'sitting next to me = who was sitting next to me.'::text, null::text),
  (6, 2, null::text, null::text, null::text[], null::smallint, null::text[], array['Is this', 'the key', 'you were', 'looking for']::text[], 'Bỏ that (tân ngữ), giới từ ''for'' ở cuối.'::text, null::text),
  (6, 3, null::text, null::text, null::text[], null::smallint, null::text[], array['The language', 'spoken', 'in Brazil', 'is', 'Portuguese']::text[], 'spoken = which is spoken (bị động).'::text, null::text)
) as v (section_position, position, prompt, back, options, correct_option, answers, words, explanation, tag)
join public.lesson_sections s on s.lesson_id = '20' and s.position = v.section_position;

-- Bài 21
insert into public.lessons (id, phase_id, position, title, description, heading, subtitle) values
  ('21', 1, 40, 'Gerund vs Infinitive', 'enjoy doing / decide to do / stop, remember, try', 'Gerund vs Infinitive — V-ing hay to V?', 'Giai đoạn 1 · 30 phút · enjoy doing / decide to do / stop, remember, try');
insert into public.lesson_sections (lesson_id, position, type, score_key, title, time_label, hint, body, placeholder, short_input) values
  ('21', 1, 'mcq', 'W'::text, 'Warm-up', '3 phút · Ôn bài 20'::text, null::text, null::text, null::text, false),
  ('21', 2, 'explain', null::text, 'Khi nào V-ing, khi nào to V?', '7 phút · Hiểu logic'::text, null::text, '
      <p><b>Logic chung (không tuyệt đối nhưng rất hữu ích):</b> <b>to V</b> thường hướng về <i>tương lai / mục đích</i> (want, plan, decide — việc chưa xảy ra). <b>V-ing</b> thường nói về <i>hoạt động nói chung / đã, đang trải qua</i> (enjoy, finish, avoid).</p>
      <table>
        <tr><th>+ V-ing</th><th>+ to V</th></tr>
        <tr><td>enjoy, mind, avoid, finish, keep, suggest, consider, practise, give up, can''t stand</td>
            <td>want, decide, plan, hope, agree, refuse, promise, manage, afford, learn, would like</td></tr>
        <tr><td><b>Sau giới từ</b>: interested in <em class="g">doing</em>, good at <em class="g">cooking</em>, thank you for <em class="g">helping</em></td>
            <td><b>Sau tính từ</b>: easy <em class="g">to learn</em>, happy <em class="g">to help</em><br><b>Mục đích</b>: I came <em class="g">to see</em> you.</td></tr>
      </table>
      <div class="warn"><b>Bẫy:</b> look forward <b>to</b>, be used <b>to</b>, object <b>to</b> — "to" ở đây là GIỚI TỪ → + V-ing.<br>
        I look forward to <s>hear</s> <b>hearing</b> from you.</div>
      <h3>Động từ đổi nghĩa</h3>
      <table>
        <tr><th>Động từ</th><th>+ V-ing</th><th>+ to V</th></tr>
        <tr><td>stop</td><td>ngừng hẳn việc đó<br><i>stop smoking</i></td><td>dừng lại <b>để</b> làm việc khác<br><i>stop to buy bread</i></td></tr>
        <tr><td>remember / forget</td><td>nhớ/quên việc <b>đã làm</b><br><i>I remember meeting her.</i></td><td>nhớ/quên việc <b>cần làm</b><br><i>Remember to lock the door.</i></td></tr>
        <tr><td>try</td><td>thử một cách xem có hiệu quả<br><i>try restarting it</i></td><td>cố gắng (khó)<br><i>try to lift the box</i></td></tr>
        <tr><td>regret</td><td>hối hận đã làm<br><i>I regret saying that.</i></td><td>lấy làm tiếc phải báo<br><i>We regret to inform you...</i></td></tr>
      </table>'::text, null::text, false),
  ('21', 3, 'cards', null::text, 'Ghi nhớ nhanh', '2 phút · Flashcards'::text, null::text, null::text, null::text, false),
  ('21', 4, 'mcq', 'M'::text, 'Chọn đáp án đúng', '6 phút · Trắc nghiệm'::text, null::text, null::text, null::text, false),
  ('21', 5, 'typed', 'G'::text, 'Chia động từ trong ngoặc', '5 phút · Điền từ'::text, 'Chỉ gõ phần điền vào chỗ trống.'::text, null::text, null::text, true),
  ('21', 6, 'typed', 'E'::text, 'Sửa lỗi sai', '4 phút · Sửa lỗi'::text, null::text, null::text, null::text, false),
  ('21', 7, 'writing', null::text, 'Viết về bản thân', '3 phút · Tự viết'::text, '4 câu: điều bạn <b>enjoy</b> làm · điều bạn <b>decided</b> làm năm nay · điều bạn đã <b>stopped</b> làm · điều bạn phải <b>remember</b> làm.'::text, null::text, '1. I enjoy ...
2. ...
3. ...
4. ...'::text, false);
insert into public.section_items (section_id, position, prompt, back, options, correct_option, answers, words, explanation, tag)
select s.id, v.position, v.prompt, v.back, v.options, v.correct_option, v.answers, v.words, v.explanation, v.tag
from (values
  (1, 1, 'The boy ___ in the corner is my son.'::text, null::text, array['standing', 'stood', 'stands']::text[], 1::smallint, null::text[], null::text[], 'Chủ động → V-ing.'::text, 'reduced RC'::text),
  (1, 2, 'The bridge ___ last year is already damaged.'::text, null::text, array['built', 'building', 'was built']::text[], 1::smallint, null::text[], null::text[], 'Bị động → V3.'::text, 'reduced RC'::text),
  (1, 3, 'This is the flat ___ I lived for two years.'::text, null::text, array['in which', 'which', 'in that']::text[], 1::smallint, null::text[], null::text[], 'live in the flat → in which.'::text, 'preposition + which'::text),
  (3, 1, 'enjoy / avoid / finish'::text, '+ V-ing<br><i>I avoid eating late.</i>'::text, null::text[], null::smallint, null::text[], null::text[], null::text, null::text),
  (3, 2, 'want / decide / plan'::text, '+ to V<br><i>We plan to travel.</i>'::text, null::text[], null::smallint, null::text[], null::text[], null::text, null::text),
  (3, 3, 'look forward to'::text, '+ V-ing (to là giới từ)'::text, null::text[], null::smallint, null::text[], null::text[], null::text, null::text),
  (3, 4, 'stop doing vs stop to do'::text, 'ngừng hẳn vs dừng lại để làm'::text, null::text[], null::smallint, null::text[], null::text[], null::text, null::text),
  (3, 5, 'remember doing vs to do'::text, 'nhớ đã làm vs nhớ phải làm'::text, null::text[], null::smallint, null::text[], null::text[], null::text, null::text),
  (3, 6, 'try doing vs try to do'::text, 'thử cách khác vs cố gắng'::text, null::text[], null::smallint, null::text[], null::text[], null::text, null::text),
  (4, 1, 'I enjoy ___ to music while I work.'::text, null::text, array['listening', 'to listen', 'listen']::text[], 1::smallint, null::text[], null::text[], 'enjoy + V-ing.'::text, null::text),
  (4, 2, 'We decided ___ a new car.'::text, null::text, array['buying', 'to buy', 'buy']::text[], 2::smallint, null::text[], null::text[], 'decide + to V.'::text, null::text),
  (4, 3, 'I''m looking forward to ___ you.'::text, null::text, array['see', 'seeing', 'to see']::text[], 2::smallint, null::text[], null::text[], 'look forward to (giới từ) + V-ing.'::text, null::text),
  (4, 4, 'He stopped ___ because it was bad for his health.'::text, null::text, array['smoking', 'to smoke']::text[], 1::smallint, null::text[], null::text[], 'Ngừng hẳn thói quen → stop + V-ing.'::text, null::text),
  (4, 5, 'On the way home, I stopped ___ some bread.'::text, null::text, array['buying', 'to buy']::text[], 2::smallint, null::text[], null::text[], 'Dừng lại ĐỂ mua → stop + to V.'::text, null::text),
  (4, 6, 'Remember ___ the door when you leave.'::text, null::text, array['locking', 'to lock']::text[], 2::smallint, null::text[], null::text[], 'Việc cần làm trong tương lai → to V.'::text, null::text),
  (4, 7, 'I remember ___ this film when I was a child.'::text, null::text, array['watching', 'to watch']::text[], 1::smallint, null::text[], null::text[], 'Nhớ việc đã làm → V-ing.'::text, null::text),
  (4, 8, 'My laptop wouldn''t start, so I tried ___ it.'::text, null::text, array['restarting', 'to restart']::text[], 1::smallint, null::text[], null::text[], 'Thử một cách xem có hiệu quả không → try + V-ing.'::text, null::text),
  (4, 9, 'She is interested in ___ abroad.'::text, null::text, array['study', 'studying', 'to study']::text[], 2::smallint, null::text[], null::text[], 'Sau giới từ in → V-ing.'::text, null::text),
  (4, 10, 'Would you mind ___ the window?'::text, null::text, array['to open', 'opening', 'open']::text[], 2::smallint, null::text[], null::text[], 'mind + V-ing.'::text, null::text),
  (5, 1, 'I can''t afford ___ (buy) a new phone.'::text, null::text, null::text[], null::smallint, array['to buy']::text[], null::text[], 'afford + to V.'::text, null::text),
  (5, 2, 'She avoided ___ (answer) my question.'::text, null::text, null::text[], null::smallint, array['answering']::text[], null::text[], 'avoid + V-ing.'::text, null::text),
  (5, 3, 'He promised ___ (not / be) late again.'::text, null::text, null::text[], null::smallint, array['not to be']::text[], null::text[], 'promise + not to V.'::text, null::text),
  (5, 4, 'It''s difficult ___ (learn) Chinese characters.'::text, null::text, null::text[], null::smallint, array['to learn']::text[], null::text[], 'Sau tính từ → to V.'::text, null::text),
  (5, 5, 'They suggested ___ (go) to the beach.'::text, null::text, null::text[], null::smallint, array['going']::text[], null::text[], 'suggest + V-ing.'::text, null::text),
  (5, 6, 'I regret ___ (not / study) harder at school.'::text, null::text, null::text[], null::smallint, array['not studying', 'not having studied']::text[], null::text[], 'Hối hận việc đã (không) làm → V-ing.'::text, null::text),
  (5, 7, 'We managed ___ (finish) the project on time.'::text, null::text, null::text[], null::smallint, array['to finish']::text[], null::text[], 'manage + to V.'::text, null::text),
  (5, 8, 'Thank you for ___ (help) me.'::text, null::text, null::text[], null::smallint, array['helping']::text[], null::text[], 'Sau giới từ for → V-ing.'::text, null::text),
  (6, 1, 'I want learning English to get a better job.'::text, null::text, null::text[], null::smallint, array['I want to learn English to get a better job.']::text[], null::text[], 'want + to V.'::text, null::text),
  (6, 2, 'She is good at cook Vietnamese food.'::text, null::text, null::text[], null::smallint, array['She is good at cooking Vietnamese food.', 'She''s good at cooking Vietnamese food.']::text[], null::text[], 'good at + V-ing.'::text, null::text),
  (6, 3, 'He refused helping me.'::text, null::text, null::text[], null::smallint, array['He refused to help me.']::text[], null::text[], 'refuse + to V.'::text, null::text),
  (6, 4, 'I look forward to hear from you.'::text, null::text, null::text[], null::smallint, array['I look forward to hearing from you.']::text[], null::text[], 'look forward to + V-ing.'::text, null::text)
) as v (section_position, position, prompt, back, options, correct_option, answers, words, explanation, tag)
join public.lesson_sections s on s.lesson_id = '21' and s.position = v.section_position;

-- Bài 22
insert into public.lessons (id, phase_id, position, title, description, heading, subtitle) values
  ('22', 1, 50, 'Used to / would / be used to', 'thói quen quá khứ vs đã quen', 'Used to / would / be used to / get used to', 'Giai đoạn 1 · 30 phút · thói quen quá khứ vs đã quen với');
insert into public.lesson_sections (lesson_id, position, type, score_key, title, time_label, hint, body, placeholder, short_input) values
  ('22', 1, 'mcq', 'W'::text, 'Warm-up', '3 phút · Ôn bài 21'::text, null::text, null::text, null::text, false),
  ('22', 2, 'explain', null::text, '4 cấu trúc trông giống nhau nhưng nghĩa khác', '7 phút · Hiểu logic'::text, null::text, '
      <table>
        <tr><th>Cấu trúc</th><th>Nghĩa</th><th>Ví dụ</th></tr>
        <tr><td><b>used to + V</b></td><td>Thói quen / trạng thái <b>trong quá khứ</b>, <b>bây giờ không còn</b></td><td>I <em class="g">used to live</em> in Hue. (giờ không sống ở đó nữa)</td></tr>
        <tr><td><b>would + V</b></td><td>Hành động lặp lại trong quá khứ (kể chuyện, hoài niệm)</td><td>Every summer we <em class="g">would swim</em> in the river.</td></tr>
        <tr><td><b>be used to + V-ing / N</b></td><td><b>Đã quen</b> với (trạng thái)</td><td>I <em class="g">am used to getting</em> up early.</td></tr>
        <tr><td><b>get used to + V-ing / N</b></td><td><b>Dần quen</b> với (quá trình)</td><td>You''ll <em class="g">get used to</em> the noise.</td></tr>
      </table>
      <div class="warn"><b>would KHÔNG dùng cho trạng thái</b> (have, be, live, like, know…):<br>
        <s>I would have long hair.</s> → I <b>used to</b> have long hair.</div>
      <div class="warn"><b>Phủ định / câu hỏi:</b> did → use (không có d):<br>
        I <b>didn''t use to</b> like coffee. · <b>Did</b> you <b>use to</b> play football?</div>
      <div class="box"><b>Mẹo phân biệt:</b> có <b>be / get</b> phía trước → "to" là giới từ → <b>V-ing</b>.<br>
        Không có be/get → "used to" + <b>V nguyên mẫu</b>.</div>'::text, null::text, false),
  ('22', 3, 'cards', null::text, 'Ghi nhớ nhanh', '2 phút · Flashcards'::text, null::text, null::text, null::text, false),
  ('22', 4, 'mcq', 'M'::text, 'Chọn đáp án đúng', '6 phút · Trắc nghiệm'::text, null::text, null::text, null::text, false),
  ('22', 5, 'typed', 'G'::text, 'Dùng used to / be used to / get used to + động từ', '5 phút · Điền từ'::text, 'Chỉ gõ phần điền vào chỗ trống.'::text, null::text, null::text, true),
  ('22', 6, 'typed', 'E'::text, 'Sửa lỗi sai', '4 phút · Sửa lỗi'::text, null::text, null::text, null::text, false),
  ('22', 7, 'writing', null::text, 'Hồi nhỏ và bây giờ', '3 phút · Tự viết'::text, '4 câu so sánh tuổi thơ và hiện tại, dùng: <b>used to</b> · <b>would</b> · <b>be used to</b> · <b>get used to</b>.'::text, null::text, '1. When I was a child, I used to ...
2. ...
3. ...
4. ...'::text, false);
insert into public.section_items (section_id, position, prompt, back, options, correct_option, answers, words, explanation, tag)
select s.id, v.position, v.prompt, v.back, v.options, v.correct_option, v.answers, v.words, v.explanation, v.tag
from (values
  (1, 1, 'I''m thinking of ___ my job.'::text, null::text, array['changing', 'to change', 'change']::text[], 1::smallint, null::text[], null::text[], 'Sau giới từ of → V-ing.'::text, 'gerund'::text),
  (1, 2, 'Don''t forget ___ me when you arrive.'::text, null::text, array['to call', 'calling']::text[], 1::smallint, null::text[], null::text[], 'Việc cần làm → to V.'::text, 'forget to/-ing'::text),
  (1, 3, 'They agreed ___ the price.'::text, null::text, array['to lower', 'lowering']::text[], 1::smallint, null::text[], null::text[], 'agree + to V.'::text, 'infinitive'::text),
  (3, 1, 'used to + V'::text, 'quá khứ, giờ không còn'::text, null::text[], null::smallint, null::text[], null::text[], null::text, null::text),
  (3, 2, 'would + V'::text, 'hành động lặp lại trong quá khứ<br>(không dùng cho trạng thái)'::text, null::text[], null::smallint, null::text[], null::text[], null::text, null::text),
  (3, 3, 'be used to + V-ing'::text, 'đã quen với'::text, null::text[], null::smallint, null::text[], null::text[], null::text, null::text),
  (3, 4, 'get used to + V-ing'::text, 'dần quen với'::text, null::text[], null::smallint, null::text[], null::text[], null::text, null::text),
  (3, 5, 'didn''t ___ to'::text, 'use (không có d)'::text, null::text[], null::smallint, null::text[], null::text[], null::text, null::text),
  (3, 6, 'I used to live vs I''m used to living'::text, 'Đã từng sống (giờ thôi) vs Đã quen với việc sống'::text, null::text[], null::smallint, null::text[], null::text[], null::text, null::text),
  (4, 1, 'I ___ play football every weekend when I was a kid.'::text, null::text, array['used to', 'am used to', 'use to']::text[], 1::smallint, null::text[], null::text[], 'Thói quen quá khứ → used to + V.'::text, null::text),
  (4, 2, 'She ___ have long hair, but now it''s short.'::text, null::text, array['used to', 'would', 'is used to']::text[], 1::smallint, null::text[], null::text[], '''have'' là trạng thái → không dùng would.'::text, null::text),
  (4, 3, 'I''ve lived in Hanoi for 10 years, so I ___ the traffic.'::text, null::text, array['used to', 'am used to', 'get used to']::text[], 2::smallint, null::text[], null::text[], 'Đã quen (trạng thái hiện tại) → am used to.'::text, null::text),
  (4, 4, 'It took me months to ___ driving on the left.'::text, null::text, array['get used to', 'use to', 'used to']::text[], 1::smallint, null::text[], null::text[], 'Quá trình làm quen → get used to.'::text, null::text),
  (4, 5, 'Did you ___ go to school by bike?'::text, null::text, array['use to', 'used to']::text[], 1::smallint, null::text[], null::text[], 'Sau did → use to.'::text, null::text),
  (4, 6, 'Every summer, my grandfather ___ take us fishing.'::text, null::text, array['would', 'was used to', 'is used to']::text[], 1::smallint, null::text[], null::text[], 'Hành động lặp lại trong quá khứ → would (hoặc used to).'::text, null::text),
  (4, 7, 'I''m not used to ___ so early.'::text, null::text, array['get up', 'getting up', 'got up']::text[], 2::smallint, null::text[], null::text[], 'be used to + V-ing.'::text, null::text),
  (4, 8, 'We ___ have a dog, but it died last year.'::text, null::text, array['would', 'used to', 'were used to']::text[], 2::smallint, null::text[], null::text[], 'have a dog = trạng thái → used to.'::text, null::text),
  (5, 1, 'When I was young, I ___ (eat) a lot of sweets.'::text, null::text, null::text[], null::smallint, array['used to eat', 'would eat']::text[], null::text[], 'Thói quen quá khứ.'::text, null::text),
  (5, 2, 'Don''t worry. You''ll soon ___ (work) at night.'::text, null::text, null::text[], null::smallint, array['get used to working']::text[], null::text[], 'will + get used to + V-ing.'::text, null::text),
  (5, 3, 'My dad ___ (not / like) coffee, but now he drinks it every day.'::text, null::text, null::text[], null::smallint, array['didn''t use to like', 'did not use to like']::text[], null::text[], 'Phủ định: didn''t use to; ''like'' là trạng thái nên không dùng would.'::text, null::text),
  (5, 4, 'She is a nurse, so she ___ (work) long hours.'::text, null::text, null::text[], null::smallint, array['is used to working']::text[], null::text[], 'Đã quen → be used to + V-ing.'::text, null::text),
  (5, 5, 'I can''t ___ (sleep) in this noisy room.'::text, null::text, null::text[], null::smallint, array['get used to sleeping']::text[], null::text[], 'can''t + get used to + V-ing.'::text, null::text),
  (5, 6, 'In the past, people ___ (write) letters instead of emails.'::text, null::text, null::text[], null::smallint, array['used to write', 'would write']::text[], null::text[], 'Thói quen quá khứ.'::text, null::text),
  (6, 1, 'I am used to get up at 6 a.m.'::text, null::text, null::text[], null::smallint, array['I am used to getting up at 6 a.m.', 'I''m used to getting up at 6 a.m.']::text[], null::text[], 'be used to + V-ing.'::text, null::text),
  (6, 2, 'I use to play the piano when I was young.'::text, null::text, null::text[], null::smallint, array['I used to play the piano when I was young.']::text[], null::text[], 'Khẳng định quá khứ → used to.'::text, null::text),
  (6, 3, 'When I was a child, I would have a cat.'::text, null::text, null::text[], null::smallint, array['When I was a child, I used to have a cat.']::text[], null::text[], 'have = trạng thái → used to.'::text, null::text),
  (6, 4, 'Did you used to work here?'::text, null::text, null::text[], null::smallint, array['Did you use to work here?']::text[], null::text[], 'Sau did → use to.'::text, null::text)
) as v (section_position, position, prompt, back, options, correct_option, answers, words, explanation, tag)
join public.lesson_sections s on s.lesson_id = '22' and s.position = v.section_position;

-- Bài 23
insert into public.lessons (id, phase_id, position, title, description, heading, subtitle) values
  ('23', 1, 60, 'Indirect questions & tags', 'hỏi lịch sự, câu hỏi đuôi', 'Indirect Questions & Question Tags', 'Giai đoạn 1 · 30 phút · hỏi lịch sự và câu hỏi đuôi');
insert into public.lesson_sections (lesson_id, position, type, score_key, title, time_label, hint, body, placeholder, short_input) values
  ('23', 1, 'mcq', 'W'::text, 'Warm-up', '3 phút · Ôn bài 22'::text, null::text, null::text, null::text, false),
  ('23', 2, 'explain', null::text, 'Hỏi lịch sự & hỏi để xác nhận', '7 phút · Hiểu logic'::text, null::text, '
      <h3>① Câu hỏi gián tiếp (Indirect questions)</h3>
      <p>Dùng khi muốn hỏi <b>lịch sự</b>. Phần sau trở thành <b>câu khẳng định</b>: chủ ngữ trước động từ, <b>bỏ do/does/did</b>.</p>
      <div class="box">
        Where <b>is</b> the station? → Could you tell me where the station <b>is</b>?<br>
        What time <b>does</b> it start? → Do you know what time it <b>starts</b>?<br>
        <b>Did</b> she call? → I wonder <b>if/whether</b> she called.
      </div>
      <p>Câu mở đầu thường gặp: <i>Could you tell me… / Do you know… / I wonder… / I''d like to know… / Do you have any idea…</i></p>
      <div class="warn">Câu hỏi Yes/No → thêm <b>if</b> hoặc <b>whether</b>.</div>
      <h3>② Câu hỏi đuôi (Question tags)</h3>
      <p>Dùng để <b>xác nhận</b> điều mình nghĩ là đúng. Quy tắc: khẳng định → đuôi phủ định, và ngược lại; dùng <b>trợ động từ</b> của câu.</p>
      <table>
        <tr><th>Câu</th><th>Đuôi</th></tr>
        <tr><td>You <b>are</b> tired,</td><td><em class="g">aren''t you?</em></td></tr>
        <tr><td>She <b>went</b> home, (past simple → did)</td><td><em class="g">didn''t she?</em></td></tr>
        <tr><td>He <b>has</b> finished,</td><td><em class="g">hasn''t he?</em></td></tr>
        <tr><td><b>I am</b> late,</td><td><em class="g">aren''t I?</em> (đặc biệt)</td></tr>
        <tr><td><b>Let''s</b> go,</td><td><em class="g">shall we?</em></td></tr>
        <tr><td>Close the door, (mệnh lệnh)</td><td><em class="g">will you?</em></td></tr>
        <tr><td><b>Nobody / Nothing / never</b> … (đã mang nghĩa phủ định)</td><td>đuôi <b>khẳng định</b>: Nobody came, <em class="g">did they?</em></td></tr>
      </table>'::text, null::text, false),
  ('23', 3, 'cards', null::text, 'Ghi nhớ nhanh', '2 phút · Flashcards'::text, null::text, null::text, null::text, false),
  ('23', 4, 'mcq', 'M'::text, 'Chọn đáp án đúng', '6 phút · Trắc nghiệm'::text, null::text, null::text, null::text, false),
  ('23', 5, 'typed', 'T'::text, 'Đổi sang câu hỏi gián tiếp', '5 phút · Viết lại câu'::text, null::text, null::text, null::text, false),
  ('23', 6, 'typed', 'G'::text, 'Thêm câu hỏi đuôi', '4 phút · Điền đuôi'::text, 'Chỉ gõ phần đuôi, ví dụ: isn''t it'::text, null::text, null::text, true),
  ('23', 7, 'writing', null::text, 'Tình huống du lịch', '3 phút · Tự viết'::text, 'Bạn đang ở khách sạn: viết <b>2 câu hỏi gián tiếp</b> lịch sự cho lễ tân + <b>2 câu có câu hỏi đuôi</b> nói với bạn đồng hành.'::text, null::text, '1. Could you tell me ...
2. ...
3. ..., isn''t it?
4. ...'::text, false);
insert into public.section_items (section_id, position, prompt, back, options, correct_option, answers, words, explanation, tag)
select s.id, v.position, v.prompt, v.back, v.options, v.correct_option, v.answers, v.words, v.explanation, v.tag
from (values
  (1, 1, 'I ___ live in a small village, but now I live in the city.'::text, null::text, array['used to', 'am used to']::text[], 1::smallint, null::text[], null::text[], 'Quá khứ, giờ không còn.'::text, 'used to'::text),
  (1, 2, 'He''s lived in the UK for years, so he ___ the weather.'::text, null::text, array['is used to', 'used to']::text[], 1::smallint, null::text[], null::text[], 'Đã quen → is used to.'::text, 'be used to'::text),
  (1, 3, 'When we were kids, we ___ play outside until dark.'::text, null::text, array['would', 'were used to']::text[], 1::smallint, null::text[], null::text[], 'Hành động lặp lại quá khứ → would.'::text, 'would'::text),
  (3, 1, 'Where is the bank?'::text, 'Could you tell me where the bank <b>is</b>?'::text, null::text[], null::smallint, null::text[], null::text[], null::text, null::text),
  (3, 2, 'Does he live here?'::text, 'Do you know <b>if</b> he lives here?'::text, null::text[], null::smallint, null::text[], null::text[], null::text, null::text),
  (3, 3, 'I''m right, ___?'::text, 'aren''t I?'::text, null::text[], null::smallint, null::text[], null::text[], null::text, null::text),
  (3, 4, 'Let''s eat, ___?'::text, 'shall we?'::text, null::text[], null::smallint, null::text[], null::text[], null::text, null::text),
  (3, 5, 'Nobody knows, ___?'::text, 'do they?'::text, null::text[], null::smallint, null::text[], null::text[], null::text, null::text),
  (3, 6, 'He never lies, ___?'::text, 'does he?'::text, null::text[], null::smallint, null::text[], null::text[], null::text, null::text),
  (4, 1, 'Could you tell me where ___?'::text, null::text, array['is the bank', 'the bank is', 'does the bank']::text[], 2::smallint, null::text[], null::text[], 'Câu gián tiếp → chủ ngữ + động từ.'::text, null::text),
  (4, 2, 'Do you know what time ___?'::text, null::text, array['the film starts', 'does the film start', 'starts the film']::text[], 1::smallint, null::text[], null::text[], 'Bỏ does, động từ chia theo chủ ngữ: starts.'::text, null::text),
  (4, 3, 'I wonder ___ he will come.'::text, null::text, array['if', 'that', 'what']::text[], 1::smallint, null::text[], null::text[], 'Câu hỏi Yes/No → if/whether.'::text, null::text),
  (4, 4, 'You''re a student, ___?'::text, null::text, array['aren''t you', 'are you', 'don''t you']::text[], 1::smallint, null::text[], null::text[], 'Khẳng định với ''are'' → aren''t you.'::text, null::text),
  (4, 5, 'She went to Da Nang, ___?'::text, null::text, array['didn''t she', 'wasn''t she', 'doesn''t she']::text[], 1::smallint, null::text[], null::text[], 'Past simple → did → didn''t she.'::text, null::text),
  (4, 6, 'Let''s have lunch, ___?'::text, null::text, array['shall we', 'will we', 'don''t we']::text[], 1::smallint, null::text[], null::text[], 'Let''s → shall we.'::text, null::text),
  (4, 7, 'I''m right, ___?'::text, null::text, array['amn''t I', 'aren''t I', 'am I']::text[], 2::smallint, null::text[], null::text[], 'Trường hợp đặc biệt: I am → aren''t I.'::text, null::text),
  (4, 8, 'Nobody called, ___?'::text, null::text, array['did they', 'didn''t they', 'did he']::text[], 1::smallint, null::text[], null::text[], 'Nobody mang nghĩa phủ định → đuôi khẳng định; dùng they.'::text, null::text),
  (4, 9, 'He has never been to Japan, ___?'::text, null::text, array['has he', 'hasn''t he', 'did he']::text[], 1::smallint, null::text[], null::text[], 'never = phủ định → has he.'::text, null::text),
  (5, 1, 'Where is the nearest ATM? → <i>Could you tell me…</i>'::text, null::text, null::text[], null::smallint, array['Could you tell me where the nearest ATM is?']::text[], null::text[], 'Chủ ngữ (the nearest ATM) + is.'::text, null::text),
  (5, 2, 'What does this word mean? → <i>Do you know…</i>'::text, null::text, null::text[], null::smallint, array['Do you know what this word means?']::text[], null::text[], 'Bỏ does, mean → means.'::text, null::text),
  (5, 3, 'Is the museum open today? → <i>I''d like to know…</i>'::text, null::text, null::text[], null::smallint, array['I''d like to know if the museum is open today.', 'I''d like to know whether the museum is open today.', 'I would like to know if the museum is open today.', 'I would like to know whether the museum is open today.']::text[], null::text[], 'Yes/No → if/whether.'::text, null::text),
  (5, 4, 'Why did she leave early? → <i>Do you have any idea…</i>'::text, null::text, null::text[], null::smallint, array['Do you have any idea why she left early?']::text[], null::text[], 'Bỏ did, leave → left.'::text, null::text),
  (5, 5, 'How much does this cost? → <i>Can you tell me…</i>'::text, null::text, null::text[], null::smallint, array['Can you tell me how much this costs?']::text[], null::text[], 'Bỏ does, cost → costs.'::text, null::text),
  (6, 1, 'It''s hot today, ___?'::text, null::text, null::text[], null::smallint, array['isn''t it']::text[], null::text[], 'It is → isn''t it.'::text, null::text),
  (6, 2, 'You can swim, ___?'::text, null::text, null::text[], null::smallint, array['can''t you']::text[], null::text[], 'can → can''t.'::text, null::text),
  (6, 3, 'They didn''t finish, ___?'::text, null::text, null::text[], null::smallint, array['did they']::text[], null::text[], 'Phủ định → đuôi khẳng định.'::text, null::text),
  (6, 4, 'Close the door, ___?'::text, null::text, null::text[], null::smallint, array['will you', 'would you', 'could you', 'can you']::text[], null::text[], 'Mệnh lệnh → will you (thường gặp nhất).'::text, null::text),
  (6, 5, 'She has been here before, ___?'::text, null::text, null::text[], null::smallint, array['hasn''t she']::text[], null::text[], 'has → hasn''t.'::text, null::text)
) as v (section_position, position, prompt, back, options, correct_option, answers, words, explanation, tag)
join public.lesson_sections s on s.lesson_id = '23' and s.position = v.section_position;
