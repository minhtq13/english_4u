# Glossary

Domain terms of english_4u, as the code names them. UI wording is Vietnamese; the Vietnamese term is given where pages use it.

- **Lesson** (bài học): one 30-minute session of a grade's course, made of sections. Curriculum lessons ship with the course; teachers make others in the editor.
- **Section kind**: one kind of auto-graded question (`mcq`, `typed`, `order`, `match`, `error`). Everything one kind needs (served row → question, grading, saving, editing, checks) is its entry in `SECTION_KINDS`.
- **Draft** (bản nháp): a lesson being edited, as plain strings per input; turned into the save payload, and previewed as that payload served like a saved lesson.
- **Class lesson** (bài giao cho lớp): a lesson given to one class (`class_lessons`), with its settings: deadline, whole class or chosen students, results at submit, shuffle, closed.
- **Give** (giao bài): make a lesson a class lesson of a class. Done from the class page, or from the lesson editor's last card when the lesson is saved. A class that already has the lesson can have its settings changed there; taking the lesson back is only on the class page.
- **Results at submit** (hiện điểm ngay khi nộp): students see their score and the right answers as soon as they submit; off, only once the teacher grades or releases.
- **Shuffle** (trộn câu cho từng em): each student gets their own fixed order of questions and answer choices; scoring is unchanged.
- **Closed** (đã đóng): a class lesson that takes no more work: closed by the teacher, or past its deadline.
- **Attempt** (bài làm): one student's work on one lesson: in progress, submitted, graded.
- **Released** (đã có điểm): the viewer may see an attempt's score. Teachers: once submitted. Students: once graded, or at submit when the class lesson shows results at once.
- **Attempt outcome**: what one viewer may see of an attempt (released, score, status label), decided in one place (`attemptOutcome()`).
- **Grading queue** (chấm lần lượt): the submitted attempts of one class lesson, graded oldest first.
- **Redo** (cho làm lại): a teacher reopens a submitted attempt; its graded results are dropped in the same transaction.
- **Question bank** (ngân hàng câu hỏi): every auto-graded question the reader may see with answers, across lessons; picked questions become a new lesson.
- **Take back** (thu hồi): remove a class lesson; only while no student of the class has opened it (any attempt, submitted or not).
- **Server list**: a list that grows with users or time, read one page at a time with its filters applied in the database.
