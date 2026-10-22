# english_4u

Lộ trình ngữ pháp tiếng Anh B1 → B2, 30 phút mỗi ngày: 16 bài (mệnh đề quan hệ → bài viết tổng hợp), bài tập chấm tự động, giáo viên nhận xét bài viết và theo dõi lỗi lặp lại của từng học viên.

| Thư mục | Nội dung |
|---|---|
| [`web/`](web/) | Website Nuxt 4 + Supabase (đăng nhập Google, nhiều học viên, trang chấm bài cho giáo viên). Xem [web/README.md](web/README.md). |
| [`lessons/`](lessons/) | Bản gốc của từng bài học (dữ liệu `window.LESSON`), mở trực tiếp bằng trình duyệt được. |
| `index.html` | Danh sách bài học offline và thứ tự các giai đoạn. |
| [`artifact/`](artifact/) | Bản một-trang dùng trên claude.ai Artifact (`node artifact/build.js`). |
| `progress.md` | Nhật ký học tập ban đầu. |

Sửa hoặc thêm bài: chỉnh file trong `lessons/` (và `index.html` nếu là bài mới), rồi chạy `npm run lessons` trong `web/`.
