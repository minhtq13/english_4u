# Tiến độ: kế hoạch cải thiện english_4u (bàn giao cho phiên sau)

Đây là file bàn giao của `web/`. `../progress.md` (thư mục gốc) là nhật ký học B1→B2 của học viên, không đụng vào.
Lý do các quyết định: xem [decision.md](decision.md). Luật dự án: [CLAUDE.md](CLAUDE.md).

## 1. Mục tiêu và tiêu chí hoàn thành

Mục tiêu: thực hiện "kế hoạch cải thiện toàn bộ dự án" (5 phần: UI/UX, trải nghiệm học sinh, công cụ giáo viên, admin, kỹ thuật và chất lượng), kèm các yêu cầu thêm trong phiên (sidebar submenu, màu chủ đạo, chỉnh màn đăng nhập).

Một thay đổi xong khi: `npm run typecheck`, `npm test`, `npm run build` đều pass (chạy dưới Node 24: `source ~/.nvm/nvm.sh && nvm use`), mọi chuỗi UI mới có cả vi và en, dark mode đúng. Không commit/push khi người dùng chưa bảo; `main` tự deploy lên Vercel.

Trạng thái: phần cốt lõi đã xong và đã push (HEAD `030260f` trên `main`). Còn một số việc kiểm tra và việc nhỏ ở mục 3.

## 2. Đã xong (file chính và kiểm tra đã thật sự chạy)

Kiểm tra chạy ở đầu cuối: typecheck, `npm test` 314 test, `npm run build` pass; `npx playwright test` 22 pass, 9 bỏ qua (test ghi dữ liệu và PWA).

| Hạng mục | File chính | Kiểm tra đã chạy |
|---|---|---|
| Design tokens (spacing, radius, shadow, transition, tím/cam), `.btn` sm/md/lg/icon/loading, hiệu ứng chọn đáp án, card nhấc khi hover, page fade, confetti | `app/assets/css/main.css`, `ConfettiBurst.vue`, `pages/lessons/[id].vue` | build; xem tay trên trình duyệt (admin): token nạp, dark mode `/courses`. Chưa thấy confetti và hiệu ứng chọn đáp án thật |
| Logo, đăng nhập hai cột, slogan | `BrandLogo.vue`, `pages/login.vue` | xem tay desktop (sáng, tối). Chưa xem mobile |
| Tải nhanh: màn chờ có chữ, font không chặn render, Tiptap lazy | `app/spa-loading-template.html`, `nuxt.config.ts`, `RichEditor.vue` | Lighthouse mobile trang đăng nhập: 93 Performance, 100 Accessibility (khi bật nén như Vercel); JS+CSS tải đầu khoảng 195 KB gzip |
| Layout shift | `pages/admin/index.vue`, `pages/index.vue` | đo CLS trong trình duyệt; test E2E "layout shift" cho 3 vai trò, ngưỡng 0.1 |
| Học sinh: tiến độ khoá, thẻ ôn tập, icon trạng thái phần bài, thanh tiến độ trong thanh điểm, lời khuyên ở màn kết quả | `pages/index.vue`, `LessonSectionNav.vue`, `LessonResult.vue` | xem tay trang chủ học sinh (6T1); chưa mở bài làm thật |
| Huy hiệu (migration 55) | `supabase/migrations/..055_badges.sql`, `useBadges.ts`, `BadgesCard.vue`, `BadgePopup.vue` | kiểm tra quyền bằng khối `DO` hoàn tác trên production (học sinh không ghi trực tiếp, ẩn danh bị từ chối, cấp được `review_50` và `streak_7`); chưa thấy trên giao diện với dữ liệu thật |
| Dán đề từ văn bản | `utils/importQuestions.ts`, `lesson-editor/ImportDialog.vue` | 7 unit test; thử tay trong trình soạn (3 câu, 1 thiếu đáp án thì chặn thêm); E2E |
| Phân tích câu hỏi: gợi ý giảng lại, thanh phân bố | `utils/questionAnalysis.ts`, `pages/teacher/analysis/[classId].vue` | unit test; chưa mở trang trên trình duyệt |
| Admin: biểu đồ dashboard, lọc nhật ký đăng nhập theo lớp và thời gian | `utils/adminCharts.ts`, `pages/admin/index.vue`, `pages/admin/logins.vue` | unit test; xem tay (khớp dữ liệu thật 10 bài nộp); E2E. Bộ lọc lớp/thời gian mới nhìn, chưa bấm thử |
| Nhật ký lỗi trình duyệt (migration 56) | `plugins/error-log.client.ts`, `utils/errorReport.ts`, `pages/admin/errors.vue` | `DO` hoàn tác trên production; bắn một lỗi thật và thấy ở trang admin |
| Lên lớp: xem trước và tốt nghiệp (migration 57) | `PromoteDialog.vue`, `utils/promotion.ts`, `..057_graduate_class.sql` | 3 unit test; `DO` hoàn tác (admin chuyển 4 em, bài làm còn); mở popup xem trước, không bấm chạy |
| Tách trang lớn | `components/exam/Step*.vue`, `lesson-editor/{Steps,SetupGrade,Info}.vue`, `AttemptFeedback.vue`, `ClassLessonBody.vue` | xem tay từng trang; phím tắt chấm bài (toggle nhãn lỗi) còn hoạt động; E2E |
| Sidebar thành submenu | `layouts/default.vue` | xem tay (admin): mở nhóm, chuyển trang, trạng thái được nhớ. Chưa xem giáo viên và ngăn kéo mobile |
| Màu chủ đạo: 8 màu và màu tự chọn | `utils/accents.ts`, `useAccent.ts`, `AccentPicker.vue`, `nuxt.config.ts`, `main.css` | 20 unit test về độ tương phản; xem tay: gõ mã hex, sáng/tối, còn sau khi tải lại. Chưa dùng bảng chọn màu gốc bằng chuột |
| E2E mới | `e2e/improvements.spec.ts` | chạy được; test tạo lớp ZZE2F rồi xoá đã chạy một lần, database sạch sau đó |
| Điểm trên lớp: điểm danh, điểm cộng, KT bài cũ, bài tập (migration 58) | `..058_class_scores.sql`, `utils/classScores.ts`, `utils/classScoreStore.ts`, `pages/teacher/scores/[classId].vue`, `components/class-scores/*`, `MyClassScores.vue` | 15 unit test; `DO` hoàn tác trên production (GV lớp ghi được, GV khác và HS bị chặn, HS lớp khác bị trigger chặn, HS chỉ thấy dòng mình); Playwright trên bản build: GV `gv.02` (gán tạm 6T2) điểm danh, +1 rồi hoàn tác, tạo cột KT, nhập sai thì bị chặn, lưu 8,5, xuất Excel, tiếng Anh; HS `hs.04` thấy điểm mình (desktop, điện thoại). Dữ liệu thử và việc gán lớp đã dọn. Chưa thử tab Bài tập riêng (cùng component với KT bài cũ), sửa tên/xoá cột, xoá buổi, dark mode |
| Tài liệu | `README.md`, `web/README.md`, `GLOSSARY.md`, `CLAUDE.md` | đã cập nhật theo từng phần |

Migration đã áp lên production (ref `aqguszxitrgbdczvqres`): 55 `badges`, 56 `client_errors`, 57 `graduate_class`. Lệnh rollback ở đầu mỗi file. `get_advisors` (security) chỉ cảnh báo `my_badges()` gọi được bởi người đã đăng nhập (chủ ý); performance chỉ có index chưa dùng mức INFO.

Có sẵn từ trước, không làm lại: sidebar có icon và badge, bottom tab mobile, phím tắt chấm bài, "Nhân bản", giao nhiều lớp (`copyToOthers`), bảng điểm (sticky, tô màu), `promote_class()`, lazy exceljs/docx.

## 3. Chưa xong và bước tiếp theo

Đã kiểm tra thêm ở phiên sau (có chạy thật):
- `npx nuxi analyze --no-serve`: các thư viện nặng đều nằm ngoài lần tải đầu (exceljs khoảng 278 KB gz, docx 113 KB, jszip 31 KB, Tiptap/prosemirror khoảng 95 KB, đều lazy). Tải đầu vẫn khoảng 195 KB gz.
- Ảnh chụp Playwright: đăng nhập mobile (sáng, tối), trang chủ và Tài khoản học sinh trên điện thoại (7 huy hiệu với tiến độ thật), ngăn kéo menu admin trên điện thoại, tiếng Anh cho dashboard, nhật ký đăng nhập, popup lên lớp. Tất cả hiển thị đúng.
- Trang phân tích câu hỏi: có bảng, thanh phân bố và khung "Nên giảng lại" (đã rút còn 5 dòng và "…và N câu khác").
- Bộ lọc nhật ký đăng nhập: chọn lớp 6T1 thì chỉ còn học sinh 6T1; lọc "Hôm nay" và hai số thống kê đúng.
- Học sinh nộp bài thật (tài khoản tạm `zze2e.*` lớp ZZE2E, tự xoá sau khi chạy, database sạch): confetti hiện sau khi nộp, màn kết quả có vòng điểm và lời khuyên, trang Tài khoản có đủ 7 huy hiệu. `e2e/write-student.spec.ts` giờ kiểm tra thêm hai điều đó (đặt `E2E_SHOT_DIR` để lưu ảnh).

Còn lại:
0. **Chạy tay `supabase/migrations/20261022000059_class_scores_policies.sql` trong Supabase SQL Editor** (MCP từ chối vì có `DROP POLICY`), rồi kiểm tra `pg_policy` và `get_advisors` (performance) hết cảnh báo `multiple_permissive_policies` ở 5 bảng điểm trên lớp.
1. Chưa đạt huy hiệu nào bằng dữ liệu thật (tài khoản tạm chỉ có tiến độ, chưa đủ ngưỡng); popup "huy hiệu mới" chưa từng hiện. Cách thử: tạo tình huống đủ 50 thẻ ôn (hoặc streak 7 ngày) cho tài khoản thử rồi vào trang chủ.
2. Từng màu chủ đạo còn lại chưa xem bằng mắt (mới có test tương phản); bảng chọn màu gốc của trình duyệt chưa dùng bằng chuột.
3. Lighthouse chỉ đo trang đăng nhập, chưa đo trang sau đăng nhập.
4. Biểu đồ dashboard còn gom `attempts` trong trình duyệt (xem decision.md, "Nợ kỹ thuật").
5. Dòng "TEST lỗi thử nghiệm" trong `client_errors`: tự bị ghi đè khi vòng đệm đầy.
6. Popup lên lớp: lớp không đặt tên theo `<khối><đuôi>` bị bỏ qua.
7. Ý tưởng chưa làm: chọn màu chủ đạo nhanh ở sidebar hoặc trang đăng nhập; tách thêm khối lọc/danh sách bài trên `classes/[id].vue`.
8. Chữ tiếng Việt "Chưa đúng.Đáp án: …" thiếu dấu cách và "Kết quả: đúng 0/17 câu" xuất hiện hai lần trên màn kết quả: có từ trước, chưa sửa.

Khi chạy lại:
- Dev server: `cd web && source ~/.nvm/nvm.sh && nvm use && npm run dev` (người dùng tự chạy cổng 3000; không để server nền).
- Tài khoản thử: khoá `DEV_*`, `TEST_*`, `E2E_*` trong `web/.env.test` (gitignored). Mỗi tài khoản chỉ một phiên: chạy Playwright sẽ đăng xuất tab trình duyệt đang dùng cùng tài khoản.
- Các tài khoản đó nằm trên production: chỉ xem; test ghi dữ liệu chỉ chạy khi `E2E_WRITE=1` và tự dọn.
