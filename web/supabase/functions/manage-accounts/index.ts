// manage-accounts: admins and teachers issue and manage username/password accounts.
// Runs with the service role (Auth admin API), so every action checks the caller first:
//  * admins manage everyone except themselves (delete, role changes of their own account are refused);
//  * teachers manage students of the classes they are assigned to, and create students only there.
// Usernames map to auth emails <username>@users.english4u.internal (reserved domain, no mail is sent).
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.117.2"

const DOMAIN = "users.english4u.internal"
const USERNAME = /^[a-z0-9][a-z0-9._-]{2,31}$/
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

type Role = "student" | "teacher" | "admin"
interface Profile { id: string; role: Role; class_id: string | null; username: string | null; full_name: string | null; active: boolean }
interface NewAccount { username: string; password: string; full_name: string }

class Refused extends Error {}
const refuse = (msg: string): never => { throw new Refused(msg) }
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } })

function checkAccount(a: NewAccount) {
  const username = String(a.username ?? "").trim().toLowerCase()
  if (!USERNAME.test(username)) refuse(`Tên đăng nhập "${a.username}" không hợp lệ: 3–32 ký tự, chỉ chữ thường không dấu, số, dấu . _ -`)
  if (String(a.password ?? "").length < 6) refuse(`Mật khẩu của ${username} cần ít nhất 6 ký tự`)
  return { username, password: String(a.password), full_name: String(a.full_name ?? "").trim() }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS })
  try {
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "")
    const { data: who } = await db.auth.getUser(jwt)
    if (!who.user) return json({ error: "Bạn cần đăng nhập" }, 401)

    const me = await profile(db, who.user.id)
    if (!me || (me.role !== "admin" && me.role !== "teacher")) refuse("Chỉ admin và giáo viên mới quản lý tài khoản")
    // A locked account keeps a valid JWT until it expires, so check the flag as well.
    if (!me!.active) refuse("Tài khoản của bạn đã bị khoá")
    const isAdmin = me!.role === "admin"
    const { data: taught } = await db.from("class_teachers").select("class_id").eq("teacher_id", me!.id)
    const myClasses = new Set((taught ?? []).map(r => r.class_id as string))

    /** The target account, if the caller may manage it. */
    const target = async (id: string) => {
      const p = await profile(db, id)
      if (!p) refuse("Không tìm thấy tài khoản")
      if (p!.id === me!.id) refuse("Hãy nhờ admin khác đổi tài khoản của chính bạn")
      if (isAdmin) return p!
      if (p!.role !== "student" || !p!.class_id || !myClasses.has(p!.class_id)) refuse("Bạn chỉ quản lý được học sinh của lớp mình dạy")
      return p!
    }

    const body = await req.json().catch(() => refuse("Yêu cầu không hợp lệ"))
    switch (body.action) {
      // { accounts: [{username, password, full_name}], role?, class_id? } → created accounts (or per-row errors)
      case "create": {
        const role: Role = body.role ?? "student"
        if (!["student", "teacher", "admin"].includes(role)) refuse("Vai trò không hợp lệ")
        const classId: string | null = body.class_id || null
        if (role !== "student" && !isAdmin) refuse("Chỉ admin tạo được tài khoản giáo viên")
        if (role === "student" && !isAdmin && (!classId || !myClasses.has(classId))) refuse("Hãy chọn một lớp bạn dạy")
        if (role !== "student" && classId) refuse("Giáo viên / admin không thuộc lớp học sinh")
        const rows: NewAccount[] = Array.isArray(body.accounts) ? body.accounts : []
        if (!rows.length || rows.length > 100) refuse("Mỗi lần tạo từ 1 đến 100 tài khoản")
        const results = []
        for (const row of rows) {
          try {
            const a = checkAccount(row)
            const { data: taken } = await db.from("profiles").select("id").eq("username", a.username).maybeSingle()
            if (taken) refuse(`Tên đăng nhập ${a.username} đã có người dùng`)
            const { data, error } = await db.auth.admin.createUser({
              email: `${a.username}@${DOMAIN}`, password: a.password, email_confirm: true,
              user_metadata: { full_name: a.full_name || a.username },
            })
            if (error) refuse(`${a.username}: ${error.message}`)
            const { error: e2 } = await db.from("profiles")
              .update({ username: a.username, full_name: a.full_name || a.username, role, class_id: role === "student" ? classId : null })
              .eq("id", data.user!.id)
            if (e2) {
              await db.auth.admin.deleteUser(data.user!.id)
              refuse(`${a.username}: ${e2.message}`)
            }
            results.push({ ok: true, id: data.user!.id, username: a.username, full_name: a.full_name, password: a.password })
          } catch (e) {
            if (!(e instanceof Refused)) throw e
            results.push({ ok: false, username: row.username, full_name: row.full_name, error: e.message })
          }
        }
        return json({ results })
      }

      // { user_id, password }
      case "set_password": {
        const p = await target(body.user_id)
        if (String(body.password ?? "").length < 6) refuse("Mật khẩu cần ít nhất 6 ký tự")
        const { error } = await db.auth.admin.updateUserById(p.id, { password: String(body.password) })
        if (error) refuse(error.message)
        return json({ ok: true })
      }

      // { user_id, full_name?, username? } — a new username also gives the account a username login.
      case "update": {
        const p = await target(body.user_id)
        const patch: Record<string, unknown> = {}
        if (typeof body.full_name === "string") patch.full_name = body.full_name.trim() || null
        if (typeof body.username === "string" && body.username.trim().toLowerCase() !== p.username) {
          const username = body.username.trim().toLowerCase()
          if (!USERNAME.test(username)) refuse("Tên đăng nhập không hợp lệ: 3–32 ký tự, chỉ chữ thường không dấu, số, dấu . _ -")
          const { data: taken } = await db.from("profiles").select("id").eq("username", username).maybeSingle()
          if (taken) refuse(`Tên đăng nhập ${username} đã có người dùng`)
          const { error } = await db.auth.admin.updateUserById(p.id, { email: `${username}@${DOMAIN}`, email_confirm: true })
          if (error) refuse(error.message)
          patch.username = username
          patch.email = `${username}@${DOMAIN}`
        }
        if (Object.keys(patch).length) {
          const { error } = await db.from("profiles").update(patch).eq("id", p.id)
          if (error) refuse(error.message)
        }
        return json({ ok: true })
      }

      // { user_id, active } — locking bans the auth user so they cannot sign in.
      case "set_active": {
        const p = await target(body.user_id)
        const active = !!body.active
        const { error } = await db.auth.admin.updateUserById(p.id, { ban_duration: active ? "none" : "876000h" })
        if (error) refuse(error.message)
        const { error: e2 } = await db.from("profiles").update({ active }).eq("id", p.id)
        if (e2) refuse(e2.message)
        return json({ ok: true })
      }

      // { user_id } — admins only; their attempts and history go with them.
      case "delete": {
        if (!isAdmin) refuse("Chỉ admin xoá được tài khoản. Bạn có thể khoá tài khoản thay vì xoá.")
        const p = await target(body.user_id)
        const { error } = await db.auth.admin.deleteUser(p.id)
        if (error) refuse(error.message)
        return json({ ok: true })
      }

      default:
        refuse("Thao tác không hợp lệ")
    }
  } catch (e) {
    if (e instanceof Refused) return json({ error: e.message }, 400)
    console.error(e)
    return json({ error: "Lỗi máy chủ, hãy thử lại" }, 500)
  }
  return json({ error: "Thao tác không hợp lệ" }, 400)
})

async function profile(db: SupabaseClient, id: string): Promise<Profile | null> {
  const { data } = await db.from("profiles").select("id, role, class_id, username, full_name, active").eq("id", id).maybeSingle()
  return data as Profile | null
}
