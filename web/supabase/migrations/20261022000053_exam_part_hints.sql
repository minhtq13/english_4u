-- Each part of a paper (phonetics, grammar, reading...) prints a short instruction under its title. The defaults are
-- built into the app; a teacher can write their own per exam set. part_hints holds only the ones they changed, as
-- {"phonetics": "...", "reading": "..."}; a part without an entry prints the default.

alter table public.exam_sets
  add column part_hints jsonb not null default '{}'::jsonb
    check (jsonb_typeof(part_hints) = 'object' and pg_column_size(part_hints) <= 20000);
