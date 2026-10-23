-- Third role: teacher (between student and admin). Added on its own because a new enum value
-- cannot be used in the same transaction that creates it.
alter type public.app_role add value if not exists 'teacher' before 'admin';
