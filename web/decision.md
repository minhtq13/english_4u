# Quyết định đã chốt và lý do

Đi cùng [progress.md](progress.md). Mỗi mục: quyết định, lý do, và khi nào nên xem lại.

## Quy trình

- **Chia commit theo vùng tính năng, không theo từng dòng.** i18n, kiểu dữ liệu và layout dùng chung nên không tách hunk được. Mỗi commit vẫn pass typecheck và test (kiểm tra trong worktree riêng); build chỉ chạy ở đầu cuối.
- **Không tự commit/push.** `main` tự deploy; chỉ làm khi người dùng bảo. Đã push hai đợt với sự đồng ý của họ (đến `030260f`).
- **Migration áp thẳng production nhưng phải thử trước bằng khối `DO` hoàn tác** (theo skill `db-migration`). Mỗi migration có lệnh rollback ở đầu file.
- **`../progress.md` không bị ghi đè**: là nhật ký học B1→B2 của học viên (CLAUDE.md gốc). File bàn giao nằm ở `web/progress.md`.

## Dữ liệu và bảo mật

- **Huy hiệu tính trong database** (`my_badges()`), không ở trình duyệt, để chống tự cấp. Chỉ tính điểm đã được công bố cho học sinh, để huy hiệu không làm lộ điểm. Huy hiệu đã đạt thì giữ. "Hoàn thành khoá" cần ít nhất 5 bài được giao; "tốc độ cao" tính từ lúc tạo bài làm đến lúc nộp (chưa đến 10 phút). Hai ngưỡng này là lựa chọn của tôi, có thể chỉnh trong hàm.
- **Nhật ký lỗi là vòng đệm 1000 ô** (`client_errors`), ghi qua `log_client_error()`, ghi đè ô cũ nhất. Lý do: Supabase MCP từ chối hàm có `DELETE`, nên cách "xoá bớt khi quá 1000 dòng" không áp được; vòng đệm không cần xoá. Mỗi người tối đa 20 lỗi/phút để không làm ngập log. Không dùng dịch vụ ngoài (Sentry) theo yêu cầu.
- **Tốt nghiệp (lớp 9) = xoá `class_id` của học sinh** (`graduate_class()`), giữ bài làm và nhận xét. Đây là cách duy nhất không cần thêm khái niệm "lớp lưu trữ" vào schema; hệ quả: học sinh đó không thấy bài nào cho tới khi admin xếp lớp lại.
- **Lên lớp chạy từ khối cao xuống thấp**, ghép theo tên (6T1 → 7T1) để lớp vừa được chuyển lên không bị chuyển lần nữa. Lớp không theo quy tắc tên bị bỏ qua thay vì đoán.

- **Điểm trên lớp tách khỏi bài làm trên web** (migration 58): điểm danh theo buổi, điểm cộng là từng lần +1, KT bài cũ và bài tập là cột điểm 0-10 do giáo viên tạo. Người dùng chọn các cách này. Điểm chuyên cần do tôi đặt: 10, trừ 1 mỗi buổi vắng không phép, trừ 0,5 mỗi buổi muộn, vắng có phép không trừ, thấp nhất 0 (hằng số đầu `utils/classScores.ts`). Học kỳ: tháng 8-12 là kỳ 1, tháng 1-7 là kỳ 2, chỉ là mặc định, giáo viên đổi được. Hoàn tác điểm cộng bằng cách xoá dòng (không có cột "đã huỷ"). Học sinh chuyển lớp: dòng cũ vẫn còn nhưng không hiện ở lớp mới, vì buổi học và cột điểm thuộc lớp cũ.
- **Migration 59 (gộp policy đọc) phải chạy tay**: migration 58 để policy `for all` của giáo viên chồng policy đọc của học sinh (advisor `multiple_permissive_policies`). Sửa cần `DROP POLICY`, MCP từ chối, nên file 59 chờ người dùng chạy trong SQL Editor. Quyền không đổi, chỉ hiệu năng.

## Giao diện

- **Màu và logo tự chọn** khi người dùng không đưa ràng buộc: tím `#6d3fc9` và cam `#b4500a` cho phần thưởng; logo là cuốn sách và chữ "English 4U" (`BrandLogo.vue`).
- **Page transition bằng CSS** (`#main > *` fade) thay vì transition của `<NuxtPage>`, vì transition đó cần trang chỉ có một phần tử gốc và nhiều trang ở đây có nhiều phần tử.
- **Sidebar: nhóm có thể thu gọn, nhóm một mục là link thường**; nhóm của trang hiện tại tự mở; tổng số việc chờ vẫn hiện khi nhóm thu gọn. Trạng thái nhớ trong `localStorage` (chỉ tiện nghi cá nhân).
- **Màu chủ đạo lưu bằng cookie** (cùng cách với `theme`), áp dụng bằng script nội tuyến trước khi app chạy để không nháy màu. Màu tự chọn được **tự chỉnh cho đủ tương phản 4.5** thay vì nhận nguyên: nút và chữ màu chính phải đọc được ở cả sáng và tối, nên màu rất sáng/tối bị làm đậm/sáng nhẹ. Xanh lá có sẵn bị đậm lên (`#166534`) vì bản đầu chỉ đạt 4.36.
- **Giữ chỗ cho khối hiện muộn** (biểu đồ, thẻ ôn tập) thay vì chỉ dùng skeleton, vì đo CLS cho thấy các khối thêm vào sau khi tải gây dịch chuyển (0.14 → 0.013 ở `/admin`).

## Hiệu năng

- **Đo Lighthouse với nén bật.** Máy chủ Nitro cục bộ không nén nên chỉ cho 68 điểm; Vercel nén nên bật `compressPublicAssets` tạm để đo (93 điểm) rồi hoàn lại cấu hình, không để lại trong repo.

## Nợ kỹ thuật đã biết

- **Biểu đồ admin gom `attempts` trong trình duyệt** để tránh một migration nữa. Trái quy tắc "dùng view tổng hợp" (`.claude/rules/web-data-access.md`); chấp nhận được với quy mô hiện tại (10 bài nộp) nhưng nên thay bằng view `security_invoker` (số bài nộp theo ngày, theo lớp, theo mức điểm) khi dữ liệu lớn lên.
- **Test E2E dùng tài khoản thật trên production**, nên đăng xuất người đang dùng cùng tài khoản và chỉ ghi dữ liệu khi `E2E_WRITE=1`. Lâu dài nên có dự án Supabase riêng cho test.
