-- Seed: Giai đoạn 2 — Modal verbs (tuần 5–7)

-- Bài 24
insert into public.lessons (id, phase_id, position, title, description, heading, subtitle) values
  ('24', 2, 70, 'Modals: khả năng, bắt buộc', 'can / be able to / must / have to', 'Modals — khả năng, sự cho phép, bắt buộc', 'Giai đoạn 2 · 30 phút · can / could / be able to · must / have to / should');
insert into public.lesson_sections (lesson_id, position, type, score_key, title, time_label, hint, body, placeholder, short_input) values
  ('24', 1, 'mcq', 'W'::text, 'Warm-up', '3 phút · Ôn bài 23'::text, null::text, null::text, null::text, false),
  ('24', 2, 'explain', null::text, 'Modal nào cho ý nào?', '7 phút · Hiểu logic'::text, null::text, '
      <h3>① Khả năng (ability)</h3>
      <table>
        <tr><th>Thời</th><th>Dùng</th><th>Ví dụ</th></tr>
        <tr><td>Hiện tại</td><td>can</td><td>She <em class="g">can</em> speak Korean.</td></tr>
        <tr><td>Quá khứ (chung chung)</td><td>could</td><td>I <em class="g">could</em> swim when I was five.</td></tr>
        <tr><td>Quá khứ (<b>làm được trong 1 lần cụ thể</b>)</td><td>was able to / managed to</td><td>The fire spread, but everyone <em class="g">was able to</em> escape.</td></tr>
        <tr><td>Tương lai / sau modal khác</td><td>will be able to</td><td>I''ll <em class="g">be able to</em> drive next year. (<s>will can</s>)</td></tr>
      </table>
      <h3>② Bắt buộc & lời khuyên</h3>
      <table>
        <tr><th>Từ</th><th>Nghĩa</th><th>Ví dụ</th></tr>
        <tr><td><b>must</b></td><td>bắt buộc — thường do <b>người nói</b> thấy cần</td><td>I <em class="g">must</em> call Mum tonight.</td></tr>
        <tr><td><b>have to</b></td><td>bắt buộc — do <b>quy định bên ngoài</b>; dùng cho mọi thì</td><td>We <em class="g">have to</em> wear a uniform. / I <em class="g">had to</em> work yesterday.</td></tr>
        <tr><td><b>mustn''t</b></td><td><b>CẤM</b></td><td>You <em class="g">mustn''t</em> smoke here.</td></tr>
        <tr><td><b>don''t have to</b></td><td><b>KHÔNG CẦN</b> (làm cũng được)</td><td>You <em class="g">don''t have to</em> pay. It''s free.</td></tr>
        <tr><td><b>should</b></td><td>lời khuyên</td><td>You <em class="g">should</em> rest.</td></tr>
      </table>
      <div class="warn"><b>Bẫy lớn nhất:</b> mustn''t ≠ don''t have to.<br>
        You <b>mustn''t</b> come = Cấm đến. · You <b>don''t have to</b> come = Không đến cũng được.</div>
      <h3>③ Xin phép</h3>
      <p><b>Can I…?</b> (thân mật) → <b>Could I…?</b> → <b>May I…?</b> (lịch sự nhất)</p>
      <div class="box">Sau modal luôn là <b>V nguyên mẫu</b>, không "to", không "s": <s>must to go</s>, <s>she cans</s>.</div>'::text, null::text, false),
  ('24', 3, 'cards', null::text, 'Ghi nhớ nhanh', '2 phút · Flashcards'::text, null::text, null::text, null::text, false),
  ('24', 4, 'mcq', 'M'::text, 'Chọn đáp án đúng', '6 phút · Trắc nghiệm'::text, null::text, null::text, null::text, false),
  ('24', 5, 'typed', 'G'::text, 'Điền modal phù hợp với nghĩa tiếng Việt', '5 phút · Điền từ'::text, 'Chỉ gõ phần điền vào chỗ trống.'::text, null::text, null::text, true),
  ('24', 6, 'typed', 'E'::text, 'Sửa lỗi sai', '4 phút · Sửa lỗi'::text, null::text, null::text, null::text, false),
  ('24', 7, 'writing', null::text, 'Quy định ở nơi bạn làm việc / học', '3 phút · Tự viết'::text, '4 câu: 1 <b>have to</b> · 1 <b>mustn''t</b> · 1 <b>don''t have to</b> · 1 lời khuyên với <b>should</b>.'::text, null::text, '1. At my company, we have to ...
2. ...
3. ...
4. ...'::text, false);
insert into public.section_items (section_id, position, prompt, back, options, correct_option, answers, words, explanation, tag)
select s.id, v.position, v.prompt, v.back, v.options, v.correct_option, v.answers, v.words, v.explanation, v.tag
from (values
  (1, 1, 'Can you tell me where ___?'::text, null::text, array['the toilet is', 'is the toilet']::text[], 1::smallint, null::text[], null::text[], 'Câu gián tiếp → S + V.'::text, 'indirect question'::text),
  (1, 2, 'You''ve finished, ___?'::text, null::text, array['haven''t you', 'didn''t you']::text[], 1::smallint, null::text[], null::text[], 'have → haven''t.'::text, 'question tag'::text),
  (1, 3, 'I don''t know ___ she is married.'::text, null::text, array['if', 'that']::text[], 1::smallint, null::text[], null::text[], 'Yes/No → if.'::text, 'indirect question'::text),
  (3, 1, 'mustn''t'::text, 'cấm'::text, null::text[], null::smallint, null::text[], null::text[], null::text, null::text),
  (3, 2, 'don''t have to'::text, 'không cần'::text, null::text[], null::smallint, null::text[], null::text[], null::text, null::text),
  (3, 3, 'must vs have to'::text, 'người nói thấy cần vs quy định bên ngoài'::text, null::text[], null::smallint, null::text[], null::text[], null::text, null::text),
  (3, 4, 'could vs was able to'::text, 'khả năng chung vs làm được 1 lần cụ thể'::text, null::text[], null::smallint, null::text[], null::text[], null::text, null::text),
  (3, 5, 'will can?'::text, '✘ → will be able to'::text, null::text[], null::smallint, null::text[], null::text[], null::text, null::text),
  (3, 6, 'Xin phép lịch sự nhất'::text, 'May I ...?'::text, null::text[], null::smallint, null::text[], null::text[], null::text, null::text),
  (4, 1, 'You ___ smoke in the hospital. It''s forbidden.'::text, null::text, array['mustn''t', 'don''t have to', 'needn''t']::text[], 1::smallint, null::text[], null::text[], 'Cấm → mustn''t.'::text, null::text),
  (4, 2, 'Tomorrow is Sunday, so I ___ get up early.'::text, null::text, array['mustn''t', 'don''t have to', 'can''t']::text[], 2::smallint, null::text[], null::text[], 'Không cần → don''t have to.'::text, null::text),
  (4, 3, 'I ___ swim when I was five.'::text, null::text, array['could', 'can', 'am able']::text[], 1::smallint, null::text[], null::text[], 'Khả năng chung trong quá khứ → could.'::text, null::text),
  (4, 4, 'The fire spread fast, but everyone ___ escape.'::text, null::text, array['could', 'was able to', 'can']::text[], 2::smallint, null::text[], null::text[], 'Làm được trong một lần cụ thể → was able to.'::text, null::text),
  (4, 5, 'I''ll ___ speak English fluently after this course.'::text, null::text, array['can', 'be able to', 'could']::text[], 2::smallint, null::text[], null::text[], 'will + be able to.'::text, null::text),
  (4, 6, 'You look tired. You ___ go to bed earlier.'::text, null::text, array['should', 'mustn''t', 'have']::text[], 1::smallint, null::text[], null::text[], 'Lời khuyên → should.'::text, null::text),
  (4, 7, 'In Vietnam, you ___ wear a helmet on a motorbike. It''s the law.'::text, null::text, array['have to', 'should', 'may']::text[], 1::smallint, null::text[], null::text[], 'Quy định bên ngoài (luật) → have to.'::text, null::text),
  (4, 8, 'I ___ go to work yesterday because it was a public holiday.'::text, null::text, array['mustn''t', 'couldn''t', 'didn''t have to']::text[], 3::smallint, null::text[], null::text[], 'Không cần (vì ngày lễ) → didn''t have to.'::text, null::text),
  (4, 9, '___ I use your phone, please?'::text, null::text, array['May', 'Must', 'Should']::text[], 1::smallint, null::text[], null::text[], 'Xin phép lịch sự → May I.'::text, null::text),
  (5, 1, 'Students ___ (không được) cheat in exams.'::text, null::text, null::text[], null::smallint, array['mustn''t', 'must not']::text[], null::text[], 'Cấm.'::text, null::text),
  (5, 2, 'You ___ (không cần) bring food. We have plenty.'::text, null::text, null::text[], null::smallint, array['don''t have to', 'do not have to', 'don''t need to', 'needn''t']::text[], null::text[], 'Không cần.'::text, null::text),
  (5, 3, 'Last year I ___ (phải) work every Saturday.'::text, null::text, null::text[], null::smallint, array['had to']::text[], null::text[], 'must không có quá khứ → had to.'::text, null::text),
  (5, 4, 'Will you ___ (có thể) come to my party next week?'::text, null::text, null::text[], null::smallint, array['be able to']::text[], null::text[], 'will + be able to.'::text, null::text),
  (5, 5, 'You ___ (nên) see a doctor about that cough.'::text, null::text, null::text[], null::smallint, array['should', 'ought to']::text[], null::text[], 'Lời khuyên.'::text, null::text),
  (5, 6, 'After hours of trying, she ___ (đã xoay xở được) fix the car.'::text, null::text, null::text[], null::smallint, array['was able to', 'managed to']::text[], null::text[], 'Thành công trong 1 lần cụ thể.'::text, null::text),
  (6, 1, 'You don''t have to touch that wire! It''s dangerous.'::text, null::text, null::text[], null::smallint, array['You mustn''t touch that wire! It''s dangerous.', 'You must not touch that wire! It''s dangerous.']::text[], null::text[], 'Nguy hiểm → cấm → mustn''t.'::text, null::text),
  (6, 2, 'I must to finish this report today.'::text, null::text, null::text[], null::smallint, array['I must finish this report today.']::text[], null::text[], 'must + V (không to).'::text, null::text),
  (6, 3, 'She cans speak three languages.'::text, null::text, null::text[], null::smallint, array['She can speak three languages.']::text[], null::text[], 'Modal không thêm s.'::text, null::text),
  (6, 4, 'We will can travel next year.'::text, null::text, null::text[], null::smallint, array['We will be able to travel next year.', 'We''ll be able to travel next year.']::text[], null::text[], 'will + be able to.'::text, null::text)
) as v (section_position, position, prompt, back, options, correct_option, answers, words, explanation, tag)
join public.lesson_sections s on s.lesson_id = '24' and s.position = v.section_position;

-- Bài 25
insert into public.lessons (id, phase_id, position, title, description, heading, subtitle) values
  ('25', 2, 80, 'Suy luận hiện tại', 'must / might / can''t be', 'Modals of Deduction — suy luận ở hiện tại', 'Giai đoạn 2 · 30 phút · must / might / may / could / can''t');
insert into public.lesson_sections (lesson_id, position, type, score_key, title, time_label, hint, body, placeholder, short_input) values
  ('25', 1, 'mcq', 'W'::text, 'Warm-up', '3 phút · Ôn bài 24'::text, null::text, null::text, null::text, false),
  ('25', 2, 'explain', null::text, 'Từ bằng chứng → kết luận', '7 phút · Hiểu logic'::text, null::text, '
      <p>Ở bài trước, must = bắt buộc. Ở bài này, must/can''t/might dùng để <b>đoán</b> dựa trên bằng chứng. Mức độ chắc chắn:</p>
      <table>
        <tr><th>Mức độ</th><th>Từ</th><th>Ví dụ</th></tr>
        <tr><td>~95% chắc chắn ĐÚNG</td><td><b>must</b></td><td>He''s been running for an hour. He <em class="g">must be</em> tired.</td></tr>
        <tr><td>~50% có thể</td><td><b>might / may / could</b></td><td>She isn''t answering. She <em class="g">might be</em> asleep.</td></tr>
        <tr><td>~95% chắc chắn KHÔNG</td><td><b>can''t</b></td><td>That <em class="g">can''t be</em> Tom. He''s in London.</td></tr>
      </table>
      <div class="warn"><b>Lỗi thường gặp:</b><br>
        ① Phủ định của <b>must</b> (suy luận) là <b>can''t</b>, không phải mustn''t:<br>
        <s>He mustn''t be at home.</s> → He <b>can''t</b> be at home.<br>
        ② Đoán "có thể" ở dạng khẳng định dùng <b>might/may/could</b>, không dùng can:<br>
        <s>It can be true.</s> → It <b>might</b> be true.</div>
      <div class="box">Đoán việc <b>đang diễn ra</b>: modal + <b>be + V-ing</b><br>
        The lights are on. They <em class="g">must be watching</em> TV.</div>
      <p><b>Logic:</b> luôn nêu được <i>bằng chứng</i> (vì sao bạn nghĩ vậy) → câu suy luận mới tự nhiên và thuyết phục.</p>'::text, null::text, false),
  ('25', 3, 'cards', null::text, 'Ghi nhớ nhanh', '2 phút · Flashcards'::text, null::text, null::text, null::text, false),
  ('25', 4, 'mcq', 'M'::text, 'Chọn đáp án đúng', '6 phút · Trắc nghiệm'::text, null::text, null::text, null::text, false),
  ('25', 5, 'typed', 'G'::text, 'Điền must / might / can''t', '4 phút · Điền từ'::text, 'Chỉ gõ 1 từ.'::text, null::text, null::text, true),
  ('25', 6, 'typed', 'T'::text, 'Viết lại bằng modal suy luận', '5 phút · Viết lại câu'::text, null::text, null::text, null::text, false),
  ('25', 7, 'writing', null::text, 'Làm thám tử', '3 phút · Tự viết'::text, 'Nghĩ về một người bạn biết hoặc một tình huống quanh bạn. Viết 4 câu suy luận với <b>must</b>, <b>can''t</b>, <b>might</b>, <b>must be + V-ing</b> — mỗi câu kèm <b>bằng chứng</b> (because…).'::text, null::text, '1. My neighbour must be ... because ...
2. ...
3. ...
4. ...'::text, false);
insert into public.section_items (section_id, position, prompt, back, options, correct_option, answers, words, explanation, tag)
select s.id, v.position, v.prompt, v.back, v.options, v.correct_option, v.answers, v.words, v.explanation, v.tag
from (values
  (1, 1, 'You ___ pay for the museum — it''s free.'::text, null::text, array['don''t have to', 'mustn''t']::text[], 1::smallint, null::text[], null::text[], 'Không cần.'::text, 'mustn''t vs don''t have to'::text),
  (1, 2, 'Passengers ___ use phones during take-off.'::text, null::text, array['mustn''t', 'don''t have to']::text[], 1::smallint, null::text[], null::text[], 'Cấm.'::text, 'mustn''t vs don''t have to'::text),
  (1, 3, 'Although the exam was hard, I ___ pass it.'::text, null::text, array['was able to', 'could']::text[], 1::smallint, null::text[], null::text[], 'Làm được 1 lần cụ thể.'::text, 'could vs was able to'::text),
  (3, 1, 'must be'::text, 'chắc chắn là (~95%)'::text, null::text[], null::smallint, null::text[], null::text[], null::text, null::text),
  (3, 2, 'can''t be'::text, 'chắc chắn không phải'::text, null::text[], null::smallint, null::text[], null::text[], null::text, null::text),
  (3, 3, 'might / may / could be'::text, 'có thể là (~50%)'::text, null::text[], null::smallint, null::text[], null::text[], null::text, null::text),
  (3, 4, 'mustn''t be?'::text, '✘ không dùng để suy luận → can''t be'::text, null::text[], null::smallint, null::text[], null::text[], null::text, null::text),
  (3, 5, 'Đang làm gì?'::text, 'must be + V-ing<br><i>She must be sleeping.</i>'::text, null::text[], null::smallint, null::text[], null::text[], null::text, null::text),
  (4, 1, 'She''s been working for 12 hours. She ___ be exhausted.'::text, null::text, array['must', 'can''t', 'mustn''t']::text[], 1::smallint, null::text[], null::text[], 'Bằng chứng mạnh → must.'::text, null::text),
  (4, 2, 'That ___ be Tom. He''s in London now.'::text, null::text, array['can''t', 'must', 'might']::text[], 1::smallint, null::text[], null::text[], 'Bằng chứng anh ấy ở chỗ khác → can''t.'::text, null::text),
  (4, 3, 'Someone is knocking. It ___ be the postman, or maybe my neighbour.'::text, null::text, array['might', 'must', 'can''t']::text[], 1::smallint, null::text[], null::text[], 'Chưa chắc, có 2 khả năng → might.'::text, null::text),
  (4, 4, 'He drives a Ferrari. He ___ be rich.'::text, null::text, array['must', 'can''t', 'might not']::text[], 1::smallint, null::text[], null::text[], 'Bằng chứng mạnh → must.'::text, null::text),
  (4, 5, 'The lights are off. They ___ be at home.'::text, null::text, array['mustn''t', 'can''t', 'must']::text[], 2::smallint, null::text[], null::text[], 'Chắc chắn không → can''t (không dùng mustn''t).'::text, null::text),
  (4, 6, 'Where''s Lan? — I''m not sure. She ___ be in the library.'::text, null::text, array['could', 'must', 'can''t']::text[], 1::smallint, null::text[], null::text[], 'Không chắc → could.'::text, null::text),
  (4, 7, 'Listen! Someone ___ in the bathroom.'::text, null::text, array['must sing', 'must be singing', 'can''t sing']::text[], 2::smallint, null::text[], null::text[], 'Đang diễn ra → must be + V-ing.'::text, null::text),
  (4, 8, 'Which sentence is WRONG?'::text, null::text, array['He might be ill.', 'He mustn''t be at home — his car isn''t here.', 'He can''t be at home.']::text[], 2::smallint, null::text[], null::text[], 'Suy luận phủ định → can''t, không phải mustn''t.'::text, null::text),
  (5, 1, 'You''ve just eaten a big pizza. You ___ be hungry!'::text, null::text, null::text[], null::smallint, array['can''t', 'cannot']::text[], null::text[], 'Vừa ăn xong → chắc chắn không đói.'::text, null::text),
  (5, 2, 'Her eyes are red and she''s holding a tissue. She ___ be sad.'::text, null::text, null::text[], null::smallint, array['must']::text[], null::text[], 'Bằng chứng mạnh.'::text, null::text),
  (5, 3, 'I don''t know where my keys are. They ___ be in the car.'::text, null::text, null::text[], null::smallint, array['might', 'may', 'could']::text[], null::text[], 'Không chắc.'::text, null::text),
  (5, 4, 'That bag costs only $5. It ___ be real leather.'::text, null::text, null::text[], null::smallint, array['can''t', 'cannot']::text[], null::text[], 'Quá rẻ → chắc chắn không phải da thật.'::text, null::text),
  (5, 5, 'Everyone is wearing coats. It ___ be cold outside.'::text, null::text, null::text[], null::smallint, array['must']::text[], null::text[], 'Bằng chứng mạnh.'::text, null::text),
  (6, 1, 'I''m sure he is at work.'::text, null::text, null::text[], null::smallint, array['He must be at work.']::text[], null::text[], 'I''m sure → must.'::text, null::text),
  (6, 2, 'I''m sure it isn''t true.'::text, null::text, null::text[], null::smallint, array['It can''t be true.', 'It cannot be true.']::text[], null::text[], 'I''m sure ... not → can''t.'::text, null::text),
  (6, 3, 'Perhaps she is sleeping.'::text, null::text, null::text[], null::smallint, array['She might be sleeping.', 'She may be sleeping.', 'She could be sleeping.']::text[], null::text[], 'Perhaps → might + be + V-ing.'::text, null::text),
  (6, 4, 'I''m sure they are watching TV.'::text, null::text, null::text[], null::smallint, array['They must be watching TV.']::text[], null::text[], 'must + be + V-ing.'::text, null::text)
) as v (section_position, position, prompt, back, options, correct_option, answers, words, explanation, tag)
join public.lesson_sections s on s.lesson_id = '25' and s.position = v.section_position;

-- Bài 26
insert into public.lessons (id, phase_id, position, title, description, heading, subtitle) values
  ('26', 2, 90, 'Suy luận & hối tiếc quá khứ', 'must have / should have + V3', 'Past Modals — suy luận & hối tiếc về quá khứ', 'Giai đoạn 2 · 30 phút · must have / can''t have / might have / should have + V3');
insert into public.lesson_sections (lesson_id, position, type, score_key, title, time_label, hint, body, placeholder, short_input) values
  ('26', 1, 'mcq', 'W'::text, 'Warm-up', '3 phút · Ôn bài 25'::text, null::text, null::text, null::text, false),
  ('26', 2, 'explain', null::text, 'Modal + have + V3 = nói về quá khứ', '7 phút · Hiểu logic'::text, null::text, '
      <p>Công thức chung: <b>modal + have + V3</b>. Giữ nguyên nghĩa của modal, chỉ chuyển sang quá khứ.</p>
      <h3>① Suy luận về quá khứ</h3>
      <table>
        <tr><th>Cấu trúc</th><th>Nghĩa</th><th>Ví dụ</th></tr>
        <tr><td><b>must have + V3</b></td><td>chắc chắn đã</td><td>The ground is wet. It <em class="g">must have rained</em>.</td></tr>
        <tr><td><b>might / may / could have + V3</b></td><td>có lẽ đã</td><td>He''s late. He <em class="g">might have missed</em> the bus.</td></tr>
        <tr><td><b>can''t / couldn''t have + V3</b></td><td>chắc chắn không thể đã</td><td>She <em class="g">can''t have seen</em> me. She was asleep.</td></tr>
      </table>
      <h3>② Hối tiếc / phê bình</h3>
      <table>
        <tr><th>Cấu trúc</th><th>Nghĩa</th><th>Ví dụ</th></tr>
        <tr><td><b>should have + V3</b></td><td>lẽ ra nên làm (nhưng đã không làm)</td><td>I failed. I <em class="g">should have studied</em> harder.</td></tr>
        <tr><td><b>shouldn''t have + V3</b></td><td>lẽ ra không nên (nhưng đã làm)</td><td>I <em class="g">shouldn''t have eaten</em> so much.</td></tr>
        <tr><td><b>could have + V3</b></td><td>đã có thể làm (nhưng không làm)</td><td>You <em class="g">could have taken</em> a taxi!</td></tr>
      </table>
      <div class="warn"><b>Lỗi thường gặp:</b> sau have phải là <b>V3</b> (past participle), không phải V2:<br>
        must have <s>went</s> → must have <b>gone</b> · should have <s>took</s> → should have <b>taken</b></div>
      <div class="box"><b>Liên hệ bài cũ:</b> "I should have studied harder" ≈ "If I had studied harder, I would have passed" (Third conditional, bài 15).</div>'::text, null::text, false),
  ('26', 3, 'cards', null::text, 'Ghi nhớ nhanh', '2 phút · Flashcards'::text, null::text, null::text, null::text, false),
  ('26', 4, 'mcq', 'M'::text, 'Chọn đáp án đúng', '6 phút · Trắc nghiệm'::text, null::text, null::text, null::text, false),
  ('26', 5, 'typed', 'T'::text, 'Viết lại bằng past modal', '6 phút · Viết lại câu'::text, null::text, null::text, null::text, false),
  ('26', 6, 'typed', 'G'::text, 'Chia động từ trong ngoặc', '3 phút · Điền từ'::text, 'Gõ đủ cụm, ví dụ: must have gone'::text, null::text, null::text, true),
  ('26', 7, 'writing', null::text, 'Hối tiếc & bí ẩn', '3 phút · Tự viết'::text, '2 câu hối tiếc về quá khứ của bạn (<b>should / shouldn''t have</b>) + 2 câu suy luận về một chuyện đã xảy ra (<b>must / can''t / might have</b>).'::text, null::text, '1. I should have ...
2. ...
3. ...
4. ...'::text, false);
insert into public.section_items (section_id, position, prompt, back, options, correct_option, answers, words, explanation, tag)
select s.id, v.position, v.prompt, v.back, v.options, v.correct_option, v.answers, v.words, v.explanation, v.tag
from (values
  (1, 1, 'He''s wearing a uniform. He ___ be a pilot.'::text, null::text, array['must', 'can''t']::text[], 1::smallint, null::text[], null::text[], 'Bằng chứng → must.'::text, 'deduction'::text),
  (1, 2, 'She ___ be at home. I just saw her at the mall.'::text, null::text, array['can''t', 'mustn''t']::text[], 1::smallint, null::text[], null::text[], 'Suy luận phủ định → can''t.'::text, 'can''t vs mustn''t'::text),
  (1, 3, 'Look, they ___ for the bus.'::text, null::text, array['must be waiting', 'must wait']::text[], 1::smallint, null::text[], null::text[], 'Đang diễn ra → must be V-ing.'::text, 'deduction'::text),
  (3, 1, 'must have done'::text, 'chắc chắn đã'::text, null::text[], null::smallint, null::text[], null::text[], null::text, null::text),
  (3, 2, 'can''t have done'::text, 'chắc chắn đã không'::text, null::text[], null::smallint, null::text[], null::text[], null::text, null::text),
  (3, 3, 'might have done'::text, 'có lẽ đã'::text, null::text[], null::smallint, null::text[], null::text[], null::text, null::text),
  (3, 4, 'should have done'::text, 'lẽ ra nên (nhưng đã không)'::text, null::text[], null::smallint, null::text[], null::text[], null::text, null::text),
  (3, 5, 'shouldn''t have done'::text, 'lẽ ra không nên (nhưng đã làm)'::text, null::text[], null::smallint, null::text[], null::text[], null::text, null::text),
  (3, 6, 'go → must have ___'::text, 'gone (V3!)'::text, null::text[], null::smallint, null::text[], null::text[], null::text, null::text),
  (4, 1, 'The ground is wet. It ___ last night.'::text, null::text, array['must have rained', 'must rain', 'should have rained']::text[], 1::smallint, null::text[], null::text[], 'Suy luận chắc chắn về quá khứ.'::text, null::text),
  (4, 2, 'She ___ the email. She was offline all day.'::text, null::text, array['can''t have sent', 'mustn''t have sent', 'should have sent']::text[], 1::smallint, null::text[], null::text[], 'Chắc chắn không → can''t have.'::text, null::text),
  (4, 3, 'I failed the test. I ___ harder.'::text, null::text, array['should have studied', 'must have studied', 'can''t have studied']::text[], 1::smallint, null::text[], null::text[], 'Hối tiếc → should have.'::text, null::text),
  (4, 4, 'Nam isn''t here yet. He ___ the bus.'::text, null::text, array['might have missed', 'should miss', 'can''t have missed']::text[], 1::smallint, null::text[], null::text[], 'Có lẽ → might have.'::text, null::text),
  (4, 5, 'You ___ so much — now you feel sick.'::text, null::text, array['shouldn''t have eaten', 'mustn''t have eaten', 'couldn''t eat']::text[], 1::smallint, null::text[], null::text[], 'Phê bình việc đã làm → shouldn''t have.'::text, null::text),
  (4, 6, 'Why did you walk home? You ___ a taxi.'::text, null::text, array['could have taken', 'must have taken', 'can''t have taken']::text[], 1::smallint, null::text[], null::text[], 'Đã có thể (nhưng không làm) → could have.'::text, null::text),
  (4, 7, 'He knew all the answers. He ___ the questions before.'::text, null::text, array['must have seen', 'should have seen', 'might see']::text[], 1::smallint, null::text[], null::text[], 'Suy luận chắc chắn → must have.'::text, null::text),
  (4, 8, 'Which sentence is WRONG?'::text, null::text, array['She must have forgot.', 'She must have forgotten.', 'She may have forgotten.']::text[], 1::smallint, null::text[], null::text[], 'Sau have → V3: forgotten.'::text, null::text),
  (5, 1, 'I''m sure she was tired after the trip.'::text, null::text, null::text[], null::smallint, array['She must have been tired after the trip.']::text[], null::text[], 'I''m sure + quá khứ → must have been.'::text, null::text),
  (5, 2, 'It was a mistake to sell my old car. <i>(shouldn''t)</i>'::text, null::text, null::text[], null::smallint, array['I shouldn''t have sold my old car.', 'I should not have sold my old car.']::text[], null::text[], 'Hối tiếc việc đã làm → shouldn''t have.'::text, null::text),
  (5, 3, 'Perhaps they went home early.'::text, null::text, null::text[], null::smallint, array['They might have gone home early.', 'They may have gone home early.', 'They could have gone home early.']::text[], null::text[], 'Perhaps → might have + V3 (gone).'::text, null::text),
  (5, 4, 'I''m sure he didn''t steal the money.'::text, null::text, null::text[], null::smallint, array['He can''t have stolen the money.', 'He couldn''t have stolen the money.', 'He cannot have stolen the money.']::text[], null::text[], 'Chắc chắn không → can''t have stolen.'::text, null::text),
  (5, 5, 'It was a good idea to call you, but I didn''t.'::text, null::text, null::text[], null::smallint, array['I should have called you.']::text[], null::text[], 'Lẽ ra nên → should have.'::text, null::text),
  (6, 1, 'You ___ (should / tell) me earlier!'::text, null::text, null::text[], null::smallint, array['should have told']::text[], null::text[], 'tell → told.'::text, null::text),
  (6, 2, 'The window is broken. Someone ___ (must / throw) a stone.'::text, null::text, null::text[], null::smallint, array['must have thrown']::text[], null::text[], 'throw → thrown.'::text, null::text),
  (6, 3, 'He ___ (can''t / finish) already — he only started 5 minutes ago!'::text, null::text, null::text[], null::smallint, array['can''t have finished', 'cannot have finished']::text[], null::text[], 'Chắc chắn chưa xong.'::text, null::text),
  (6, 4, 'I ___ (might / leave) my wallet at the café.'::text, null::text, null::text[], null::smallint, array['might have left']::text[], null::text[], 'leave → left.'::text, null::text)
) as v (section_position, position, prompt, back, options, correct_option, answers, words, explanation, tag)
join public.lesson_sections s on s.lesson_id = '26' and s.position = v.section_position;
