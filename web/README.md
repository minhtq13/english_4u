# Grammar B1→B2 — web

Nuxt 4 (SPA) + Supabase (Postgres, Auth Google, RLS). Deploy trên Vercel.

## Chạy trên máy

```bash
cd web
nvm use            # Node 24 (xem .nvmrc) — Nuxt 4.6 cần Node ≥ 22.21
npm install
cp .env.example .env
npm run dev        # http://localhost:3000
```

## Bài học (sửa trực tiếp trong database)

Nội dung bài nằm trong Supabase. Sửa bằng **Supabase Dashboard → Table Editor**; website đọc lại khi tải trang.

```
courses                 khoá học: lop-6 … lop-9 (kind = grade) và b1-b2 (kind = track)
└─ phases               giai đoạn / học kỳ của khoá, theo position
   └─ lessons           bài học (id "6.1" = lớp 6 Unit 1, "19.1"…; label hiển thị "Unit 1")
      └─ lesson_sections   các phần của bài, theo position
         └─ section_items  câu hỏi / flashcard, theo position
```

### Đăng nhập và tài khoản

Học sinh đăng nhập bằng **tên đăng nhập + mật khẩu** do giáo viên/admin cấp ở trang **Học sinh** (`/teacher/students`;
giáo viên chỉ thấy học sinh các lớp mình dạy). Admin cấp tài khoản giáo viên ở **Giáo viên** (`/admin/teachers`). Ở các trang này:
tạo nhiều tài khoản một lần (mỗi dòng một họ tên, tên đăng nhập tự sinh dạng `6t1.01`, mật khẩu ngẫu nhiên — copy/in ngay vì
không xem lại được), sửa tên, đặt lại mật khẩu, khoá/mở khoá, chuyển lớp; admin xoá được tài khoản. Các thao tác này chạy qua
Edge Function `manage-accounts` (mã nguồn ở `supabase/functions/manage-accounts`). Admin và giáo viên vẫn đăng nhập được bằng Google;
mã lớp vẫn dùng được cho tài khoản chưa có lớp.
Mọi người tự đổi mật khẩu ở trang **Tài khoản** (`/account`, bấm vào tên mình ở cuối sidebar): nhập mật khẩu hiện tại rồi
mật khẩu mới. Tài khoản chỉ dùng Google thì đặt được mật khẩu lần đầu. Học sinh quên mật khẩu thì giáo viên đặt lại.

Cài đặt Supabase cần có: **Authentication → Sign In / Providers → Email** bật; tắt **Allow new users to sign up** để người lạ
không tự tạo tài khoản bằng Google (tài khoản do trang quản lý tạo vẫn được).

### Công cụ cho giáo viên

| Công cụ | Ở đâu | Ghi chú |
|---|---|---|
| Chấm lần lượt | Chấm bài → "Chấm lần lượt", hoặc cột Chờ chấm ở trang lớp | Lưu nhận xét / trả kết quả là tự sang em tiếp theo. |
| Nhận xét mẫu | Ô nhận xét ở trang chấm (`comment_templates`) | Bấm để chèn; "Lưu thành mẫu"; mỗi giáo viên có mẫu riêng. |
| Cấu trúc bài đã lưu | Bước "Cấu trúc bài" của trang soạn bài (`lesson_structures`) | Lưu danh sách phần (loại, tiêu đề, gợi ý, số câu, mẫu đề THCS), không lưu câu hỏi; mỗi giáo viên có mẫu riêng. |
| Trả kết quả cả lớp | Cột Chờ chấm ở trang lớp (`release_class_results()`) | Cho phiếu chỉ có câu tự chấm. |
| Chưa nộp | Mục "Chưa nộp" ở trang lớp (view `class_missing_work`) | Theo bài, gần hạn trước; copy để nhắn Zalo. |
| In phiếu | Nút "In" ở danh sách bài / xem trước (`/teacher/print/<id>`) | Bản học sinh hoặc bản đáp án; in hoặc lưu PDF từ trình duyệt. |
| Ngân hàng câu hỏi | Trình soạn → "+ Lấy câu từ ngân hàng" (view `question_bank`) | Câu tự chấm của các bài giáo viên đọc được, lọc theo khối / chữ / nhãn. |
| Trộn đề | Ô "Trộn câu cho từng em" ở trang lớp (`class_lessons.shuffle`) | Mỗi em thứ tự câu và lựa chọn riêng, cố định; chấm vẫn theo câu gốc. |
| Phiếu ôn từ câu sai | Trang lớp / hồ sơ học sinh → "Tạo phiếu ôn" (`wrong_questions()`) | Chọn bài + cả lớp hoặc 1 em → chọn câu → mở trình soạn; phiếu cho 1 em chỉ mở cho em đó. |

### Sao lưu

Gói Supabase Free không có bản sao lưu tải về được, nên dùng các cách sau (đều chỉ đọc dữ liệu production):

- **Hằng ngày, tự động**: workflow `.github/workflows/db-backup.yml` chạy `pg_dump` lúc 02:00 giờ VN, lấy mọi bảng có dữ liệu (app, `auth`, `storage`, lịch sử migration, job `pg_cron`), mã hoá bằng mật khẩu rồi giữ 30 ngày ở mục *Artifacts* của lần chạy (tab Actions). Cần hai secret của repo: `SUPABASE_DB_URL` (chuỗi *Session pooler* ở Dashboard → Connect) và `BACKUP_PASSPHRASE`. Có nút *Run workflow* để chạy ngay, ví dụ trước khi sửa dữ liệu hàng loạt. Cách mở và khôi phục khi mất dữ liệu: xem `supabase/RESTORE.md`.
- **Thử khôi phục**: `bash supabase/backup-test.sh file <file .tar.gpg>` mở một backup, khôi phục vào database tạm trong Docker và đối chiếu với production.
- **Thủ công**: `supabase/backup.sql` chạy trong SQL Editor, trả về một script `INSERT` khôi phục dữ liệu các bảng.

### Ngôn ngữ giao diện

Tiếng Việt (mặc định) và tiếng Anh; đổi bằng nút **VI / EN** ở thanh bên, trang đăng nhập và trang Tài khoản (lưu trong cookie `lang`).
Chữ giao diện nằm ở `i18n/locales/vi.json` và `en.json`; nội dung bài học giữ nguyên như khi soạn. Lỗi từ database (tiếng Việt) được dịch sang tiếng Anh trong `app/utils/serverErrors.ts`.

### Vai trò, lớp và mở bài

| Vai trò | Trang | Quyền (được kiểm soát bằng RLS trong database) |
|---|---|---|
| Học sinh | `/`, `/progress`, `/join-class`, `/lessons/<id>` | Vào lớp **một lần** bằng mã lớp (`join_class`), không tự đổi lớp; chỉ đọc nội dung bài đã mở cho lớp mình. |
| Giáo viên | `/teacher`, `/teacher/classes/<id>`, `/teacher/grading`, `/courses` | Chỉ lớp được phân công (`class_teachers`): xem mã lớp, học sinh, mở/khoá bài (`class_lessons`), chấm bài, chuyển học sinh giữa các lớp mình dạy. Xem trước bài nhưng không lưu bài làm. |
| Admin | tất cả + `/admin`, `/admin/classes`, `/admin/users`, `/admin/courses/<id>` | Toàn quyền: tạo/xoá lớp, đổi mã lớp, phân công giáo viên, đổi vai trò, xếp lớp, sửa nội dung. Khoá B1→B2 (`is_published = false`) chỉ admin thấy. |

**Soạn bài trên web:** giáo viên vào **Soạn bài** (hoặc nút "+ Tạo bài cho lớp" ở trang lớp), chọn khối và học kỳ, chọn cấu trúc
có sẵn (cấu trúc chuẩn 6 phần hoặc theo một bài đã có, có thể lấy cả nội dung) và các phần muốn dùng, rồi soạn bằng trình soạn
thảo. Mã bài tự sinh dạng `6.101`, `6.102`… Chỉ người soạn (hoặc admin) sửa được bài; bài đã có học sinh làm thì không sửa câu hỏi được nữa.

**Giao bài:** mọi bài thuộc khối và lúc đầu chưa giao cho lớp nào. Giáo viên bấm **Giao cho lớp** ở trang lớp (thêm dòng
`class_lessons`); chỉ học sinh của lớp được giao mới thấy và làm được bài đó. Mặc định cả lớp được làm; cột **Ai được làm** cho phép
chỉ mở cho một số em (`for_all = false` + bảng `class_lesson_students`), các em khác thấy bài kèm khoá. **Đóng bài**
(`close_class_lesson()`, cột `closed`) ngừng nhận bài, nộp tự động bài đang làm dở; học sinh vẫn xem lại bài đã nộp.
**Thu hồi** (xoá dòng `class_lessons`) chỉ được khi chưa học sinh nào của lớp làm bài; database chặn trường hợp còn lại.
**Hạn nộp** (`class_lessons.due_at`, nút "+ Đặt hạn nộp" ở trang lớp): đúng giờ hạn học sinh không lưu/nộp được nữa; job
`close-due-lessons` (pg_cron, mỗi phút, hàm `private.close_due_lessons()`) đóng bài và nộp tự động bài làm dở. Mở lại bài đã quá hạn thì hạn được xoá.
**Làm bài và nộp bài:** học sinh làm bài không biết đúng/sai (chỉ lưu lựa chọn vào `attempts.answers`), sửa được cho tới khi
bấm **Nộp bài**. Nộp chỉ **một lần**: hàm `submit_attempt()` chấm trên server, ghi điểm vào `attempts.score` và từng câu vào
`attempt_results`. Học sinh không đọc được bảng `section_items` (đáp án); câu hỏi đến qua hàm `lesson_items()`, hàm này chỉ kèm
đáp án/giải thích khi học sinh được xem kết quả. Cờ `class_lessons.show_results` (ô **Hiện điểm ngay khi nộp** ở trang lớp):
bật = thấy điểm và đáp án ngay khi nộp; tắt (mặc định) = chỉ thấy khi giáo viên lưu nhận xét hoặc bấm **Trả kết quả**.
Giáo viên có nút **Cho học sinh làm lại** (mở lại bài đã nộp, giữ câu trả lời cũ).

Người đăng nhập lần đầu là Học sinh (trừ email trong `admin_emails`); đổi thành Giáo viên ở `/admin/users`.
Thêm lớp/khoá mới: thêm 1 dòng `courses` (đặt `is_published = false` để ẩn khi chưa có bài), 1 dòng `phases`, rồi các bài.
Mẫu SQL cho bài theo lớp: `supabase/migrations/20261022000008_seed_grade_unit1.sql`.

| Bảng | Cột chính |
|---|---|
| `lessons` | `id` · `phase_id` · `position` (thứ tự trong lộ trình; cách 10 để chèn bài giữa) · `title` (tên ngắn) · `description` · `heading` (tiêu đề trang) · `subtitle` · `is_published` (false = chỉ giáo viên thấy) |
| `lesson_sections` | `lesson_id` · `position` · `type` · `score_key` · `title` · `time_label` · `hint` · `body` (HTML, cho `explain`) · `placeholder` (cho `writing`) · `short_input` (ô nhập ngắn, cho `typed`) |
| `section_items` | `section_id` · `position` · `prompt` · `back` · `options` · `correct_option` · `answers` · `words` · `explanation` · `tag` |

Điền cột nào trong `section_items` tuỳ `type` của section:

| type | Cần điền | Ví dụ |
|---|---|---|
| `cards` | `prompt` (mặt trước), `back` (mặt sau) | `who` / `người — chủ ngữ hoặc tân ngữ` |
| `mcq` | `prompt`, `options`, `correct_option` (**đếm từ 1**) | `{who,which,whose}`, `1` |
| `typed` | `prompt`, `answers` (đáp án chấp nhận; cái đầu là đáp án mẫu) | `{"to buy"}` |
| `order` | `words` (các cụm **theo đúng thứ tự**, web tự xáo), tuỳ chọn `answers` (cách xếp khác cũng đúng) | `{"The man","sitting","next to me"}` |
| `match` | mỗi item là một cặp: `prompt` (vế trái), `back` (vế phải đúng); học sinh chọn vế phải trong danh sách mọi vế phải của phần | `What time…?` / `At seven.` |
| `error` | `options` = các cụm của câu **theo thứ tự** (gạch chân A, B, C…), `correct_option` = cụm sai (đếm từ 1); cách sửa ghi ở `explanation` | `{"She","go","to school"}`, `2` |
| `explain`, `writing` | không có item | |

Phần `mcq` / `typed` có thể kèm **đoạn văn dùng chung** ở `lesson_sections.body` (đọc hiểu, điền đoạn văn: câu hỏi là `(1)`, `(2)`…). Trong lựa chọn trắc nghiệm và cụm tìm lỗi, `c[a]t` hiển thị thành c<u>a</u>t (câu phát âm). Trình soạn bài có sẵn các mẫu đề THCS: phát âm, trọng âm, True/False, đọc hiểu, điền đoạn văn, dạng đúng của từ, viết lại câu, nối, tìm lỗi sai.

`explanation` hiện sau khi trả lời; `tag` là nhãn ngắn ghi vào kết quả (vd `non-defining`). Ô HTML (`prompt`, `hint`, `body`, `explanation`) cho phép `<b>`, `<i>`, `<br>`, bảng…

Quy tắc database tự kiểm tra (nhập sai sẽ bị từ chối kèm thông báo):
- `mcq` / `typed` / `order` / `match` / `error` phải có `score_key` (1 chữ in hoa, không trùng trong cùng bài); các loại khác để trống.
- Câu trắc nghiệm cần ≥ 2 options và `correct_option` nằm trong khoảng; câu `typed` cần ≥ 1 đáp án; câu `order` cần ≥ 2 cụm; câu nối cần cả hai vế; câu tìm lỗi cần ≥ 2 cụm không trùng nhau.
- Không xoá được bài đã có người làm; đổi `id` bài thì bài làm tự đổi theo.

Lưu ý: kết quả của học viên lưu theo `score_key` + số thứ tự câu (vd `M3`). Sửa nội dung câu thoải mái,
nhưng chèn/xoá/đảo câu trong một bài **đã có người làm** sẽ lệch đáp án cũ — khi cần, tạo bài mới.

Thêm bài mới: thêm 1 dòng `lessons`, các dòng `lesson_sections`, rồi `section_items`
(mẫu SQL: `supabase/migrations/*_seed_lessons_phase_*.sql`).

Code liên quan: `app/composables/useCourse.ts` (đọc dữ liệu), `app/utils/course.ts` (chuyển dòng DB → bài học),
`app/components/lesson/` (các dạng bài), `app/pages/lessons/[id].vue`.

## Database (Supabase project `learning-english`, ref `aqguszxitrgbdczvqres`)

Schema nằm trong `supabase/migrations/` (bảng bài học + dữ liệu 16 bài); các bảng người dùng/tiến độ tạo trước đó qua Supabase MCP.

| Bảng | Nội dung |
|---|---|
| `courses`, `phases`, `lessons`, `lesson_sections`, `section_items` | Nội dung bài học (xem trên). View `lesson_overview` đếm số câu chấm điểm mỗi bài. |
| views `course_summary`, `class_overview`, `student_progress`, `class_lesson_stats`, `lesson_stats`, `course_error_stats` | Số liệu đã cộng sẵn trong database cho Dashboard, trang khối, trang lớp — trang web không tải cả bảng `attempts`/`profiles`. Danh sách dài (người dùng, chấm bài, học sinh của khối) tải từng trang. |
| `profiles` | Mỗi người đăng nhập; `role` = `student` / `teacher` / `admin`, `class_id` = lớp của học sinh. Email trong `admin_emails` thành admin khi đăng nhập lần đầu. |
| `attempts` | Một dòng cho mỗi học viên × bài: lựa chọn, bài viết, điểm, trạng thái (`in_progress` → `submitted` → `graded`). |
| `attempt_results` | Kết quả chấm từng câu của bài đã nộp (ghi bởi `submit_attempt()`). |
| `feedback` | Nhận xét của giáo viên; thêm nhận xét sẽ chuyển bài sang `graded`. |
| `error_log` | Lỗi lặp lại của từng học viên (6 nhóm lỗi, trạng thái `open` / `improving` / `fixed`). |

RLS: xem bảng vai trò ở mục "Vai trò, lớp và mở bài". Thêm giáo viên: người đó đăng nhập một lần, rồi admin đổi vai trò ở `/admin/users`.
Thêm admin: `insert into admin_emails values ('email@...')` trước khi người đó đăng nhập lần đầu.

## Deploy lên Vercel

1. Import repo trên Vercel, **Root Directory = `web`** (framework Nuxt tự nhận).
2. Environment Variables: `SUPABASE_URL`, `SUPABASE_KEY` (giá trị trong `.env.example`).
3. Deploy, rồi thêm `https://<tên-app>.vercel.app/**` vào Supabase → Authentication → URL Configuration → Redirect URLs.
