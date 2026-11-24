-- Which parts of a paper are left as they are when the exam codes are shuffled. A teacher may want the phonetics
-- part or a reading passage to print the same on every code and shuffle only the rest. fixed_parts lists the parts
-- that are NOT shuffled (by part key); the default is empty, so every saved exam set keeps shuffling all its parts.
--
-- Rollback: alter table public.exam_sets drop column fixed_parts;

alter table public.exam_sets
  add column fixed_parts text[] not null default '{}'
    check (fixed_parts <@ array['phonetics', 'grammar', 'error', 'reading', 'match', 'order', 'typed']::text[]);
