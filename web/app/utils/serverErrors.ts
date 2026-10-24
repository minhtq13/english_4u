import { currentLang } from "./i18n"

// The database (raise exception …) and the manage-accounts edge function answer in Vietnamese. In English
// the UI shows these through errorText(), which recognises every known message (by pattern, so parts like
// usernames carry over) and falls back to the original text for anything else (e.g. network errors).
const EN: [RegExp, string][] = [
  [/^Bài chưa được giao cho lớp này/, "This lesson has not been given to this class"],
  [/^Bài cần có tên/, "The lesson needs a title"],
  [/^Bài cần ít nhất một phần/, "The lesson needs at least one section"],
  [/^Bài này chưa nộp, học sinh vẫn đang làm/, "This work is not submitted yet; the student is still working on it"],
  [/^Bài này đang khoá/, "This lesson is locked"],
  [/^Bài này đã đóng hoặc chưa mở cho bạn/, "This lesson is closed or not open to you"],
  [/^Bài đã có học sinh làm nên không sửa được câu hỏi/, "Students have already done this lesson, so its questions can no longer be changed. Create a new lesson instead."],
  [/^Bài đã nộp, không thể nộp lại/, "Already submitted; it cannot be submitted again"],
  [/^Bài đã nộp, không thể sửa hay nộp lại/, "Already submitted; it cannot be changed or submitted again"],
  [/^Bạn chưa làm bài này/, "You have not started this lesson"],
  [/^Bạn cần đăng nhập/, "Please sign in"],
  [/^Bạn không có quyền đổi vai trò hoặc email/, "You may not change roles or emails"],
  [/^Bạn đã ở trong một lớp/, "You are already in a class. Ask your teacher if you need to change class."],
  [/^Chỉ giáo viên của lớp mới chấm được bài/, "Only the class's teacher can grade this"],
  [/^Không tìm thấy bài làm, hoặc bạn không quản lý học sinh này/, "Work not found, or you do not manage this student"],
  [/^Chỉ giáo viên của lớp mới trả kết quả được/, "Only the class's teacher can release results"],
  [/^Chỉ giáo viên của lớp mới đóng \/ mở bài được/, "Only the class's teacher can close or reopen lessons"],
  [/^Chỉ học sinh mới cần nhập mã lớp/, "Only students need a class code"],
  [/^Chỉ phân công được tài khoản có vai trò giáo viên hoặc admin/, "Only teacher or admin accounts can be assigned"],
  [/^Câu sắp xếp cần ít nhất 2 cụm/, "An ordering question needs at least 2 chunks"],
  [/^Câu trắc nghiệm cần prompt/, "A multiple-choice question needs a question"],
  [/^Câu trắc nghiệm cần ít nhất 2 options/, "A multiple-choice question needs at least 2 options"],
  [/^Câu trắc nghiệm cần ít nhất 2 lựa chọn/, "A multiple-choice question needs at least 2 options"],
  [/^Câu tìm lỗi sai cần ít nhất 2 lựa chọn/, "An error-finding question needs at least 2 chunks"],
  [/^Các cụm trong câu tìm lỗi sai không được trùng nhau/, "The chunks of an error-finding sentence must all differ"],
  [/^Câu nối cần cả vế trái và vế phải/, "A matching pair needs both a left and a right side"],
  [/^Câu tự luận cần prompt/, "A fill-in question needs a question"],
  [/^Câu tự luận cần ít nhất 1 đáp án/, "A fill-in question needs at least one answer"],
  [/^Flashcard cần prompt/, "A flashcard needs a front and a back"],
  [/^Hãy chọn học kỳ/, "Choose a term / stage for the lesson"],
  [/^Hãy dùng nút Nộp bài/, "Use the Submit button"],
  [/^Học sinh không thể tự đổi lớp/, "Students cannot change class themselves. Ask the class's teacher."],
  [/^Học sinh lớp này đã làm bài nên không thu hồi được/, "Students of this class have worked on this lesson, so it cannot be taken back. Use \"Close\" to stop taking work."],
  [/^Mã lớp không đúng/, "Wrong class code. Check it with your teacher."],
  [/^Thiếu mã bài/, "Missing lesson id"],
  [/^Tên đăng nhập và trạng thái tài khoản chỉ đổi được/, "Usernames and account status can only be changed on the student management page"],
  [/^correct_option phải từ 1 đến (\d+)/, "The correct option must be between 1 and $1"],
  [/^Lỗi máy chủ, hãy thử lại/, "Server error, please try again"],
  [/^Thao tác không hợp lệ/, "Invalid action"],
  [/^Bạn chỉ quản lý được học sinh của lớp mình dạy/, "You can only manage students of the classes you teach"],
  [/^Chỉ admin tạo được tài khoản giáo viên/, "Only admins can create teacher accounts"],
  [/^Chỉ admin và giáo viên mới quản lý tài khoản/, "Only admins and teachers manage accounts"],
  [/^Chỉ admin xoá được tài khoản/, "Only admins can delete accounts. You can lock the account instead."],
  [/^Giáo viên \/ admin không thuộc lớp học sinh/, "Teachers / admins do not belong to a student class"],
  [/^Hãy chọn một lớp bạn dạy/, "Choose a class you teach"],
  [/^Hãy nhờ admin khác đổi tài khoản của chính bạn/, "Ask another admin to change your own account"],
  [/^Không tìm thấy tài khoản/, "Account not found"],
  [/^Mật khẩu cần ít nhất 6 ký tự/, "The password needs at least 6 characters"],
  [/^Mật khẩu của (\S+) cần ít nhất 6 ký tự/, "The password of $1 needs at least 6 characters"],
  [/^Mỗi lần tạo từ 1 đến 100 tài khoản/, "Create 1 to 100 accounts at a time"],
  [/^Tên đăng nhập "?([^" ]*)"? không hợp lệ.*/, "Username \"$1\" is invalid: 3–32 characters, lower-case letters without accents, digits, . _ -"],
  [/^Tên đăng nhập không hợp lệ.*/, "Invalid username: 3–32 characters, lower-case letters without accents, digits, . _ -"],
  [/^Tên đăng nhập (\S+) đã có người dùng/, "Username $1 is already taken"],
]

/** A server error message in the current language. */
export function errorText(message: string | null | undefined): string {
  const msg = message ?? ""
  if (currentLang() !== "en") return msg
  for (const [re, en] of EN) if (re.test(msg)) return msg.replace(re, en)
  return msg
}
