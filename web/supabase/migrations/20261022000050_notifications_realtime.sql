-- Let the app hear about a new notification at once: notifications joins the supabase_realtime publication.
-- Realtime applies the table's RLS, so a person only receives their own rows. The app still polls once a minute
-- as a fallback, so a dropped connection loses nothing.
alter publication supabase_realtime add table public.notifications;
