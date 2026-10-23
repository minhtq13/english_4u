-- Lesson content lives in the database so teachers can edit it in the Supabase Table Editor.
--   phases            1 row per phase (Giai đoạn)
--   lessons           1 row per lesson; id like '19.1' (also used by attempts.lesson_id)
--   lesson_sections   ordered parts of a lesson (explain, cards, mcq, typed, order, writing)
--   section_items     ordered questions / flashcards inside a section

create type public.section_type as enum ('explain', 'cards', 'mcq', 'typed', 'order', 'writing');

create table public.phases (
  id smallint primary key,                         -- 1, 2, 3, 4 (also the display order)
  name text not null
);
comment on table public.phases is 'Giai đoạn của lộ trình. id cũng là thứ tự hiển thị.';

create table public.lessons (
  id text primary key check (id ~ '^[0-9]+(\.[0-9]+)*$'),
  phase_id smallint not null references public.phases (id),
  position integer not null,                       -- order in the course (10, 20, 30… leaves room to insert)
  title text not null,                             -- short title for lists
  description text not null default '',            -- one-line summary for lists
  heading text not null,                           -- full title on the lesson page
  subtitle text not null default '',
  is_published boolean not null default true,      -- false = only teachers see it
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.lessons is 'Bài học. Đổi id sẽ tự cập nhật bài làm liên quan. is_published = false để ẩn khỏi học viên.';
create index lessons_phase_idx on public.lessons (phase_id);

create trigger lessons_updated_at
  before update on public.lessons
  for each row execute function public.set_updated_at();

create table public.lesson_sections (
  id uuid primary key default gen_random_uuid(),
  lesson_id text not null references public.lessons (id) on update cascade on delete cascade,
  position integer not null,
  type public.section_type not null,
  score_key text check (score_key ~ '^[A-Z]$'),    -- one letter; required for mcq/typed/order (answers are saved as key+number, e.g. M3)
  title text not null,
  time_label text,                                 -- e.g. '5 phút · Trắc nghiệm'
  hint text,                                       -- HTML allowed
  body text,                                       -- explain: HTML content
  placeholder text,                                -- writing: textarea placeholder
  short_input boolean not null default false,      -- typed: narrow input box
  unique (lesson_id, position) deferrable initially deferred,
  unique (lesson_id, score_key),
  constraint score_key_for_scored_types check ((type in ('mcq', 'typed', 'order')) = (score_key is not null)),
  constraint explain_has_body check (type <> 'explain' or body is not null)
);
comment on table public.lesson_sections is 'Các phần của bài học theo position. mcq/typed/order cần score_key (1 chữ in hoa, khác nhau trong cùng bài).';

create table public.section_items (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.lesson_sections (id) on delete cascade,
  position integer not null,
  prompt text,             -- mcq/typed: question (HTML allowed) · order: instruction (optional) · cards: front
  back text,               -- cards: back
  options text[],          -- mcq: choices
  correct_option smallint, -- mcq: number of the correct choice, counting from 1
  answers text[],          -- typed: accepted answers, the first is shown as the model answer · order: other accepted sentences
  words text[],            -- order: chunks in the correct order (shuffled for the learner)
  explanation text,        -- shown after answering (HTML allowed)
  tag text,                -- short label for the error log, e.g. 'non-defining'
  unique (section_id, position) deferrable initially deferred
);
comment on table public.section_items is 'Câu hỏi / flashcard. Cột cần điền tuỳ loại section: cards = prompt + back; mcq = prompt + options + correct_option (đếm từ 1); typed = prompt + answers; order = words (+ answers cho cách sắp xếp khác).';
create index section_items_section_idx on public.section_items (section_id);

-- Reject items that do not fit their section type, with a message an editor can act on.
create or replace function public.validate_section_item()
returns trigger
language plpgsql set search_path = ''
as $$
declare
  t public.section_type;
begin
  select type into t from public.lesson_sections where id = new.section_id;
  if t in ('explain', 'writing') then
    raise exception 'Section loại % không có câu hỏi', t;
  elsif t = 'cards' then
    if coalesce(new.prompt, '') = '' or coalesce(new.back, '') = '' then
      raise exception 'Flashcard cần prompt (mặt trước) và back (mặt sau)';
    end if;
  elsif t = 'mcq' then
    if coalesce(new.prompt, '') = '' then raise exception 'Câu trắc nghiệm cần prompt'; end if;
    if coalesce(array_length(new.options, 1), 0) < 2 then raise exception 'Câu trắc nghiệm cần ít nhất 2 options'; end if;
    if new.correct_option is null or new.correct_option < 1 or new.correct_option > array_length(new.options, 1) then
      raise exception 'correct_option phải từ 1 đến % (số lựa chọn)', array_length(new.options, 1);
    end if;
  elsif t = 'typed' then
    if coalesce(new.prompt, '') = '' then raise exception 'Câu tự luận cần prompt'; end if;
    if coalesce(array_length(new.answers, 1), 0) < 1 then raise exception 'Câu tự luận cần ít nhất 1 đáp án trong answers'; end if;
  elsif t = 'order' then
    if coalesce(array_length(new.words, 1), 0) < 2 then raise exception 'Câu sắp xếp cần ít nhất 2 cụm trong words'; end if;
  end if;
  return new;
end;
$$;

create trigger section_items_validate
  before insert or update on public.section_items
  for each row execute function public.validate_section_item();

-- Lists show the number of auto-graded questions per lesson.
create view public.lesson_overview
with (security_invoker = true) as
select
  l.id,
  l.phase_id,
  l.position,
  l.title,
  l.description,
  l.is_published,
  coalesce((
    select count(*)
    from public.section_items i
    join public.lesson_sections s on s.id = i.section_id
    where s.lesson_id = l.id and s.score_key is not null
  ), 0)::integer as scored_items
from public.lessons l;

-- Row level security: everyone signed in reads published lessons; teachers read and edit everything.
alter table public.phases enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_sections enable row level security;
alter table public.section_items enable row level security;

create policy "Signed-in users read phases" on public.phases
  for select to authenticated using (true);
create policy "Teachers insert phases" on public.phases
  for insert to authenticated with check ((select public.is_admin()));
create policy "Teachers update phases" on public.phases
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Teachers delete phases" on public.phases
  for delete to authenticated using ((select public.is_admin()));

create policy "Read published lessons or any as teacher" on public.lessons
  for select to authenticated using (is_published or (select public.is_admin()));
create policy "Teachers insert lessons" on public.lessons
  for insert to authenticated with check ((select public.is_admin()));
create policy "Teachers update lessons" on public.lessons
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Teachers delete lessons" on public.lessons
  for delete to authenticated using ((select public.is_admin()));

create policy "Read sections of visible lessons" on public.lesson_sections
  for select to authenticated
  using (exists (select 1 from public.lessons l where l.id = lesson_id));
create policy "Teachers insert sections" on public.lesson_sections
  for insert to authenticated with check ((select public.is_admin()));
create policy "Teachers update sections" on public.lesson_sections
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Teachers delete sections" on public.lesson_sections
  for delete to authenticated using ((select public.is_admin()));

create policy "Read items of visible lessons" on public.section_items
  for select to authenticated
  using (exists (select 1 from public.lesson_sections s where s.id = section_id));
create policy "Teachers insert items" on public.section_items
  for insert to authenticated with check ((select public.is_admin()));
create policy "Teachers update items" on public.section_items
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Teachers delete items" on public.section_items
  for delete to authenticated using ((select public.is_admin()));
