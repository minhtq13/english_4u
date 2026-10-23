-- Seed: Giai đoạn 3 — Cấu trúc B2 (tuần 8–11)

-- Bài 27
insert into public.lessons (id, phase_id, position, title, description, heading, subtitle) values
  ('27', 3, 100, 'Wish / If only / It''s time', 'ước muốn, điều không có thật', 'Wish / If only / I''d rather / It''s time', 'Giai đoạn 3 · 30 phút · ước muốn & điều không có thật');
insert into public.lesson_sections (lesson_id, position, type, score_key, title, time_label, hint, body, placeholder, short_input) values
  ('27', 1, 'mcq', 'W'::text, 'Warm-up', '3 phút · Ôn bài 26'::text, null::text, null::text, null::text, false),
  ('27', 2, 'explain', null::text, 'Lùi thì để nói điều không có thật', '7 phút · Hiểu logic'::text, null::text, '
      <p><b>Logic giống câu điều kiện loại 2 và 3 (bài 14, 15):</b> điều không có thật → <b>lùi một thì</b>.</p>
      <table>
        <tr><th>Ước về</th><th>Cấu trúc</th><th>Ví dụ</th><th>Thực tế</th></tr>
        <tr><td>Hiện tại</td><td>wish + <b>past simple</b></td><td>I wish I <em class="g">had</em> a car.<br>I wish I <em class="g">were</em> taller.</td><td>Tôi không có xe.</td></tr>
        <tr><td>Quá khứ (hối tiếc)</td><td>wish + <b>past perfect</b></td><td>I wish I <em class="g">had studied</em> harder.</td><td>Tôi đã không học chăm.</td></tr>
        <tr><td>Người khác / sự việc nên thay đổi (phàn nàn)</td><td>wish + sb + <b>would</b> + V</td><td>I wish you <em class="g">would stop</em> shouting.</td><td>Bạn cứ hét mãi.</td></tr>
        <tr><td>Khả năng</td><td>wish + <b>could</b> + V</td><td>I wish I <em class="g">could</em> swim.</td><td>Tôi không biết bơi.</td></tr>
      </table>
      <div class="warn">Không dùng <b>I wish I would…</b> (tự ước về hành động của mình) → dùng <b>I wish I could…</b><br>
        <b>If only</b> = wish nhưng cảm xúc mạnh hơn: <i>If only I had listened!</i></div>
      <h3>I''d rather & It''s time</h3>
      <table>
        <tr><td><b>I''d rather + V</b></td><td>tôi thích/muốn (tự mình) hơn</td><td>I''d rather <em class="g">stay</em> home.</td></tr>
        <tr><td><b>I''d rather + sb + past</b></td><td>muốn người khác làm</td><td>I''d rather you <em class="g">didn''t smoke</em> here.</td></tr>
        <tr><td><b>It''s time + sb + past</b></td><td>đã đến lúc (đáng lẽ phải làm rồi)</td><td>It''s time we <em class="g">went</em> home.</td></tr>
        <tr><td><b>It''s time to + V</b></td><td>đã đến lúc</td><td>It''s time <em class="g">to go</em>.</td></tr>
      </table>'::text, null::text, false),
  ('27', 3, 'cards', null::text, 'Ghi nhớ nhanh', '2 phút · Flashcards'::text, null::text, null::text, null::text, false),
  ('27', 4, 'mcq', 'M'::text, 'Chọn đáp án đúng', '6 phút · Trắc nghiệm'::text, null::text, null::text, null::text, false),
  ('27', 5, 'typed', 'T'::text, 'Viết lại câu', '6 phút · Viết lại câu'::text, null::text, null::text, null::text, false),
  ('27', 6, 'order', 'O'::text, 'Sắp xếp thành câu đúng', '2 phút · Sắp xếp'::text, null::text, null::text, null::text, false),
  ('27', 7, 'writing', null::text, 'Ước muốn của bạn', '3 phút · Tự viết'::text, '4 câu: wish về <b>hiện tại</b> · wish về <b>quá khứ</b> · wish + <b>would</b> (phàn nàn) · <b>I''d rather</b> hoặc <b>It''s time</b>.'::text, null::text, '1. I wish I ...
2. ...
3. ...
4. ...'::text, false);
insert into public.section_items (section_id, position, prompt, back, options, correct_option, answers, words, explanation, tag)
select s.id, v.position, v.prompt, v.back, v.options, v.correct_option, v.answers, v.words, v.explanation, v.tag
from (values
  (1, 1, 'I missed the train. I ___ earlier.'::text, null::text, array['should have left', 'must have left']::text[], 1::smallint, null::text[], null::text[], 'Hối tiếc → should have.'::text, 'past modals'::text),
  (1, 2, 'She ___ the news — she looks shocked.'::text, null::text, array['must have heard', 'should have heard']::text[], 1::smallint, null::text[], null::text[], 'Suy luận → must have.'::text, 'past modals'::text),
  (1, 3, 'He ___ at home; I phoned and nobody answered.'::text, null::text, array['can''t have been', 'mustn''t have been']::text[], 1::smallint, null::text[], null::text[], 'Suy luận phủ định → can''t have.'::text, 'past modals'::text),
  (3, 1, 'wish + past simple'::text, 'ước hiện tại khác đi'::text, null::text[], null::smallint, null::text[], null::text[], null::text, null::text),
  (3, 2, 'wish + past perfect'::text, 'hối tiếc quá khứ'::text, null::text[], null::smallint, null::text[], null::text[], null::text, null::text),
  (3, 3, 'wish + sb + would'::text, 'phàn nàn, muốn người khác thay đổi'::text, null::text[], null::smallint, null::text[], null::text[], null::text, null::text),
  (3, 4, 'I wish I ___ swim.'::text, 'could'::text, null::text[], null::smallint, null::text[], null::text[], null::text, null::text),
  (3, 5, 'I''d rather you ___ (not tell) anyone.'::text, 'didn''t tell'::text, null::text[], null::smallint, null::text[], null::text[], null::text, null::text),
  (3, 6, 'It''s time we ___ (leave).'::text, 'left'::text, null::text[], null::smallint, null::text[], null::text[], null::text, null::text),
  (4, 1, 'I wish I ___ taller.'::text, null::text, array['am', 'were', 'would be']::text[], 2::smallint, null::text[], null::text[], 'Ước hiện tại → past simple; với be dùng were (hoặc was).'::text, null::text),
  (4, 2, 'I wish I ___ to the party last night. It was fun.'::text, null::text, array['went', 'had gone', 'would go']::text[], 2::smallint, null::text[], null::text[], 'Hối tiếc quá khứ → had gone.'::text, null::text),
  (4, 3, 'I wish my neighbour ___ playing loud music at night.'::text, null::text, array['stopped', 'would stop', 'had stopped']::text[], 2::smallint, null::text[], null::text[], 'Phàn nàn, muốn người khác thay đổi → would.'::text, null::text),
  (4, 4, 'If only I ___ more money now!'::text, null::text, array['had', 'have', 'would have']::text[], 1::smallint, null::text[], null::text[], 'Hiện tại → past simple.'::text, null::text),
  (4, 5, 'It''s late. It''s time we ___ home.'::text, null::text, array['go', 'went', 'going']::text[], 2::smallint, null::text[], null::text[], 'It''s time + sb + past.'::text, null::text),
  (4, 6, 'I''d rather ___ at home tonight.'::text, null::text, array['stay', 'to stay', 'stayed']::text[], 1::smallint, null::text[], null::text[], 'I''d rather + V (chính mình).'::text, null::text),
  (4, 7, 'I''d rather you ___ smoke here.'::text, null::text, array['don''t', 'didn''t', 'won''t']::text[], 2::smallint, null::text[], null::text[], 'I''d rather + người khác + past.'::text, null::text),
  (4, 8, 'She wishes she ___ speak French.'::text, null::text, array['can', 'could', 'would']::text[], 2::smallint, null::text[], null::text[], 'Khả năng → could.'::text, null::text),
  (4, 9, 'I wish I ___ that. I''m sorry.'::text, null::text, array['didn''t say', 'hadn''t said', 'wouldn''t say']::text[], 2::smallint, null::text[], null::text[], 'Đã nói rồi (quá khứ) → hadn''t said.'::text, null::text),
  (5, 1, 'I don''t have a car. <i>(wish)</i>'::text, null::text, null::text[], null::smallint, array['I wish I had a car.']::text[], null::text[], 'Hiện tại → past simple.'::text, null::text),
  (5, 2, 'I didn''t study medicine. <i>(wish)</i>'::text, null::text, null::text[], null::smallint, array['I wish I had studied medicine.', 'I wish I''d studied medicine.']::text[], null::text[], 'Quá khứ → past perfect.'::text, null::text),
  (5, 3, 'My brother always borrows my clothes. I hate it. <i>(wish … would)</i>'::text, null::text, null::text[], null::smallint, array['I wish my brother wouldn''t borrow my clothes.', 'I wish my brother would not borrow my clothes.', 'I wish my brother would stop borrowing my clothes.']::text[], null::text[], 'Phàn nàn → would.'::text, null::text),
  (5, 4, 'I can''t drive. <i>(If only)</i>'::text, null::text, null::text[], null::smallint, array['If only I could drive.']::text[], null::text[], 'Khả năng → could.'::text, null::text),
  (5, 5, 'You should go to bed now. <i>(It''s time)</i>'::text, null::text, null::text[], null::smallint, array['It''s time you went to bed.', 'It is time you went to bed.', 'It''s time for you to go to bed.']::text[], null::text[], 'It''s time + sb + past.'::text, null::text),
  (6, 1, null::text, null::text, null::text[], null::smallint, null::text[], array['I wish', 'I had', 'listened', 'to my parents']::text[], 'wish + past perfect.'::text, null::text),
  (6, 2, null::text, null::text, null::text[], null::smallint, null::text[], array['I''d rather', 'you', 'didn''t', 'tell', 'anyone']::text[], 'I''d rather + sb + past.'::text, null::text),
  (6, 3, null::text, null::text, null::text[], null::smallint, null::text[], array['It''s', 'high time', 'we', 'started', 'the meeting']::text[], 'It''s (high) time + sb + past.'::text, null::text)
) as v (section_position, position, prompt, back, options, correct_option, answers, words, explanation, tag)
join public.lesson_sections s on s.lesson_id = '27' and s.position = v.section_position;

-- Bài 28
insert into public.lessons (id, phase_id, position, title, description, heading, subtitle) values
  ('28', 3, 110, 'Causative', 'have / get something done', 'Causative — have / get something done', 'Giai đoạn 3 · 30 phút · nhờ / thuê người khác làm');
insert into public.lesson_sections (lesson_id, position, type, score_key, title, time_label, hint, body, placeholder, short_input) values
  ('28', 1, 'mcq', 'W'::text, 'Warm-up', '3 phút · Ôn bài 27'::text, null::text, null::text, null::text, false),
  ('28', 2, 'explain', null::text, 'Ai là người làm?', '7 phút · Hiểu logic'::text, null::text, '
      <p>Người Việt hay nói <i>"Tôi cắt tóc hôm qua"</i> nhưng thật ra là <b>thợ</b> cắt. Tiếng Anh phân biệt rõ:</p>
      <div class="box">
        I <b>cut</b> my hair. → <i>Tôi tự cắt.</i><br>
        I <b>had my hair cut</b>. → <i>Tôi đi cắt (người khác cắt cho tôi).</i>
      </div>
      <table>
        <tr><th>Cấu trúc</th><th>Dùng khi</th><th>Ví dụ</th></tr>
        <tr><td><b>have/get + vật + V3</b></td><td>Nhờ/thuê làm (không nói ai làm)</td><td>I <em class="g">had my car repaired</em>.</td></tr>
        <tr><td><b>have + người + V</b></td><td>Bảo ai đó làm</td><td>I''ll <em class="g">have the technician check</em> it.</td></tr>
        <tr><td><b>get + người + to V</b></td><td>Thuyết phục ai đó làm</td><td>I <em class="g">got my brother to help</em> me.</td></tr>
        <tr><td><b>have + vật + V3</b> (chuyện xấu)</td><td>Việc không mong muốn xảy ra với mình</td><td>She <em class="g">had her phone stolen</em>.</td></tr>
      </table>
      <p><b>Logic:</b> đây chính là <b>bị động</b> (bài 17) — cái xe <i>được sửa</i> → V3.</p>
      <div class="warn">Chia thì ở <b>have/get</b>, V3 giữ nguyên:<br>
        I <b>am having</b> my house painted. · I <b>had</b> it painted. · I <b>will get</b> it painted. · I <b>have just had</b> it painted.</div>'::text, null::text, false),
  ('28', 3, 'cards', null::text, 'Ghi nhớ nhanh', '2 phút · Flashcards'::text, null::text, null::text, null::text, false),
  ('28', 4, 'mcq', 'M'::text, 'Chọn đáp án đúng', '6 phút · Trắc nghiệm'::text, null::text, null::text, null::text, false),
  ('28', 5, 'typed', 'T'::text, 'Viết lại bằng have/get', '6 phút · Viết lại câu'::text, null::text, null::text, null::text, false),
  ('28', 6, 'typed', 'G'::text, 'Chia động từ trong ngoặc', '3 phút · Điền từ'::text, 'Chỉ gõ 1 từ hoặc cụm từ.'::text, null::text, null::text, true),
  ('28', 7, 'writing', null::text, 'Dịch vụ bạn hay dùng', '3 phút · Tự viết'::text, '4 câu về những việc bạn thuê/nhờ người khác làm (cắt tóc, sửa xe, giao hàng…) ở các thì khác nhau + 1 câu về chuyện không may (had sth stolen/broken).'::text, null::text, '1. I usually get my hair cut ...
2. ...
3. ...
4. ...'::text, false);
insert into public.section_items (section_id, position, prompt, back, options, correct_option, answers, words, explanation, tag)
select s.id, v.position, v.prompt, v.back, v.options, v.correct_option, v.answers, v.words, v.explanation, v.tag
from (values
  (1, 1, 'I wish I ___ more free time.'::text, null::text, array['had', 'have']::text[], 1::smallint, null::text[], null::text[], 'wish + past simple.'::text, 'wish'::text),
  (1, 2, 'I wish you ___ interrupting me!'::text, null::text, array['would stop', 'stopped']::text[], 1::smallint, null::text[], null::text[], 'Phàn nàn → would.'::text, 'wish + would'::text),
  (1, 3, 'It''s time we ___ a decision.'::text, null::text, array['made', 'make']::text[], 1::smallint, null::text[], null::text[], 'It''s time + sb + past.'::text, 'it''s time'::text),
  (3, 1, 'have sth done'::text, 'thuê/nhờ làm<br><i>have my nails done</i>'::text, null::text[], null::smallint, null::text[], null::text[], null::text, null::text),
  (3, 2, 'have sb do'::text, 'bảo ai làm<br><i>have the waiter bring it</i>'::text, null::text[], null::smallint, null::text[], null::text[], null::text, null::text),
  (3, 3, 'get sb to do'::text, 'thuyết phục ai làm<br><i>get him to agree</i>'::text, null::text[], null::smallint, null::text[], null::text[], null::text, null::text),
  (3, 4, 'had my bike stolen'::text, 'bị trộm xe (chuyện xấu)'::text, null::text[], null::smallint, null::text[], null::text[], null::text, null::text),
  (3, 5, 'Chia thì ở đâu?'::text, 'ở have/get'::text, null::text[], null::smallint, null::text[], null::text[], null::text, null::text),
  (4, 1, 'I ___ my hair cut yesterday.'::text, null::text, array['had', 'did', 'made']::text[], 1::smallint, null::text[], null::text[], 'have sth done → had.'::text, null::text),
  (4, 2, 'She''s getting her car ___.'::text, null::text, array['repair', 'repaired', 'repairing']::text[], 2::smallint, null::text[], null::text[], 'get sth + V3.'::text, null::text),
  (4, 3, 'I''ll have the technician ___ the air conditioner.'::text, null::text, array['check', 'to check', 'checked']::text[], 1::smallint, null::text[], null::text[], 'have + người + V nguyên mẫu.'::text, null::text),
  (4, 4, 'I got my brother ___ me move house.'::text, null::text, array['help', 'to help', 'helped']::text[], 2::smallint, null::text[], null::text[], 'get + người + to V.'::text, null::text),
  (4, 5, 'We need to ___ the roof repaired before the rainy season.'::text, null::text, array['get', 'make', 'do']::text[], 1::smallint, null::text[], null::text[], 'get sth done.'::text, null::text),
  (4, 6, 'He had his wallet ___ on the bus.'::text, null::text, array['steal', 'stealing', 'stolen']::text[], 3::smallint, null::text[], null::text[], 'Chuyện xấu: have sth + V3.'::text, null::text),
  (4, 7, 'Which sentence means somebody ELSE painted the house?'::text, null::text, array['We painted our house.', 'We had our house painted.']::text[], 2::smallint, null::text[], null::text[], 'had + house + painted → thuê người sơn.'::text, null::text),
  (4, 8, 'Where do you ___ your clothes washed?'::text, null::text, array['get', 'make', 'take']::text[], 1::smallint, null::text[], null::text[], 'get sth done.'::text, null::text),
  (5, 1, 'A mechanic is fixing my motorbike. <i>(I''m having…)</i>'::text, null::text, null::text[], null::smallint, array['I''m having my motorbike fixed.', 'I am having my motorbike fixed.']::text[], null::text[], 'Hiện tại tiếp diễn ở have.'::text, null::text),
  (5, 2, 'A photographer took our wedding photos. <i>(We had…)</i>'::text, null::text, null::text[], null::smallint, array['We had our wedding photos taken.']::text[], null::text[], 'take → taken.'::text, null::text),
  (5, 3, 'Someone will clean the carpets tomorrow. <i>(We''ll get…)</i>'::text, null::text, null::text[], null::smallint, array['We''ll get the carpets cleaned tomorrow.', 'We will get the carpets cleaned tomorrow.']::text[], null::text[], 'will get + sth + V3.'::text, null::text),
  (5, 4, 'Someone stole my bike last week. <i>(I had…)</i>'::text, null::text, null::text[], null::smallint, array['I had my bike stolen last week.']::text[], null::text[], 'Chuyện xấu: had + sth + V3.'::text, null::text),
  (5, 5, 'I asked my friend to fix my laptop and she did. <i>(I got…)</i>'::text, null::text, null::text[], null::smallint, array['I got my friend to fix my laptop.']::text[], null::text[], 'get + người + to V.'::text, null::text),
  (6, 1, 'You should have your eyes ___ (test).'::text, null::text, null::text[], null::smallint, array['tested']::text[], null::text[], 'have sth + V3.'::text, null::text),
  (6, 2, 'I''m going to get my teeth ___ (check) next week.'::text, null::text, null::text[], null::smallint, array['checked']::text[], null::text[], 'get sth + V3.'::text, null::text),
  (6, 3, 'She had the waiter ___ (bring) another glass.'::text, null::text, null::text[], null::smallint, array['bring']::text[], null::text[], 'have + người + V.'::text, null::text),
  (6, 4, 'I couldn''t get the kids ___ (go) to bed.'::text, null::text, null::text[], null::smallint, array['to go']::text[], null::text[], 'get + người + to V.'::text, null::text),
  (6, 5, 'Have you ever had your phone ___ (hack)?'::text, null::text, null::text[], null::smallint, array['hacked']::text[], null::text[], 'Chuyện xấu: had sth + V3.'::text, null::text)
) as v (section_position, position, prompt, back, options, correct_option, answers, words, explanation, tag)
join public.lesson_sections s on s.lesson_id = '28' and s.position = v.section_position;

-- Bài 29
insert into public.lessons (id, phase_id, position, title, description, heading, subtitle) values
  ('29', 3, 120, 'So sánh nâng cao', 'much / far, the more… the more', 'Comparatives & Superlatives nâng cao', 'Giai đoạn 3 · 30 phút · much/far + so sánh hơn, the more… the more, twice as… as');
insert into public.lesson_sections (lesson_id, position, type, score_key, title, time_label, hint, body, placeholder, short_input) values
  ('29', 1, 'mcq', 'W'::text, 'Warm-up', '3 phút · Ôn bài 28'::text, null::text, null::text, null::text, false),
  ('29', 2, 'explain', null::text, 'So sánh có mức độ', '7 phút · Hiểu logic'::text, null::text, '
      <p>Ở B1 bạn biết <i>bigger than, the biggest</i>. Ở B2, bạn cần nói <b>hơn bao nhiêu</b> và <b>thay đổi thế nào</b>.</p>
      <table>
        <tr><th>Ý muốn nói</th><th>Cấu trúc</th><th>Ví dụ</th></tr>
        <tr><td>Hơn <b>nhiều</b></td><td><b>much / far / a lot</b> + so sánh hơn</td><td>Hanoi is <em class="g">much bigger</em> than my town.</td></tr>
        <tr><td>Hơn <b>một chút</b></td><td><b>a bit / slightly / a little</b> + so sánh hơn</td><td>Prices are <em class="g">slightly higher</em>.</td></tr>
        <tr><td>Càng… càng…</td><td><b>the + so sánh hơn…, the + so sánh hơn…</b></td><td><em class="g">The more</em> you practise, <em class="g">the better</em> you get.</td></tr>
        <tr><td>Ngày càng…</td><td><b>so sánh hơn + and + so sánh hơn</b></td><td>It''s getting <em class="g">colder and colder</em>. / <em class="g">more and more</em> popular</td></tr>
        <tr><td>Gấp… lần</td><td><b>twice / three times + as … as</b></td><td>This is <em class="g">twice as expensive as</em> that.</td></tr>
        <tr><td>Không bằng</td><td><b>not as … as</b></td><td>My English <em class="g">isn''t as good as</em> yours.</td></tr>
        <tr><td>Nhất, bỏ xa</td><td><b>by far + the + so sánh nhất</b></td><td>She''s <em class="g">by far the best</em> student.</td></tr>
      </table>
      <div class="warn"><b>Lỗi thường gặp:</b><br>
        <s>more easier</s> → easier (không dùng 2 lần so sánh)<br>
        <s>very bigger</s> → much bigger (very không đi với so sánh hơn)<br>
        <s>The more you study, you learn more.</s> → The more you study, <b>the more</b> you learn.</div>'::text, null::text, false),
  ('29', 3, 'cards', null::text, 'Ghi nhớ nhanh', '2 phút · Flashcards'::text, null::text, null::text, null::text, false),
  ('29', 4, 'mcq', 'M'::text, 'Chọn đáp án đúng', '6 phút · Trắc nghiệm'::text, null::text, null::text, null::text, false),
  ('29', 5, 'typed', 'T'::text, 'Viết lại câu', '6 phút · Viết lại câu'::text, null::text, null::text, null::text, false),
  ('29', 6, 'order', 'O'::text, 'Sắp xếp thành câu đúng', '3 phút · Sắp xếp'::text, null::text, null::text, null::text, false),
  ('29', 7, 'writing', null::text, 'Bạn bây giờ vs 5 năm trước', '3 phút · Tự viết'::text, '4 câu: <b>much/far + so sánh hơn</b> · <b>the…, the…</b> · <b>-er and -er / more and more</b> · <b>not as … as</b>.'::text, null::text, '1. My life is much busier than ...
2. ...
3. ...
4. ...'::text, false);
insert into public.section_items (section_id, position, prompt, back, options, correct_option, answers, words, explanation, tag)
select s.id, v.position, v.prompt, v.back, v.options, v.correct_option, v.answers, v.words, v.explanation, v.tag
from (values
  (1, 1, 'I had my car ___ yesterday.'::text, null::text, array['washed', 'wash']::text[], 1::smallint, null::text[], null::text[], 'have sth + V3.'::text, 'causative'::text),
  (1, 2, 'She got her sister ___ her homework.'::text, null::text, array['to check', 'check']::text[], 1::smallint, null::text[], null::text[], 'get sb + to V.'::text, 'causative'::text),
  (1, 3, 'We''re having a new kitchen ___.'::text, null::text, array['installed', 'install']::text[], 1::smallint, null::text[], null::text[], 'have sth + V3.'::text, 'causative'::text),
  (3, 1, 'very bigger?'::text, '✘ → much / far bigger'::text, null::text[], null::smallint, null::text[], null::text[], null::text, null::text),
  (3, 2, 'càng… càng…'::text, 'The sooner, the better.'::text, null::text[], null::smallint, null::text[], null::text[], null::text, null::text),
  (3, 3, 'ngày càng nóng'::text, 'hotter and hotter'::text, null::text[], null::smallint, null::text[], null::text[], null::text, null::text),
  (3, 4, 'gấp đôi giá'::text, 'twice as expensive as'::text, null::text[], null::smallint, null::text[], null::text[], null::text, null::text),
  (3, 5, 'bỏ xa nhất'::text, 'by far the best'::text, null::text[], null::smallint, null::text[], null::text[], null::text, null::text),
  (4, 1, 'Hanoi is ___ bigger than my hometown.'::text, null::text, array['much', 'very', 'more']::text[], 1::smallint, null::text[], null::text[], 'much + so sánh hơn.'::text, null::text),
  (4, 2, 'The ___ you practise, the better you get.'::text, null::text, array['more', 'most', 'much']::text[], 1::smallint, null::text[], null::text[], 'The more…, the better…'::text, null::text),
  (4, 3, 'It''s getting ___.'::text, null::text, array['colder and colder', 'more cold', 'colder and more cold']::text[], 1::smallint, null::text[], null::text[], '-er and -er.'::text, null::text),
  (4, 4, 'This phone is ___ expensive as that one.'::text, null::text, array['twice as', 'two times more', 'twice more']::text[], 1::smallint, null::text[], null::text[], 'twice as … as.'::text, null::text),
  (4, 5, 'She is ___ the best student in the class.'::text, null::text, array['by far', 'very', 'much more']::text[], 1::smallint, null::text[], null::text[], 'by far + the + so sánh nhất.'::text, null::text),
  (4, 6, 'My English isn''t ___ good as yours.'::text, null::text, array['as', 'so much', 'more']::text[], 1::smallint, null::text[], null::text[], 'not as … as.'::text, null::text),
  (4, 7, 'Which sentence is WRONG?'::text, null::text, array['This test is more easier.', 'This test is a bit easier.', 'This test is far easier.']::text[], 1::smallint, null::text[], null::text[], 'easier đã là so sánh hơn → không thêm more.'::text, null::text),
  (4, 8, 'The older he gets, ___.'::text, null::text, array['the wiser he becomes', 'he becomes wiser', 'wiser he becomes']::text[], 1::smallint, null::text[], null::text[], 'Vế 2 cũng phải có the + so sánh hơn.'::text, null::text),
  (4, 9, 'Prices are ___ higher than last year.'::text, null::text, array['slightly', 'very', 'so']::text[], 1::smallint, null::text[], null::text[], 'slightly + so sánh hơn = hơn một chút.'::text, null::text),
  (5, 1, 'If you study more, you will learn more. <i>(The more…)</i>'::text, null::text, null::text[], null::smallint, array['The more you study, the more you learn.', 'The more you study, the more you will learn.']::text[], null::text[], 'The more…, the more…'::text, null::text),
  (5, 2, 'My car is cheaper than yours. <i>(not as … as)</i>'::text, null::text, null::text[], null::smallint, array['My car is not as expensive as yours.', 'My car isn''t as expensive as yours.']::text[], null::text[], 'cheaper than = not as expensive as.'::text, null::text),
  (5, 3, 'The traffic is getting worse all the time. <i>(… and …)</i>'::text, null::text, null::text[], null::smallint, array['The traffic is getting worse and worse.']::text[], null::text[], 'worse and worse.'::text, null::text),
  (5, 4, 'When it gets hotter, I feel more tired. <i>(The hotter…)</i>'::text, null::text, null::text[], null::smallint, array['The hotter it gets, the more tired I feel.', 'The hotter it gets, the more tired I get.']::text[], null::text[], 'The + so sánh hơn + S + V.'::text, null::text),
  (5, 5, 'No other city in Vietnam is as big as Ho Chi Minh City. <i>(by far)</i>'::text, null::text, null::text[], null::smallint, array['Ho Chi Minh City is by far the biggest city in Vietnam.', 'Ho Chi Minh City is by far the largest city in Vietnam.']::text[], null::text[], 'by far the + so sánh nhất.'::text, null::text),
  (6, 1, null::text, null::text, null::text[], null::smallint, null::text[], array['The sooner', 'we leave,', 'the earlier', 'we will', 'arrive']::text[], 'The + -er…, the + -er…'::text, null::text),
  (6, 2, null::text, null::text, null::text[], null::smallint, null::text[], array['English', 'is getting', 'more and more', 'popular', 'in Vietnam']::text[], 'more and more + tính từ dài.'::text, null::text),
  (6, 3, null::text, null::text, null::text[], null::smallint, null::text[], array['This book', 'is', 'far', 'more interesting', 'than', 'the film']::text[], 'far + so sánh hơn.'::text, null::text)
) as v (section_position, position, prompt, back, options, correct_option, answers, words, explanation, tag)
join public.lesson_sections s on s.lesson_id = '29' and s.position = v.section_position;

-- Bài 30
insert into public.lessons (id, phase_id, position, title, description, heading, subtitle) values
  ('30', 3, 130, 'Linking words', 'liên kết & lập luận', 'Linking Words — liên kết câu & lập luận', 'Giai đoạn 3 · 30 phút · although / despite / however / whereas / so that / in order to');
insert into public.lesson_sections (lesson_id, position, type, score_key, title, time_label, hint, body, placeholder, short_input) values
  ('30', 1, 'mcq', 'W'::text, 'Warm-up', '3 phút · Ôn bài 29'::text, null::text, null::text, null::text, false),
  ('30', 2, 'explain', null::text, 'Từ nối = chỉ đường cho người đọc', '8 phút · Hiểu logic'::text, null::text, '
      <p>Từ nối cho người đọc biết <b>quan hệ logic</b> giữa 2 ý: đối lập, nguyên nhân, kết quả, mục đích hay bổ sung. Chọn sai từ nối → lập luận bị sai, dù ngữ pháp đúng.</p>
      <table>
        <tr><th>Quan hệ</th><th>+ mệnh đề (S + V)</th><th>+ danh từ / V-ing</th><th>Đứng đầu câu mới</th></tr>
        <tr><td><b>Đối lập</b></td><td>although, even though, whereas, while</td><td>despite, in spite of</td><td>However, …</td></tr>
        <tr><td><b>Nguyên nhân</b></td><td>because, as, since</td><td>because of, due to</td><td>—</td></tr>
        <tr><td><b>Kết quả</b></td><td>so</td><td>—</td><td>Therefore, … / As a result, …</td></tr>
        <tr><td><b>Mục đích</b></td><td>so that (+ can/could/will/would)</td><td>to / in order to + V</td><td>—</td></tr>
        <tr><td><b>Bổ sung</b></td><td>and</td><td>—</td><td>Moreover, … / In addition, …</td></tr>
      </table>
      <div class="box">
        <b>Although</b> it was raining, we went out. = <b>Despite</b> the rain, we went out.<br>
        = It was raining. <b>However</b>, we went out.<br>
        Lan likes tea, <b>whereas</b> her husband prefers coffee. (so sánh 2 đối tượng)
      </div>
      <div class="warn"><b>Lỗi thường gặp của người Việt:</b><br>
        ① <s>Although</s> … <s>but</s> … — chỉ dùng MỘT từ (tiếng Việt nói "Mặc dù… nhưng…", tiếng Anh thì không).<br>
        ② <s>Despite it was cold</s> → Despite <b>the cold</b> / <b>Although</b> it was cold.<br>
        ③ <s>for buying</s> milk → <b>to buy</b> milk (mục đích).<br>
        ④ <s>Because of he was late</s> → <b>Because</b> he was late.</div>'::text, null::text, false),
  ('30', 3, 'cards', null::text, 'Ghi nhớ nhanh', '2 phút · Flashcards'::text, null::text, null::text, null::text, false),
  ('30', 4, 'mcq', 'M'::text, 'Chọn đáp án đúng', '6 phút · Trắc nghiệm'::text, null::text, null::text, null::text, false),
  ('30', 5, 'typed', 'T'::text, 'Viết lại câu', '5 phút · Viết lại câu'::text, null::text, null::text, null::text, false),
  ('30', 6, 'typed', 'E'::text, 'Sửa lỗi sai', '3 phút · Sửa lỗi'::text, null::text, null::text, null::text, false),
  ('30', 7, 'writing', null::text, 'Viết đoạn văn có lập luận', '3 phút · Viết đoạn'::text, '5–6 câu trả lời câu hỏi: <b>Should children learn English from primary school?</b> Dùng ít nhất 4 từ nối: 1 đối lập, 1 nguyên nhân, 1 kết quả, 1 mục đích. Tôi sẽ chấm cả <b>logic</b> và <b>liên kết</b>.'::text, null::text, 'In my opinion, ...'::text, false);
insert into public.section_items (section_id, position, prompt, back, options, correct_option, answers, words, explanation, tag)
select s.id, v.position, v.prompt, v.back, v.options, v.correct_option, v.answers, v.words, v.explanation, v.tag
from (values
  (1, 1, 'The ___ you sleep, the worse you feel.'::text, null::text, array['less', 'least']::text[], 1::smallint, null::text[], null::text[], 'The + so sánh hơn.'::text, 'the more…the more'::text),
  (1, 2, 'This app is ___ better than the old one.'::text, null::text, array['far', 'very']::text[], 1::smallint, null::text[], null::text[], 'far + so sánh hơn.'::text, 'comparatives'::text),
  (1, 3, 'My room isn''t as big ___ yours.'::text, null::text, array['as', 'than']::text[], 1::smallint, null::text[], null::text[], 'not as … as.'::text, 'comparatives'::text),
  (3, 1, 'although + ?'::text, 'mệnh đề (S + V)'::text, null::text[], null::smallint, null::text[], null::text[], null::text, null::text),
  (3, 2, 'despite + ?'::text, 'danh từ / V-ing'::text, null::text[], null::smallint, null::text[], null::text[], null::text, null::text),
  (3, 3, 'However'::text, 'đầu câu mới + dấu phẩy'::text, null::text[], null::smallint, null::text[], null::text[], null::text, null::text),
  (3, 4, 'Although … but?'::text, '✘ chỉ dùng 1 từ'::text, null::text[], null::smallint, null::text[], null::text[], null::text, null::text),
  (3, 5, 'Mục đích'::text, 'to V / so that + S + can'::text, null::text[], null::smallint, null::text[], null::text[], null::text, null::text),
  (3, 6, 'whereas'::text, 'so sánh đối lập 2 đối tượng'::text, null::text[], null::smallint, null::text[], null::text[], null::text, null::text),
  (4, 1, '___ it was raining, we went out.'::text, null::text, array['Although', 'Despite', 'However']::text[], 1::smallint, null::text[], null::text[], '+ mệnh đề → Although.'::text, null::text),
  (4, 2, '___ the rain, we went out.'::text, null::text, array['Although', 'Despite', 'However']::text[], 2::smallint, null::text[], null::text[], '+ danh từ → Despite.'::text, null::text),
  (4, 3, 'The hotel was expensive. ___, the service was terrible.'::text, null::text, array['However', 'Although', 'Moreover']::text[], 3::smallint, null::text[], null::text[], 'Đắt + dịch vụ tệ = 2 ý tiêu cực cùng chiều → bổ sung (Moreover), không phải đối lập.'::text, null::text),
  (4, 4, 'I study English every day ___ I can get a better job.'::text, null::text, array['so that', 'in order to', 'because of']::text[], 1::smallint, null::text[], null::text[], '+ mệnh đề có can → so that.'::text, null::text),
  (4, 5, 'She left early ___ catch the train.'::text, null::text, array['in order to', 'so that', 'because']::text[], 1::smallint, null::text[], null::text[], '+ V → in order to.'::text, null::text),
  (4, 6, 'The flight was cancelled ___ the storm.'::text, null::text, array['because', 'because of', 'so']::text[], 2::smallint, null::text[], null::text[], '+ danh từ → because of.'::text, null::text),
  (4, 7, 'My sister loves cats, ___ I prefer dogs.'::text, null::text, array['whereas', 'despite', 'so that']::text[], 1::smallint, null::text[], null::text[], 'So sánh 2 người → whereas.'::text, null::text),
  (4, 8, 'He didn''t study. ___, he failed the exam.'::text, null::text, array['As a result', 'However', 'Although']::text[], 1::smallint, null::text[], null::text[], 'Kết quả.'::text, null::text),
  (4, 9, 'In spite of ___ tired, she finished the race.'::text, null::text, array['be', 'being', 'she was']::text[], 2::smallint, null::text[], null::text[], 'in spite of + V-ing.'::text, null::text),
  (4, 10, 'Which sentence is the most LOGICAL?'::text, null::text, array['I was hungry, so I didn''t eat.', 'I was hungry, but I didn''t eat because I was on a diet.', 'I was hungry. However, I ate a lot.']::text[], 2::smallint, null::text[], null::text[], 'Câu 1: ''so'' sai logic. Câu 3: ''However'' sai logic (đói → ăn nhiều là bình thường, không đối lập).'::text, null::text),
  (5, 1, 'Although he was ill, he went to work. <i>(Despite)</i>'::text, null::text, null::text[], null::smallint, array['Despite being ill, he went to work.', 'Despite his illness, he went to work.', 'Despite the fact that he was ill, he went to work.']::text[], null::text[], 'Despite + V-ing / danh từ.'::text, null::text),
  (5, 2, 'I saved money. I wanted to buy a laptop. <i>(in order to)</i>'::text, null::text, null::text[], null::smallint, array['I saved money in order to buy a laptop.']::text[], null::text[], 'Mục đích + V.'::text, null::text),
  (5, 3, 'She speaks quietly. She doesn''t want to wake the baby. <i>(so that)</i>'::text, null::text, null::text[], null::smallint, array['She speaks quietly so that she doesn''t wake the baby.', 'She speaks quietly so that she won''t wake the baby.', 'She speaks quietly so that she does not wake the baby.', 'She speaks quietly so that she will not wake the baby.']::text[], null::text[], 'so that + mệnh đề.'::text, null::text),
  (5, 4, 'The film was long. It was very interesting. <i>(However)</i>'::text, null::text, null::text[], null::smallint, array['The film was long. However, it was very interesting.']::text[], null::text[], 'However đầu câu thứ 2.'::text, null::text),
  (6, 1, 'Despite it was cold, we went swimming.'::text, null::text, null::text[], null::smallint, array['Although it was cold, we went swimming.', 'Even though it was cold, we went swimming.', 'Despite the cold, we went swimming.']::text[], null::text[], 'Despite không đi với mệnh đề.'::text, null::text),
  (6, 2, 'I went to the shop for buying milk.'::text, null::text, null::text[], null::smallint, array['I went to the shop to buy milk.', 'I went to the shop in order to buy milk.']::text[], null::text[], 'Mục đích → to V.'::text, null::text),
  (6, 3, 'Although he is rich, but he is not happy.'::text, null::text, null::text[], null::smallint, array['Although he is rich, he is not happy.', 'He is rich, but he is not happy.']::text[], null::text[], 'Chỉ dùng 1 từ nối.'::text, null::text),
  (6, 4, 'Because of he was late, he missed the bus.'::text, null::text, null::text[], null::smallint, array['Because he was late, he missed the bus.']::text[], null::text[], '+ mệnh đề → because.'::text, null::text)
) as v (section_position, position, prompt, back, options, correct_option, answers, words, explanation, tag)
join public.lesson_sections s on s.lesson_id = '30' and s.position = v.section_position;

-- Bài 31
insert into public.lessons (id, phase_id, position, title, description, heading, subtitle) values
  ('31', 3, 140, 'Participle clauses', 'V-ing / Having V3 / V3', 'Participle Clauses — rút gọn mệnh đề trạng ngữ', 'Giai đoạn 3 · 30 phút · V-ing / Having + V3 / V3');
insert into public.lesson_sections (lesson_id, position, type, score_key, title, time_label, hint, body, placeholder, short_input) values
  ('31', 1, 'mcq', 'W'::text, 'Warm-up', '3 phút · Ôn bài 30'::text, null::text, null::text, null::text, false),
  ('31', 2, 'explain', null::text, 'Câu gọn hơn khi 2 vế CÙNG chủ ngữ', '7 phút · Hiểu logic'::text, null::text, '
      <p>Khi 2 vế có <b>cùng chủ ngữ</b>, có thể bỏ liên từ + chủ ngữ ở vế phụ và đổi động từ thành phân từ. Câu sẽ gọn và "học thuật" hơn.</p>
      <table>
        <tr><th>Dạng</th><th>Ý nghĩa</th><th>Ví dụ</th></tr>
        <tr><td><b>V-ing</b></td><td>Chủ động · cùng lúc / lý do</td><td><s>Because I felt</s> <em class="g">Feeling</em> tired, I went to bed.</td></tr>
        <tr><td><b>Having + V3</b></td><td>Chủ động · xảy ra <b>trước</b></td><td><s>After I had finished</s> <em class="g">Having finished</em> my work, I went home.</td></tr>
        <tr><td><b>V3</b></td><td><b>Bị động</b></td><td><s>The house was built in 1900. It…</s> <em class="g">Built</em> in 1900, the house…</td></tr>
        <tr><td><b>Not + V-ing</b></td><td>Phủ định</td><td><em class="g">Not knowing</em> what to do, I called my mum.</td></tr>
      </table>
      <div class="warn"><b>Lỗi "chủ ngữ treo" (dangling participle):</b> chủ ngữ của vế chính PHẢI là người/vật làm hành động ở vế phân từ.<br>
        <s>Walking to school, the rain started.</s> → Cơn mưa đi bộ đến trường?! ✘<br>
        <b>Walking to school, I</b> got caught in the rain. ✔</div>
      <div class="box"><b>Liên hệ bài 20:</b> rút gọn mệnh đề quan hệ cũng theo logic này — chủ động → V-ing, bị động → V3.</div>'::text, null::text, false),
  ('31', 3, 'cards', null::text, 'Ghi nhớ nhanh', '2 phút · Flashcards'::text, null::text, null::text, null::text, false),
  ('31', 4, 'mcq', 'M'::text, 'Chọn đáp án đúng', '6 phút · Trắc nghiệm'::text, null::text, null::text, null::text, false),
  ('31', 5, 'typed', 'T'::text, 'Rút gọn câu', '6 phút · Viết lại câu'::text, null::text, null::text, null::text, false),
  ('31', 6, 'order', 'O'::text, 'Sắp xếp thành câu đúng', '3 phút · Sắp xếp'::text, null::text, null::text, null::text, false),
  ('31', 7, 'writing', null::text, 'Một ngày của bạn', '3 phút · Tự viết'::text, '4 câu kể về một ngày gần đây, dùng: <b>V-ing</b> · <b>Having + V3</b> · <b>V3</b> (bị động) · <b>Not + V-ing</b>. Kiểm tra: chủ ngữ vế chính có đúng là người làm hành động không?'::text, null::text, '1. Having finished breakfast, I ...
2. ...
3. ...
4. ...'::text, false);
insert into public.section_items (section_id, position, prompt, back, options, correct_option, answers, words, explanation, tag)
select s.id, v.position, v.prompt, v.back, v.options, v.correct_option, v.answers, v.words, v.explanation, v.tag
from (values
  (1, 1, '___ being tired, he kept working.'::text, null::text, array['Despite', 'Although']::text[], 1::smallint, null::text[], null::text[], '+ V-ing → Despite.'::text, 'linking'::text),
  (1, 2, 'I left early ___ avoid the traffic.'::text, null::text, array['to', 'so that']::text[], 1::smallint, null::text[], null::text[], '+ V → to.'::text, 'purpose'::text),
  (1, 3, 'Lan likes tea, ___ her husband prefers coffee.'::text, null::text, array['whereas', 'however']::text[], 1::smallint, null::text[], null::text[], 'Nối 2 vế trong 1 câu → whereas.'::text, 'linking'::text),
  (3, 1, 'V-ing'::text, 'chủ động, cùng lúc / lý do'::text, null::text[], null::smallint, null::text[], null::text[], null::text, null::text),
  (3, 2, 'Having + V3'::text, 'chủ động, xảy ra trước'::text, null::text[], null::smallint, null::text[], null::text[], null::text, null::text),
  (3, 3, 'V3'::text, 'bị động'::text, null::text[], null::smallint, null::text[], null::text[], null::text, null::text),
  (3, 4, 'Not + V-ing'::text, 'phủ định'::text, null::text[], null::smallint, null::text[], null::text[], null::text, null::text),
  (3, 5, 'Điều kiện bắt buộc'::text, '2 vế CÙNG chủ ngữ'::text, null::text[], null::smallint, null::text[], null::text[], null::text, null::text),
  (4, 1, '___ tired, I went to bed early.'::text, null::text, array['Feeling', 'Felt', 'Having felt']::text[], 1::smallint, null::text[], null::text[], 'Lý do, chủ động → V-ing.'::text, null::text),
  (4, 2, '___ my homework, I watched TV.'::text, null::text, array['Finishing', 'Having finished', 'Finished']::text[], 2::smallint, null::text[], null::text[], 'Làm xong rồi mới xem TV → Having + V3.'::text, null::text),
  (4, 3, '___ in 1902, the bridge is over 100 years old.'::text, null::text, array['Building', 'Built', 'Having built']::text[], 2::smallint, null::text[], null::text[], 'Cây cầu được xây → bị động → V3.'::text, null::text),
  (4, 4, '___ the news, she started to cry.'::text, null::text, array['Hearing', 'Heard', 'Being heard']::text[], 1::smallint, null::text[], null::text[], 'Cô ấy nghe (chủ động) → V-ing.'::text, null::text),
  (4, 5, 'Not ___ what to do, I called my mother.'::text, null::text, array['knowing', 'known', 'know']::text[], 1::smallint, null::text[], null::text[], 'Not + V-ing.'::text, null::text),
  (4, 6, '___ by his teacher, he worked harder.'::text, null::text, array['Encouraging', 'Encouraged', 'Having encouraged']::text[], 2::smallint, null::text[], null::text[], 'Anh ấy được khuyến khích → V3.'::text, null::text),
  (4, 7, 'Which sentence is CORRECT?'::text, null::text, array['Walking to school, the rain started.', 'Walking to school, I got caught in the rain.', 'Walked to school, I got caught in the rain.']::text[], 2::smallint, null::text[], null::text[], 'Chủ ngữ ''I'' là người đi bộ.'::text, null::text),
  (4, 8, '___ in Hanoi for 10 years, he knows the city very well.'::text, null::text, array['Living', 'Having lived', 'Lived']::text[], 2::smallint, null::text[], null::text[], 'Đã sống 10 năm (trước) → biết rõ (sau) → Having + V3.'::text, null::text),
  (5, 1, 'Because I didn''t have any money, I couldn''t buy the ticket.'::text, null::text, null::text[], null::smallint, array['Not having any money, I couldn''t buy the ticket.', 'Not having money, I couldn''t buy the ticket.', 'Having no money, I couldn''t buy the ticket.', 'Not having any money, I could not buy the ticket.']::text[], null::text[], 'Phủ định → Not + V-ing.'::text, null::text),
  (5, 2, 'After she had locked the door, she went to bed.'::text, null::text, null::text[], null::smallint, array['Having locked the door, she went to bed.']::text[], null::text[], 'Xảy ra trước → Having + V3.'::text, null::text),
  (5, 3, 'The book was written in 1950. It is still popular today.'::text, null::text, null::text[], null::smallint, array['Written in 1950, the book is still popular today.']::text[], null::text[], 'Bị động → V3.'::text, null::text),
  (5, 4, 'While I was walking in the park, I saw an old friend.'::text, null::text, null::text[], null::smallint, array['Walking in the park, I saw an old friend.', 'While walking in the park, I saw an old friend.']::text[], null::text[], 'Cùng lúc → V-ing.'::text, null::text),
  (5, 5, 'As he felt hungry, he made a sandwich.'::text, null::text, null::text[], null::smallint, array['Feeling hungry, he made a sandwich.']::text[], null::text[], 'Lý do → V-ing.'::text, null::text),
  (6, 1, null::text, null::text, null::text[], null::smallint, null::text[], array['Having lost', 'my keys,', 'I had to', 'call', 'a locksmith']::text[], 'Having + V3: mất chìa trước, gọi thợ sau.'::text, null::text),
  (6, 2, null::text, null::text, null::text[], null::smallint, null::text[], array['Made', 'in Italy,', 'these shoes', 'are', 'very expensive']::text[], 'Giày được làm → V3.'::text, null::text),
  (6, 3, null::text, null::text, null::text[], null::smallint, null::text[], array['Seeing', 'the police,', 'the thief', 'ran away']::text[], 'Tên trộm thấy (chủ động) → V-ing.'::text, null::text)
) as v (section_position, position, prompt, back, options, correct_option, answers, words, explanation, tag)
join public.lesson_sections s on s.lesson_id = '31' and s.position = v.section_position;
