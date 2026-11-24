# Quyết định đã chốt và lý do

Đi cùng [progress.md](progress.md). Mỗi mục: quyết định, lý do, và khi nào nên xem lại.

## Quy trình

- **Chia commit theo vùng tính năng, không theo từng dòng.** i18n, kiểu dữ liệu và layout dùng chung nên không tách hunk được. Mỗi commit vẫn pass typecheck và test (kiểm tra trong worktree riêng); build chỉ chạy ở đầu cuối.
- **Không tự commit/push.** `main` tự deploy; chỉ làm khi người dùng bảo. Đã push ba đợt với sự đồng ý của họ (đến `53ad99d`).
- **Migration áp thẳng production nhưng phải thử trước bằng khối `DO` hoàn tác** (theo skill `db-migration`). Mỗi migration có lệnh rollback ở đầu file.
- **`../progress.md` không bị ghi đè**: là nhật ký học B1→B2 của học viên (CLAUDE.md gốc). File bàn giao nằm ở `web/progress.md`.

## Dữ liệu và bảo mật

- **Huy hiệu tính trong database** (`my_badges()`), không ở trình duyệt, để chống tự cấp. Chỉ tính điểm đã được công bố cho học sinh, để huy hiệu không làm lộ điểm. Huy hiệu đã đạt thì giữ. "Hoàn thành khoá" cần ít nhất 5 bài được giao; "tốc độ cao" tính từ lúc tạo bài làm đến lúc nộp (chưa đến 10 phút). Hai ngưỡng này là lựa chọn của tôi, có thể chỉnh trong hàm.
- **Nhật ký lỗi là vòng đệm 1000 ô** (`client_errors`), ghi qua `log_client_error()`, ghi đè ô cũ nhất. Lý do: Supabase MCP từ chối hàm có `DELETE`, nên cách "xoá bớt khi quá 1000 dòng" không áp được; vòng đệm không cần xoá. Mỗi người tối đa 20 lỗi/phút để không làm ngập log. Không dùng dịch vụ ngoài (Sentry) theo yêu cầu.
- **Tốt nghiệp (lớp 9) = xoá `class_id` của học sinh** (`graduate_class()`), giữ bài làm và nhận xét. Đây là cách duy nhất không cần thêm khái niệm "lớp lưu trữ" vào schema; hệ quả: học sinh đó không thấy bài nào cho tới khi admin xếp lớp lại.
- **Lên lớp chạy từ khối cao xuống thấp**, ghép theo tên (6T1 → 7T1) để lớp vừa được chuyển lên không bị chuyển lần nữa. Lớp không theo quy tắc tên bị bỏ qua thay vì đoán.

- **Điểm trên lớp tách khỏi bài làm trên web** (migration 58): điểm danh theo buổi, điểm cộng là từng lần +1, KT bài cũ và bài tập là cột điểm 0-10 do giáo viên tạo. Người dùng chọn các cách này. Điểm chuyên cần do tôi đặt: 10, trừ 1 mỗi buổi vắng không phép, trừ 0,5 mỗi buổi muộn, vắng có phép không trừ, thấp nhất 0 (hằng số đầu `utils/classScores.ts`). Học kỳ: tháng 8-12 là kỳ 1, tháng 1-7 là kỳ 2, chỉ là mặc định, giáo viên đổi được. Hoàn tác điểm cộng bằng cách xoá dòng (không có cột "đã huỷ"). Học sinh chuyển lớp: dòng cũ vẫn còn nhưng không hiện ở lớp mới, vì buổi học và cột điểm thuộc lớp cũ.
- **Migration 59 (gộp policy đọc) chạy tay, đã áp**: migration 58 để policy `for all` của giáo viên chồng policy đọc của học sinh (advisor `multiple_permissive_policies`). Sửa cần `DROP POLICY`, MCP từ chối, nên người dùng chạy file trong SQL Editor; sau đó đã kiểm tra `pg_policies` và chạy lại phép thử quyền. Quyền không đổi, chỉ hiệu năng. Lần sau nên viết thẳng policy tách đọc/ghi từ migration đầu để khỏi cần bước tay.

- **Phần nào được trộn lưu theo phần KHÔNG trộn** (`exam_sets.fixed_parts`, migration 60, mặc định rỗng): bộ đề đã lưu trước đó vẫn trộn mọi phần như cũ, không cần chuyển dữ liệu. Một phần giữ nguyên in giống hệt đề gốc ở mọi mã (cả thứ tự câu và thứ tự đáp án), bất kể cách trộn; cách trộn chỉ áp dụng cho các phần còn lại. Người dùng chọn cách làm này (chọn phần trước, rồi chọn cách trộn như cũ).
- **Trộn lại là một bộ đếm theo từng mã, không phải hạt giống ngẫu nhiên** (`exam_sets.shuffle_rounds`, migration 61, `{mã: số lần}`): hạt giống = mã (lần 0, đúng như trước) hoặc `mã#n`. Lý do: đề phải cố định để in lại, tải lại, mở lại bộ đề và bảng đáp án luôn khớp; một số ngẫu nhiên mỗi lần bấm sẽ làm mất bản đã chọn. Có \"Quay lại lần trước\" (lùi một lần, lần trước tái hiện y hệt vì có tính xác định). Chỉ lưu bộ đếm của các mã đang dùng, tối đa 24, tối đa 999 lần. Chỉ có tác dụng với các phần còn đang được trộn.
- **Dòng kẻ trên bản in theo loại câu**: câu sắp xếp luôn có một dòng kẻ; câu tự luận điền vào chỗ trống (`___`) có ô điền dài hơn và không thêm dòng kẻ (ô điền đã là chỗ viết); câu tự luận không có chỗ trống vẫn có dòng kẻ. Trước đây Word thêm dòng kẻ cho mọi câu tự luận; nay chỉ cho câu không có chỗ trống. Dòng kẻ trong Word là viền dưới của một đoạn trống (đúng một dòng bất kể phông chữ), thay cho 60 dấu \"…\" vốn dài hơn một dòng.
- **Phiếu trả lời là công tắc bật/tắt, không thêm cột**: tắt = `sheet_at = 'none'`, bật = `top` hoặc `bottom` như trước, nên lưu cùng bộ đề và bản in PDF dùng đúng giá trị đó. Lý do: tuỳ chọn \"Không in\" đã có sẵn nhưng nằm lẫn trong ô chọn ở bước 4 nên người dùng không thấy; công tắc đặt cạnh phần xem trước ở bước 5. Người chỉ được xem bộ đề vẫn đổi được cho bản tải của chính họ (không lưu, không hiện cảnh báo rời trang).
- **Gấp khối bằng `div role=button`, không dùng `<button>`**: trang tạo đề bọc các khối trong `<fieldset disabled>` cho người chỉ được xem, và nút thật trong đó bị vô hiệu. Trạng thái gấp nhớ trong `localStorage` (tiện nghi cá nhân), dùng chung cho mọi bộ đề.
- **Lối vào điểm trên lớp đặt ở đầu trang lớp** (nút nổi bật cạnh tên lớp), gỡ khỏi hàng nút nhỏ trong khung Bài học. Sidebar chưa thêm vì điểm thuộc về từng lớp, cần trang chọn lớp.
- **Test ghi dữ liệu dùng lớp tạm riêng cho từng spec** (`ZZE2E` cho `write-student`, `ZZE2S` cho `class-scores`) và chung hàm dọn `removeTestClass()` trong `e2e/helpers.ts`, vốn chỉ xoá đúng tài khoản và lớp mang tên tạm đó.

## Giao diện

- **Màn hình mới dùng lại thành phần chung của project, không tự viết style.** Bản đầu của điểm trên lớp tự đặt tên class (`.choices`, `.savebar` riêng, `.tile`) nên mất kiểu `.opts button` có sẵn và lệch khỏi phần còn lại. Bản làm lại dùng `.opts`, `.scorebar savebar`, `.list-row`, `.badge`, `.stats/.stat`, `EmptyState`, `StatBar`, bảng kiểu sổ điểm; mọi ô nhập khai báo `type` thật (style ô nhập chung không phủ input không có `type`) và `input[type=date]` được thêm vào rule chung ở `main.css`. Lý do: người dùng chê bản đầu "xấu, không đồng nhất". Khi làm màn mới, đọc `main.css` và một trang tương tự trước.
- **Điểm 0-10 hiện bằng viên thuốc có màu** (`ClassScoresMark`, `scoreBand()`: từ 8 xanh, từ 5 vàng, dưới 5 đỏ), như các ô của bảng điểm bài làm; luôn in số nên màu không phải tín hiệu duy nhất.
- **Dấu gạch dài (— và –) đổi hết sang "-"** theo yêu cầu người dùng, trừ nơi chúng làm việc thật hoặc là lịch sử (xem `progress.md`, mục 3, số 0f). Lưu ý: ở trang phân tích câu hỏi, câu bỏ trống giờ cũng hiện "-", trùng với đáp án "-" do học sinh gõ.

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
