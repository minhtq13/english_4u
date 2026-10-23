# english_4u

English grammar learning site for Vietnamese learners: THCS grades 6–9 (Tiếng Anh Global Success) plus a B1→B2 track. Users, UI text and docs are Vietnamese; code, comments and agent docs are English.

- `web/`: the product, a Nuxt 4 + Supabase app deployed on Vercel. Read `web/CLAUDE.md` before working there.
- `progress.md`: the original learner's B1→B2 journal (topics, recurring errors), kept for the grammar-tutor role.
- `artifact/grammar-b2.html`: a frozen snapshot of the old single-page version. Leave it as it is.

Lesson content lives in the Supabase database, not in files. To add or change lessons use the `add-lesson` skill; for any schema change use the `db-migration` skill.

Git: remote `git@github.com:minhtq13/english_4u.git` (SSH). `main` auto-deploys to Vercel, so commit and push only when the user asks. Leave the Copilot branch and PR #1 untouched.
