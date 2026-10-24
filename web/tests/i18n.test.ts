import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import en from "../i18n/locales/en.json"
import vi from "../i18n/locales/vi.json"

// Every UI string lives in both locales. These checks fail when a key is used in the app but missing in
// either file, or when the two files drift apart.

type Tree = { [k: string]: string | Tree }
const flatten = (t: Tree, prefix = ""): string[] =>
  Object.entries(t).flatMap(([k, v]) => (typeof v === "string" ? [prefix + k] : flatten(v, `${prefix}${k}.`)))
const keys = { vi: new Set(flatten(vi as Tree)), en: new Set(flatten(en as Tree)) }

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? files(path) : /\.(vue|ts)$/.test(name) ? [path] : []
  })
}
const appDir = join(__dirname, "../app")

/** Literal keys passed to $t(), t(), tr() or rt-less labels("prefix", [...]) in the app's code. */
function usedKeys() {
  const used = new Map<string, string>()
  for (const file of files(appDir)) {
    const src = readFileSync(file, "utf8")
    for (const m of src.matchAll(/(?<![\w.])(?:\$t|t|tr)\(\s*["']([a-zA-Z][\w-]*(?:\.[\w-]+)+)["']/g)) used.set(m[1]!, file)
    // labels("prefix", ["a", "b"]) builds prefix.a, prefix.b
    for (const m of src.matchAll(/labels\(\s*["']([\w.]+)["']\s*,\s*\[([^\]]*)\]/g)) {
      for (const k of m[2]!.matchAll(/["']([\w-]+)["']/g)) used.set(`${m[1]}.${k[1]}`, file)
    }
  }
  return used
}

describe("i18n", () => {
  it("vi.json and en.json have the same keys", () => {
    expect([...keys.vi].filter(k => !keys.en.has(k))).toEqual([])
    expect([...keys.en].filter(k => !keys.vi.has(k))).toEqual([])
  })

  it("every key the app uses exists in both locales", () => {
    const missing = [...usedKeys()]
      .filter(([k]) => !keys.vi.has(k) || !keys.en.has(k))
      .map(([k, file]) => `${k} (${file.slice(appDir.length + 1)})`)
    expect(missing).toEqual([])
  })
})
