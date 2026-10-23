-- Sao lưu dữ liệu english_4u (gói Supabase Free không có bản sao lưu tải về được).
-- Chạy trong Supabase Dashboard → SQL Editor. Query chỉ ĐỌC dữ liệu; hàm tạm pg_temp biến mất khi hết phiên.
-- Kết quả là MỘT ô tên backup_sql chứa script khôi phục (INSERT cho từng bảng, kèm số dòng mỗi bảng ở đầu).
-- Lưu lại: bấm vào ô → Copy (hoặc Export → Download CSV), dán vào file backup-YYYY-MM-DD.sql, giữ ở nơi riêng tư.
-- Schema, RLS, hàm, trigger KHÔNG nằm trong file này: chúng nằm trong web/supabase/migrations/ của repo.

create or replace function pg_temp.dump_table(sch text, tbl text)
returns table (n bigint, stmt text)
language plpgsql as $$
declare
  fq text := format('%I.%I', sch, tbl);
  cols text;
  gen text[];
  js jsonb;
begin
  -- cột sinh tự động (generated) không được INSERT, nên bỏ khỏi cả danh sách cột lẫn JSON
  select string_agg(quote_ident(attname), ', ' order by attnum) filter (where attgenerated = ''),
         coalesce(array_agg(attname::text) filter (where attgenerated <> ''), '{}')
    into cols, gen
    from pg_attribute
   where attrelid = fq::regclass and attnum > 0 and not attisdropped;

  execute format('select coalesce(jsonb_agg(to_jsonb(t) - $1), ''[]''::jsonb) from %s t', fq) into js using gen;

  n := jsonb_array_length(js);
  stmt := format(E'-- %s: %s dòng\ninsert into %s (%s) overriding system value\nselect %s from jsonb_populate_recordset(null::%s, %L::jsonb);',
                 fq, n, fq, cols, cols, fq, js::text);
  return next;
end $$;

with cfg as (
  -- Đổi false thành true để sao lưu cả tài khoản đăng nhập (auth.users và auth.identities).
  -- CẢNH BÁO: khi đó file chứa mã băm mật khẩu của mọi người dùng; giữ file thật kín.
  select false as with_auth
),
known (ord, sch, tbl) as (
  values (10, 'auth', 'users'), (11, 'auth', 'identities'),
         (20, 'public', 'courses'), (21, 'public', 'phases'), (22, 'public', 'classes'), (23, 'public', 'profiles'),
         (24, 'public', 'lessons'), (25, 'public', 'lesson_sections'), (26, 'public', 'section_items'),
         (27, 'public', 'class_teachers'), (28, 'public', 'class_lessons'), (29, 'public', 'class_lesson_students'),
         (30, 'public', 'attempts'), (31, 'public', 'attempt_results'), (32, 'public', 'feedback'),
         (33, 'public', 'error_log'), (34, 'public', 'comment_templates'), (35, 'public', 'lesson_structures'),
         (36, 'public', 'admin_emails')
),
extra as (
  -- bảng public mới mà danh sách trên chưa có vẫn được sao lưu (xếp cuối)
  select 90 as ord, n.nspname::text as sch, c.relname::text as tbl
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r', 'p')
    and not exists (select 1 from known k where k.sch = n.nspname and k.tbl = c.relname)
),
targets as (
  select k.ord, k.sch, k.tbl from known k, cfg where k.sch = 'public' or cfg.with_auth
  union all
  select e.ord, e.sch, e.tbl from extra e
),
dumped as (
  select t.ord, t.sch, t.tbl, d.n, d.stmt
  from targets t cross join lateral pg_temp.dump_table(t.sch, t.tbl) d
)
select
  E'-- Sao lưu english_4u lúc ' || to_char(now() at time zone 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD HH24:MI') || E' (giờ VN)\n'
  || E'-- Khôi phục: chạy trên database ĐÃ có schema (chạy các migrations) và các bảng dưới đây ĐANG TRỐNG.\n'
  || (select string_agg(format('--   %s.%s: %s dòng', sch, tbl, n), E'\n' order by ord, tbl) from dumped) || E'\n\n'
  || E'begin;\n'
  || E'set local session_replication_role = replica;  -- tắt trigger và kiểm tra khoá ngoại trong lúc nạp\n\n'
  || (select string_agg(stmt, E'\n\n' order by ord, tbl) from dumped) || E'\n\n'
  || E'commit;\n' as backup_sql;
