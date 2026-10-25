import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { afterEach, describe, expect, it } from "vitest"
import { ref } from "vue"
import { setTranslator } from "~/utils/i18n"
import { lessonDeleteError } from "~/utils/lessonDelete"
import { errorText } from "~/utils/serverErrors"

const lang = ref("vi")
setTranslator(key => `t:${key}`, lang)
afterEach(() => { lang.value = "vi" })

describe("errorText", () => {
  it("leaves messages alone in Vietnamese", () => {
    expect(errorText("Mã lớp không đúng")).toBe("Mã lớp không đúng")
    expect(errorText(null)).toBe("")
  })
  it("translates known messages in English, keeping their details", () => {
    lang.value = "en"
    expect(errorText("Mã lớp không đúng. Kiểm tra lại với giáo viên.")).toBe("Wrong class code. Check it with your teacher.")
    expect(errorText("correct_option phải từ 1 đến 4")).toBe("The correct option must be between 1 and 4")
    expect(errorText("Tên đăng nhập hs.an đã có người dùng")).toBe("Username hs.an is already taken")
    expect(errorText("Mật khẩu của hs.an cần ít nhất 6 ký tự")).toBe("The password of hs.an needs at least 6 characters")
  })
  it("names the invalid username, spaces included", () => {
    lang.value = "en"
    expect(errorText('Tên đăng nhập "nguyen van" không hợp lệ: 3–32 ký tự')).toMatch(/^Username "nguyen van" is invalid/)
    expect(errorText("Tên đăng nhập không hợp lệ: 3–32 ký tự")).toMatch(/^Invalid username/)
  })
  it("has an English pattern for every message the database and the edge function raise", () => {
    lang.value = "en"
    const fn = readFileSync(fileURLToPath(new URL("../supabase/functions/manage-accounts/index.ts", import.meta.url)), "utf8")
    const fromFn = [...fn.matchAll(/refuse\([`"]([^`"]+)[`"]\)/g)].map(m => m[1]!)
      .filter(m => !m.startsWith("${")).map(m => m.replace(/\$\{[^}]+\}/g, "hs.an"))
    const dir = fileURLToPath(new URL("../supabase/migrations/", import.meta.url))
    const fromDb = readdirSync(dir).filter(f => f.endsWith(".sql"))
      .flatMap(f => [...readFileSync(join(dir, f), "utf8").matchAll(/raise exception '((?:[^']|'')+)'/gi)].map(m => m[1]!))
      .map(m => m.replace(/''/g, "'").replace(/^%/, "Câu trắc nghiệm").replace(/%/g, "4"))
    // Translated means no Vietnamese is left anywhere in the text.
    const vietnamese = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i
    const untranslated = [...new Set([...fromFn, ...fromDb])].filter(m => vietnamese.test(errorText(m)))
    expect(untranslated).toEqual([])
  })
  it("passes unknown messages through", () => {
    lang.value = "en"
    expect(errorText("Failed to fetch")).toBe("Failed to fetch")
  })
})

describe("lessonDeleteError", () => {
  it("explains a lesson that students already worked on", () => {
    expect(lessonDeleteError('update or delete on table "lessons" violates foreign key constraint')).toBe("t:lessonDelete.hasAttempts")
    expect(lessonDeleteError("Học sinh lớp này đã làm bài nên không thu hồi được")).toBe("t:lessonDelete.hasAttempts")
  })
  it("passes other messages through errorText", () => {
    expect(lessonDeleteError("Bạn cần đăng nhập")).toBe("Bạn cần đăng nhập")
  })
})
