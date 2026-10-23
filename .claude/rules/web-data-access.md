---
paths:
  - "web/app/**"
---

# Data access in the web app (free tiers: Vercel Hobby + Supabase Free)

Every query is **lean**: it fetches only what the screen shows.

- Name the columns in `select(...)`; use `*` only for a single row whose columns the page mostly renders.
- Counts and percentages come from aggregate views (`course_summary`, `class_overview`, `student_progress`, `class_lesson_stats`, `lesson_stats`, `course_error_stats`) or from `select("id", { count: "exact", head: true })`. When a page needs a new aggregate, add a `security_invoker` view in a migration rather than summing raw `attempts` or `profiles` rows in the browser.
- A list that grows with users or time is paginated on the server: `.range(...pageRange(page, PAGE))` with `{ count: "exact" }`, the `Pager` component, and filters/search applied in the query (`.eq`, `.or(...ilike...)`), not in a `computed` over a full fetch.
- Lists bounded by the curriculum or by one person (a course outline, one class's students, one learner's attempts) may load whole.
- Student-facing code reads lesson questions only through `getLesson()` (`lesson_items` RPC) and results only from `attempt_results`.
- A new filter, join or sort column on a large table gets an index in the same migration.
