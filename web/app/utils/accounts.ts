// Username accounts: a username logs in through the auth email <username>@users.english4u.internal
// (same domain as the manage-accounts edge function). Anything with "@" is used as a real email.
export const LOGIN_DOMAIN = "users.english4u.internal"
export const USERNAME_RULE = /^[a-z0-9][a-z0-9._-]{2,31}$/

export const loginEmail = (login: string) => {
  const v = login.trim().toLowerCase()
  return v.includes("@") ? v : `${v}@${LOGIN_DOMAIN}`
}

/** What to show as someone's login: the username, or the real email of Google / email accounts. */
export const loginOf = (p: { username?: string | null; email: string | null }) => p.username || p.email || ""

const PASSWORD_CHARS = "abcdefghjkmnpqrstuvwxyz23456789"
/** An easy-to-type random password (no look-alike characters). */
export function randomPassword(length = 8) {
  return Array.from(crypto.getRandomValues(new Uint8Array(length)), b => PASSWORD_CHARS[b % PASSWORD_CHARS.length]).join("")
}

/** Lower-case, accent-free, for building usernames from class names. */
export const slug = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "d").toLowerCase().replace(/[^a-z0-9]+/g, "")
