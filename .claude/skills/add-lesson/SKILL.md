---
name: add-lesson
description: Write or change grammar lesson content (units for lớp 6–9, B1→B2 lessons, extra practice or review lessons). Use when the user asks for new lessons, more units, or edits to existing questions.
---

# Add or change lesson content

Lessons live in the database (`courses → phases → lessons → lesson_sections → section_items`). New content is shipped as a seed migration, applied with the `db-migration` skill. Which columns each section type needs, and the validation the database runs, are in `web/README.md` under "Bài học"; the house style to copy is `web/supabase/migrations/20261022000008_seed_grade_unit1.sql`.

## Steps

1. **Pin the curriculum.** For grade courses, follow Tiếng Anh Global Success for that grade and unit (unit title, grammar focus, vocabulary theme). For B1→B2, read `progress.md` and the learner's open errors so the lesson targets them. Done when you can state the unit, its grammar point and the errors it drills.
2. **Fit the course.** Query the course's phases and lessons. Ids must match `^[0-9]+(\.[0-9]+)*$` (`lessons_id_check`): textbook units are `<grade>.<unit>` with label `Unit N`; B1→B2 takes the next free number (e.g. `19.3` for extra practice). `<grade>.101` and up belong to lessons teachers make in the editor (`next_lesson_id()`); leave them alone. Positions step by 10 so later lessons can slot in between. Add a phase (e.g. "Học kỳ 2") only when the curriculum moves into it.
3. **Write the lesson** as one 30-minute session, in Vietnamese explanations with English examples: `explain` (HTML using `box`, `warn`, `em.g`, tables), `cards`, then scored `mcq` / `typed` / `order` sections with one-letter `score_key`s, and a short `writing` task. A practice lesson in exam format (id `<grade>.<unit>.1`, label `Luyện đề N`) uses the THCS formats instead: pronunciation with `[x]` underlines, a passage in `body` for reading and gap-fill, `match` and `error`; copy `web/supabase/migrations/20261022000030_seed_practice_unit1.sql`. Every scored item carries an `explanation` (shown after results are released) and a short `tag` naming the grammar point. Done when every scored item has a single defensible answer, its accepted variants listed in `answers` (e.g. `don't wear` and `do not wear`), and an explanation.
4. **Apply** through the `db-migration` skill. The validation trigger rejects malformed items with a Vietnamese message; fix the item, keeping the file and the applied SQL identical.
5. **Check** with a read-only query that each new lesson has the expected section and item counts (`lesson_overview.scored_items`). New lessons are assigned to no class; tell the user that teachers assign them per class with "Giao cho lớp".

## Changing existing lessons

Attempts store answers by `score_key` + item number. For a lesson anyone has done (`select count(*) from attempts where lesson_id = …`), edit wording, options and explanations in place, and keep item count and order fixed; add a new lesson for new questions. A lesson with attempts cannot be deleted.
