-- Two new auto-graded section types for THCS exam formats: matching pairs and error identification.
-- New enum values must be committed before any migration uses them, so they get their own migration.
alter type public.section_type add value if not exists 'match';
alter type public.section_type add value if not exists 'error';
