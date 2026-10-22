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

## Bài học

Bài học gốc nằm ở `../lessons/*.html` (thứ tự trong `../index.html`). Sau khi thêm/sửa bài:

```bash
npm run lessons    # tạo lại app/data/course.json
```

Bài học nằm trong code; database chỉ lưu tiến độ, nhận xét và nhật ký lỗi.

## Database (Supabase project `learning-english`, ref `aqguszxitrgbdczvqres`)

| Bảng | Nội dung |
|---|---|
| `profiles` | Mỗi người đăng nhập; `role` = `student` / `admin`. Email trong `admin_emails` thành admin khi đăng nhập lần đầu. |
| `attempts` | Một dòng cho mỗi học viên × bài: đáp án, bài viết, điểm, trạng thái (`in_progress` → `submitted` → `graded`). |
| `feedback` | Nhận xét của giáo viên; thêm nhận xét sẽ chuyển bài sang `graded`. |
| `error_log` | Lỗi lặp lại của từng học viên (6 nhóm lỗi, trạng thái `open` / `improving` / `fixed`). |

RLS: học viên chỉ đọc/ghi dữ liệu của mình; admin đọc tất cả và ghi nhận xét, nhật ký lỗi.
Thêm giáo viên: `insert into admin_emails values ('email@...')` trước khi người đó đăng nhập lần đầu,
hoặc `update profiles set role = 'admin' where email = '...'` nếu đã đăng nhập.

## Deploy lên Vercel

1. Import repo trên Vercel, **Root Directory = `web`** (framework Nuxt tự nhận).
2. Environment Variables: `SUPABASE_URL`, `SUPABASE_KEY` (giá trị trong `.env.example`).
3. Deploy, rồi thêm `https://<tên-app>.vercel.app/**` vào Supabase → Authentication → URL Configuration → Redirect URLs.
