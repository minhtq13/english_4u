# Khôi phục dữ liệu khi bị mất

Gói Supabase Free không có bản sao lưu tải về được. Dữ liệu được sao lưu bằng workflow `.github/workflows/db-backup.yml`
(mỗi ngày 02:00 giờ VN, mã hoá bằng `BACKUP_PASSPHRASE`, giữ 30 ngày ở mục *Artifacts*). Có thể mất tối đa khoảng 24 giờ dữ liệu gần nhất.

Các lệnh dưới đây là những lệnh đã chạy thử thành công khi khôi phục vào một database trống và đối chiếu với production
(số dòng của mọi bảng có dữ liệu, 56 policy, 36 hàm, 9 trigger, 50 index, checksum nội dung bài học và lịch sử migration đều khớp). Chưa thử khôi phục vào một
project Supabase mới thật, nên lần đầu hãy làm chậm và đối chiếu số liệu.

## 0. Bình tĩnh trước

- Ngừng ghi thêm dữ liệu nếu còn truy cập được. Đừng chạy thêm lệnh xoá hay sửa.
- Xác định **mất một phần** (xoá nhầm, sửa nhầm: mục 3A) hay **mất cả project** (bị xoá, bị khoá: mục 3B).
- Project Free tự tạm dừng khi lâu không dùng; thường vào Dashboard là khôi phục được, chưa cần đến backup.

## 1. Lấy và mở backup

1. GitHub → tab **Actions** → *db-backup* → lần chạy xanh gần nhất → **Artifacts** → tải `db-backup-YYYY-MM-DD.zip`, giải nén ra `backup-YYYY-MM-DD.tar.gpg`.
2. Lấy `BACKUP_PASSPHRASE` từ trình quản lý mật khẩu. **Mất passphrase là mất backup.**
3. Mở file (macOS chưa có `gpg`, dùng Docker):

   ```bash
   docker run --rm -it -v "$PWD":/w alpine sh -c 'apk add -q gnupg && gpg -d /w/backup-2026-10-23.tar.gpg | tar -x -C /w'
   ```

   Ra năm file, đủ mọi bảng có dữ liệu:

   | File | Nội dung |
   |---|---|
   | `public.dump` | schema `public` + `private`: bảng, dữ liệu, RLS, hàm, trigger |
   | `auth.dump` | dữ liệu mọi bảng `auth`: tài khoản (kèm mã băm mật khẩu), identities, sessions, refresh tokens, MFA |
   | `storage.dump` | dữ liệu các bảng `storage` (bucket, thông tin object; file thật không nằm trong database) |
   | `migrations.dump` | `supabase_migrations.schema_migrations`: lịch sử migration kèm câu SQL |
   | `cron-jobs.sql` | định nghĩa các job `pg_cron` dạng SQL |

Muốn xem thử một backup có khôi phục sạch không (cần chuỗi kết nối production để đối chiếu):

```bash
ENV_FILE=~/.e4u-backup.env bash web/supabase/backup-test.sh file ~/Downloads/backup-2026-10-23.tar.gpg
```

`~/.e4u-backup.env` có hai dòng `SUPABASE_DB_URL=…` và `BACKUP_PASSPHRASE=…`; xoá file này khi xong. Cần Docker đang chạy.

## 2. Công cụ khôi phục

`pg_restore` phải là **bản 17 trở lên** (database chạy PostgreSQL 17). Bản 14 của Homebrew sẽ không đọc được file.
Dùng `/opt/homebrew/opt/libpq/bin/pg_restore` (17.x) hoặc chạy trong container `public.ecr.aws/supabase/postgres:17.6.1.171`.

## 3A. Mất một phần, project còn sống

**Đừng ghi đè** database đang chạy. Khôi phục backup vào một database riêng (project Supabase tạm, hoặc Docker như `backup-test.sh`,
làm như mục 3B nhưng vào `$SCRATCH`), rồi chỉ nạp lại đúng những bảng bị mất. Quy trình dưới đây đã diễn tập (xoá nhầm toàn bộ
bài làm và lớp học rồi khôi phục: mọi chỉ số khớp trước khi xoá). Ba điều diễn tập cho thấy, đừng bỏ qua:

1. **Nạp theo thứ tự cha trước con**, từng bảng một lệnh `pg_restore -t` riêng. Gộp nhiều `-t` vào một lệnh sẽ nạp sai thứ tự và bị
   khoá ngoại từ chối (giao dịch tự huỷ, không đổi gì).
2. **Tắt trigger của chính các bảng đó trong lúc nạp.** Không tắt thì lệnh vẫn "thành công" nhưng trigger `attempts_guard_status`
   ghi đè `submitted_at` của mọi bài làm thành giờ hiện tại. Đừng dùng `session_replication_role`: Supabase không cho role `postgres` đặt nó.
3. **Cột bị đặt NULL khi xoá bảng cha** phải sửa lại bằng tay: xoá `classes` làm `profiles.class_id` thành NULL; xoá `lessons` làm
   `error_log.lesson_id` và `lessons.created_by` thành NULL. Lấy giá trị đúng từ database tạm.

Thứ tự cha trước con của các bảng app: `courses, phases, classes, profiles, lessons, lesson_sections, section_items, class_teachers,
class_lessons, class_lesson_students, attempts, attempt_results, feedback, error_log, comment_templates, lesson_structures, admin_emails`.

Ví dụ khi mất `classes`, `attempts` và các bảng con của chúng (`URL` là database đang chạy, `public.dump` đã giải nén):

```bash
TABLES="classes attempts attempt_results feedback class_teachers class_lessons class_lesson_students"
for t in $TABLES; do psql "$URL" -c "alter table public.$t disable trigger user"; done
for t in $TABLES; do pg_restore --single-transaction --data-only --no-owner -t "$t" -d "$URL" public.dump || break; done
for t in $TABLES; do psql "$URL" -c "alter table public.$t enable trigger user"; done

# học sinh bị mất lớp: lấy lại từ database tạm ($SCRATCH)
psql "$SCRATCH" -c "\copy (select id, class_id from public.profiles where class_id is not null) to 'profile-classes.csv' csv"
psql "$URL" <<'SQL'
create temp table pc (id uuid, class_id uuid);
\copy pc from 'profile-classes.csv' csv
update public.profiles p set class_id = pc.class_id from pc where p.id = pc.id and p.class_id is null;
SQL
```

Nạp xong, đối chiếu số dòng với `$SCRATCH`, và so cột `submitted_at` của vài bài làm. Chỉ nạp được vào bảng đang **trống** phần bị mất
(còn dòng cũ thì lỗi trùng khoá và giao dịch của bảng đó tự huỷ).

## 3B. Mất cả project

1. Tạo project Supabase mới, lấy chuỗi **Session pooler** (Dashboard → Connect) và mật khẩu database. Đặt vào `URL`.
2. Khôi phục, theo đúng thứ tự (tài khoản trước vì `profiles` tham chiếu `auth.users`):

   ```bash
   pg_restore --data-only --no-owner -d "$URL" auth.dump
   pg_restore --data-only --no-owner -d "$URL" storage.dump          # bỏ qua nếu project mới báo thiếu bảng
   pg_restore -l public.dump | grep -v -E '^[0-9]+; [0-9]+ [0-9]+ SCHEMA - public ' > list.txt   # bỏ dòng tạo schema public (project nào cũng có sẵn)
   pg_restore --no-owner --no-privileges -L list.txt -d "$URL" public.dump
   pg_restore --data-only --no-owner -d "$URL" migrations.dump       # lịch sử migration; bỏ qua nếu project mới chưa có bảng này
   ```

3. Tạo lại trigger tạo hồ sơ khi có tài khoản mới (nằm trên `auth.users` nên bản dump `public` không có):

   ```bash
   psql "$URL" -f web/supabase/migrations/20261022000036_auth_user_trigger.sql
   ```

4. Bật extension `pg_cron` (Dashboard → Database → Extensions) rồi tạo lại các job (chạy sau bước 2 vì job gọi hàm trong schema `private`):

   ```bash
   psql "$URL" -f cron-jobs.sql
   ```

   Hiện chỉ có job `close-due-lessons`; định nghĩa gốc cũng nằm trong `web/supabase/migrations/20261022000023_lesson_deadlines.sql`.
   Muốn người dùng phải đăng nhập lại thay vì giữ phiên cũ thì chạy `psql "$URL" -c "truncate auth.sessions cascade"`.
5. Nối ứng dụng với project mới:
   - Vercel: đổi `SUPABASE_URL` và `SUPABASE_KEY` (publishable key của project mới), rồi deploy lại.
   - Supabase → Authentication: bật Email, cấu hình Google, đặt Site URL và Redirect URLs, tắt *Allow new users to sign up*.
   - Deploy lại edge function `manage-accounts` (mã ở `web/supabase/functions/`, tắt verify JWT).
   - GitHub: cập nhật secret `SUPABASE_DB_URL` sang project mới để backup tiếp tục chạy.
6. Kiểm tra: số dòng các bảng so với lúc bình thường, rồi đăng nhập thử một tài khoản giáo viên và một học sinh.

## Đã diễn tập

Trên một bản sao trong Docker (Postgres 17 kiểu Supabase), từ một backup mới dump ra đúng lệnh của workflow:

| Kịch bản | Cách khôi phục | Thời gian | Kết quả |
|---|---|---|---|
| A. Xoá nhầm toàn bộ bài làm và lớp | mục 3A | ~10 giây | 61/61 chỉ số khớp trước khi xoá |
| B. Mất sạch database | mục 3B | ~7 giây | 61/61 chỉ số khớp và giống production thật |

Thời gian trên là cục bộ với database nhỏ (14 MB); trên Supabase thật sẽ lâu hơn do mạng. Chưa thử trên project Supabase mới thật,
và chưa thử bước tạo lại job `pg_cron` (bản sao không có `pg_cron`).

## Không nằm trong backup

- Cài đặt Auth (Google, Site URL, tắt đăng ký tự do), biến môi trường Vercel, secret GitHub.
- Các bảng do Supabase tự quản lý, khôi phục sẽ xung đột: `auth/storage/realtime.schema_migrations`; và nhật ký chạy `cron.job_run_details`.
- File thật trong Supabase Storage (database chỉ giữ thông tin; hiện chưa dùng Storage). Bảng `vault.secrets` (hiện trống).
- Repo **không có migration tạo các bảng gốc** (`profiles`, `classes`…): `public.dump` là bản lưu schema đầy đủ duy nhất, nên backup phải luôn chạy.

## Giữ backup khoẻ

- Mỗi tháng chạy thử `backup-test.sh file …` với một bản mới.
- Artifact chỉ giữ 30 ngày, và repo công khai bị GitHub tắt lịch chạy sau 60 ngày không hoạt động: thỉnh thoảng xem tab Actions, và tải một bản về máy mỗi tháng.
- Giữ `BACKUP_PASSPHRASE` ở trình quản lý mật khẩu, khác mật khẩu database.
- Nếu dữ liệu học sinh thật quan trọng, cân nhắc gói Pro của Supabase (sao lưu hằng ngày do họ giữ).
