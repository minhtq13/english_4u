-- Spaced repetition for flashcards (Leitner boxes 1-5). A student marks a card "remembered" or "not yet" while studying;
-- the box and the next review day are kept here, per student, and "Ôn tập hôm nay" lists the cards due today.
-- `card` is "<lesson id>:<section index>:<card index>" as the lesson page numbers them.
create table public.card_reviews (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  card text not null check (char_length(card) between 3 and 200),
  box smallint not null default 1 check (box between 1 and 5),
  due_on date not null default current_date,
  updated_at timestamptz not null default now(),
  primary key (user_id, card)
);
create index card_reviews_due_idx on public.card_reviews (user_id, due_on);
comment on table public.card_reviews is 'Leitner box and next review day of each flashcard a student has studied.';

alter table public.card_reviews enable row level security;
create policy "card_reviews: own" on public.card_reviews for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "session alive" on public.card_reviews as restrictive for all to authenticated
  using ((select private.session_alive())) with check ((select private.session_alive()));
