-- A teacher who does not like how an exam code came out can shuffle that code again. Every code is shuffled by a seed
-- made from the code itself, so it always gives the same paper; shuffle_rounds adds a counter per code
-- ({"101": 2} = code 101 was shuffled again twice). A code without an entry, or with 0, keeps the first shuffle, so
-- every saved exam set prints exactly as before.
--
-- Rollback: alter table public.exam_sets drop column shuffle_rounds;

alter table public.exam_sets
  add column shuffle_rounds jsonb not null default '{}'::jsonb
    check (jsonb_typeof(shuffle_rounds) = 'object' and pg_column_size(shuffle_rounds) <= 4000);
