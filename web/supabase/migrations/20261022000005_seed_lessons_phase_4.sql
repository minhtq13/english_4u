-- Seed: Giai đoạn 4 — Tổng hợp (tuần 12–13)

-- Bài 32
insert into public.lessons (id, phase_id, position, title, description, heading, subtitle) values
  ('32', 4, 150, 'Ôn tổng hợp 19–31', 'điều chỉnh theo lỗi của bạn', 'Ôn tổng hợp bài 19–31', 'Giai đoạn 4 · 30 phút · bản mặc định — sẽ được điều chỉnh theo nhật ký lỗi của bạn');
insert into public.lesson_sections (lesson_id, position, type, score_key, title, time_label, hint, body, placeholder, short_input) values
  ('32', 1, 'explain', null::text, 'Bài kiểm tra tổng hợp', '2 phút · Cách làm'::text, null::text, '
      <p>Mỗi câu thuộc một bài khác nhau, được ghi ở cuối giải thích. Câu nào sai thì <b>mở lại bài đó</b> và đọc phần "Hiểu logic".</p>
      <div class="box">Mục tiêu: ≥ 80% đúng. Nhóm lỗi nào sai ≥ 2 câu sẽ được ôn lại trong buổi sau.</div>'::text, null::text, false),
  ('32', 2, 'mcq', 'M'::text, 'Chọn đáp án đúng', '10 phút · Trắc nghiệm'::text, null::text, null::text, null::text, false),
  ('32', 3, 'typed', 'E'::text, 'Sửa lỗi sai', '8 phút · Sửa lỗi'::text, null::text, null::text, null::text, false),
  ('32', 4, 'writing', null::text, 'Một thay đổi trong cuộc sống của tôi', '10 phút · Viết đoạn'::text, 'Viết 6–8 câu về một thay đổi lớn trong cuộc sống của bạn (chuyển nhà, đổi việc, học điều mới…). Dùng ít nhất <b>5 cấu trúc</b> khác nhau từ bài 19–31 và <b>gạch chân/ghi chú</b> chúng bằng [ngoặc vuông].'::text, null::text, 'Two years ago, I [used to] ...'::text, false);
insert into public.section_items (section_id, position, prompt, back, options, correct_option, answers, words, explanation, tag)
select s.id, v.position, v.prompt, v.back, v.options, v.correct_option, v.answers, v.words, v.explanation, v.tag
from (values
  (2, 1, 'The man ___ car was stolen called the police.'::text, null::text, array['whose', 'who', 'which']::text[], 1::smallint, null::text[], null::text[], 'Sở hữu → whose. (Bài 19)'::text, '19 relative'::text),
  (2, 2, 'My sister, ___ lives in Hue, is a teacher.'::text, null::text, array['who', 'that']::text[], 1::smallint, null::text[], null::text[], 'Có dấu phẩy → không dùng that. (Bài 19)'::text, '19 relative'::text),
  (2, 3, 'The students ___ in the library are preparing for exams.'::text, null::text, array['studying', 'studied', 'are studying']::text[], 1::smallint, null::text[], null::text[], 'Rút gọn chủ động → V-ing. (Bài 20)'::text, '20 reduced RC'::text),
  (2, 4, 'I''m looking forward to ___ you.'::text, null::text, array['seeing', 'see']::text[], 1::smallint, null::text[], null::text[], 'to là giới từ → V-ing. (Bài 21)'::text, '21 gerund'::text),
  (2, 5, 'I ___ live in the countryside, but now I live in the city.'::text, null::text, array['used to', 'am used to']::text[], 1::smallint, null::text[], null::text[], 'Quá khứ, giờ không còn. (Bài 22)'::text, '22 used to'::text),
  (2, 6, 'Could you tell me where ___?'::text, null::text, array['the station is', 'is the station']::text[], 1::smallint, null::text[], null::text[], 'Câu gián tiếp → S + V. (Bài 23)'::text, '23 indirect Q'::text),
  (2, 7, 'You ___ wear a uniform; it''s optional.'::text, null::text, array['don''t have to', 'mustn''t']::text[], 1::smallint, null::text[], null::text[], 'Không cần. (Bài 24)'::text, '24 obligation'::text),
  (2, 8, 'She''s not answering. She ___ be asleep.'::text, null::text, array['might', 'mustn''t', 'should']::text[], 1::smallint, null::text[], null::text[], 'Không chắc → might. (Bài 25)'::text, '25 deduction'::text),
  (2, 9, 'I ___ the window. Now the room is full of mosquitoes.'::text, null::text, array['shouldn''t have opened', 'mustn''t have opened', 'can''t have opened']::text[], 1::smallint, null::text[], null::text[], 'Hối tiếc → shouldn''t have. (Bài 26)'::text, '26 past modals'::text),
  (2, 10, 'I wish I ___ more confident.'::text, null::text, array['were', 'am', 'would be']::text[], 1::smallint, null::text[], null::text[], 'Ước hiện tại → were. (Bài 27)'::text, '27 wish'::text),
  (2, 11, 'I need to get my passport ___.'::text, null::text, array['renewed', 'renew', 'to renew']::text[], 1::smallint, null::text[], null::text[], 'get sth + V3. (Bài 28)'::text, '28 causative'::text),
  (2, 12, 'The more you read, ___ your vocabulary becomes.'::text, null::text, array['the bigger', 'bigger', 'the biggest']::text[], 1::smallint, null::text[], null::text[], 'The more…, the + -er. (Bài 29)'::text, '29 comparatives'::text),
  (2, 13, '___ the traffic, we arrived on time.'::text, null::text, array['Despite', 'Although', 'However']::text[], 1::smallint, null::text[], null::text[], '+ danh từ → Despite. (Bài 30)'::text, '30 linking'::text),
  (2, 14, '___ the email, he closed his laptop.'::text, null::text, array['Having sent', 'Sent', 'Having send']::text[], 1::smallint, null::text[], null::text[], 'Xảy ra trước → Having + V3. (Bài 31)'::text, '31 participle'::text),
  (3, 1, 'This is the house where I bought it last year.'::text, null::text, null::text[], null::smallint, array['This is the house which I bought last year.', 'This is the house that I bought last year.', 'This is the house I bought last year.']::text[], null::text[], 'Tân ngữ → which/that + bỏ ''it''. (Bài 19)'::text, '19 relative'::text),
  (3, 2, 'I decided studying abroad.'::text, null::text, null::text[], null::smallint, array['I decided to study abroad.']::text[], null::text[], 'decide + to V. (Bài 21)'::text, '21 gerund'::text),
  (3, 3, 'I''m not used to drive on the left.'::text, null::text, null::text[], null::smallint, array['I''m not used to driving on the left.', 'I am not used to driving on the left.']::text[], null::text[], 'be used to + V-ing. (Bài 22)'::text, '22 used to'::text),
  (3, 4, 'Do you know what time is it?'::text, null::text, null::text[], null::smallint, array['Do you know what time it is?']::text[], null::text[], 'Câu gián tiếp → S + V. (Bài 23)'::text, '23 indirect Q'::text),
  (3, 5, 'He must have went home.'::text, null::text, null::text[], null::smallint, array['He must have gone home.']::text[], null::text[], 'have + V3. (Bài 26)'::text, '26 past modals'::text),
  (3, 6, 'Although it was late but she kept working.'::text, null::text, null::text[], null::smallint, array['Although it was late, she kept working.', 'It was late, but she kept working.']::text[], null::text[], 'Chỉ 1 từ nối. (Bài 30)'::text, '30 linking'::text)
) as v (section_position, position, prompt, back, options, correct_option, answers, words, explanation, tag)
join public.lesson_sections s on s.lesson_id = '32' and s.position = v.section_position;

-- Bài 33
insert into public.lessons (id, phase_id, position, title, description, heading, subtitle) values
  ('33', 4, 160, 'Bài viết tổng hợp', 'ngữ pháp + logic + liên kết', 'Bài viết tổng hợp — ngữ pháp + logic + liên kết', 'Giai đoạn 4 · 30 phút · từ câu đúng đến đoạn văn hay');
insert into public.lesson_sections (lesson_id, position, type, score_key, title, time_label, hint, body, placeholder, short_input) values
  ('33', 1, 'explain', null::text, 'Một đoạn văn tốt gồm những gì?', '6 phút · Hiểu logic'::text, null::text, '
      <table>
        <tr><th>Phần</th><th>Nhiệm vụ</th></tr>
        <tr><td><b>Câu chủ đề</b></td><td>Nói rõ ý chính của cả đoạn — người đọc biết ngay đoạn văn nói về gì.</td></tr>
        <tr><td><b>Ý hỗ trợ (2–3)</b></td><td>Mỗi ý có lý do hoặc ví dụ. Mọi câu phải phục vụ ý chính.</td></tr>
        <tr><td><b>Từ nối</b></td><td>Chỉ rõ quan hệ: First, In addition, However, As a result… (bài 30)</td></tr>
        <tr><td><b>Kết luận</b></td><td>Nhắc lại ý chính bằng cách nói khác.</td></tr>
      </table>
      <div class="box"><b>Đoạn mẫu:</b><br>
        <u>Cycling to work has several important benefits.</u> <b>First,</b> it is a free form of exercise <i>which</i> keeps you healthy. <b>In addition,</b> cyclists don''t have to pay for petrol or parking, <i>so</i> they save money. <b>However,</b> cycling in big cities can be dangerous, <i>so</i> riders should always wear a helmet. <b>Overall,</b> the more people cycle, the cleaner and healthier our cities will become.</div>
      <div class="warn"><b>Checklist tự sửa trước khi nộp:</b><br>
        ☐ Mỗi câu có chủ ngữ + động từ? ☐ Thì động từ đúng? ☐ Không có câu lạc đề?<br>
        ☐ Từ nối đúng logic (không "Although… but")? ☐ Không lặp một từ quá nhiều lần?</div>'::text, null::text, false),
  ('33', 2, 'mcq', 'M'::text, 'Logic & diễn đạt tự nhiên', '6 phút · Trắc nghiệm'::text, null::text, null::text, null::text, false),
  ('33', 3, 'order', 'O'::text, 'Sắp xếp các câu thành đoạn văn logic', '4 phút · Sắp xếp đoạn văn'::text, 'Mỗi ô là một câu. Hãy tìm câu chủ đề → các ý hỗ trợ → kết luận.'::text, null::text, null::text, false),
  ('33', 4, 'typed', 'E'::text, 'Sửa lỗi trong câu (nhiều chủ đề)', '4 phút · Sửa lỗi'::text, null::text, null::text, null::text, false),
  ('33', 5, 'writing', null::text, 'Bài viết cuối khoá', '10 phút · Viết đoạn'::text, '120–150 từ: <b>The biggest challenge of learning English and how I deal with it.</b><br>Yêu cầu: câu chủ đề rõ ràng · 2–3 ý hỗ trợ có ví dụ · ít nhất 4 từ nối · ít nhất 5 cấu trúc từ bài 19–31 · câu kết luận. Dùng checklist ở trên để tự sửa trước khi copy kết quả.'::text, null::text, 'For me, the biggest challenge of learning English is ...'::text, false);
insert into public.section_items (section_id, position, prompt, back, options, correct_option, answers, words, explanation, tag)
select s.id, v.position, v.prompt, v.back, v.options, v.correct_option, v.answers, v.words, v.explanation, v.tag
from (values
  (2, 1, 'Which is the best topic sentence for a paragraph about the benefits of cycling to work?'::text, null::text, array['I have a bike.', 'Cycling to work has several important benefits for both health and the environment.', 'Cars are expensive.']::text[], 2::smallint, null::text[], null::text[], 'Câu chủ đề phải bao quát ý chính của cả đoạn.'::text, 'clarity'::text),
  (2, 2, 'Cycling is healthy. ___, it is cheaper than driving.'::text, null::text, array['Moreover', 'However', 'Although']::text[], 1::smallint, null::text[], null::text[], '2 lợi ích cùng chiều → bổ sung.'::text, 'cohesion'::text),
  (2, 3, 'Which conclusion fits best?'::text, null::text, array['In conclusion, cycling to work is a simple way to stay healthy and save money.', 'In conclusion, I like cars.', 'In conclusion, bikes have two wheels.']::text[], 1::smallint, null::text[], null::text[], 'Kết luận nhắc lại ý chính.'::text, 'logic'::text),
  (2, 4, 'Which sentence does NOT belong in a paragraph about why remote work is popular?'::text, null::text, array['Workers save time on commuting.', 'Companies can save money on offices.', 'My favourite food is pho.']::text[], 3::smallint, null::text[], null::text[], 'Lạc đề.'::text, 'logic'::text),
  (2, 5, 'Choose the most natural sentence:'::text, null::text, array['I very like learning English.', 'I really like learning English.', 'I like very much learning English.']::text[], 2::smallint, null::text[], null::text[], 'very không đứng trước động từ; very much đặt sau tân ngữ.'::text, 'naturalness'::text),
  (2, 6, 'Choose the clearest sentence:'::text, null::text, array['Because traffic, I late.', 'I was late because of the heavy traffic.', 'The traffic made late me.']::text[], 2::smallint, null::text[], null::text[], 'Đủ chủ ngữ, động từ; because of + danh từ.'::text, 'clarity'::text),
  (3, 1, 'Đoạn văn: Learning English'::text, null::text, null::text[], null::smallint, null::text[], array['Learning English has changed my life in many ways.', 'First, I can now read news and articles from all over the world.', 'In addition, I have made friends with people from different countries.', 'However, it has not always been easy, because grammar used to confuse me.', 'Overall, the effort has been worth it.']::text[], 'Câu chủ đề → First → In addition → However (mặt khó khăn) → Overall (kết luận).'::text, null::text),
  (4, 1, 'Although I studied hard, but I didn''t pass.'::text, null::text, null::text[], null::smallint, array['Although I studied hard, I didn''t pass.', 'I studied hard, but I didn''t pass.', 'Although I studied hard, I did not pass.']::text[], null::text[], 'Chỉ 1 từ nối.'::text, 'cohesion'::text),
  (4, 2, 'The teacher who she taught me English was very patient.'::text, null::text, null::text[], null::smallint, array['The teacher who taught me English was very patient.', 'The teacher that taught me English was very patient.']::text[], null::text[], 'Thừa ''she''.'::text, 'relative'::text),
  (4, 3, 'I wish I can speak English fluently.'::text, null::text, null::text[], null::smallint, array['I wish I could speak English fluently.']::text[], null::text[], 'wish + could.'::text, 'wish'::text)
) as v (section_position, position, prompt, back, options, correct_option, answers, words, explanation, tag)
join public.lesson_sections s on s.lesson_id = '33' and s.position = v.section_position;
