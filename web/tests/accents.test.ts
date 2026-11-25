import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { ACCENTS, DEFAULT_ACCENT, isAccent } from "~/utils/accents"

const css = readFileSync(new URL("../app/assets/css/main.css", import.meta.url), "utf8")

const lum = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!
}
const contrast = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x! + 0.05) / (y! + 0.05) }

/** The --accent / --accent-soft / --on-accent of the first rule that matches `selector`. */
function tokens(selector: string) {
  const at = css.indexOf(`${selector} {`)
  expect(at, `${selector} is missing from main.css`).toBeGreaterThan(-1)
  const body = css.slice(at, css.indexOf("}", at))
  const get = (n: string) => new RegExp(`${n}: (#[0-9a-f]{6})`).exec(body)![1]!
  return { accent: get("--accent"), soft: get("--accent-soft"), on: get("--on-accent") }
}

describe("accents", () => {
  it("knows its keys, and blue is the default", () => {
    expect(isAccent("teal")).toBe(true)
    expect(isAccent("pink")).toBe(false)
    expect(DEFAULT_ACCENT).toBe("blue")
  })
  it("blue (the default tokens): readable in light and dark, and the swatch is the light accent", () => {
    for (const t of [tokens(":root"), tokens(':root[data-theme="dark"]')]) {
      expect(contrast(t.on, t.accent)).toBeGreaterThanOrEqual(4.5)
      expect(contrast(t.accent, t.soft)).toBeGreaterThanOrEqual(4.5)
    }
    expect(tokens(':root:not([data-theme="light"])')).toEqual(tokens(':root[data-theme="dark"]'))
    expect(ACCENTS.find(a => a.key === DEFAULT_ACCENT)!.swatch).toBe(tokens(":root").accent)
  })
  for (const { key } of ACCENTS.filter(a => a.key !== DEFAULT_ACCENT)) {
    it(`${key}: a light and a dark set, readable (button text and accent text on its soft background)`, () => {
      for (const t of [tokens(`:root[data-accent="${key}"]`), tokens(`:root[data-accent="${key}"][data-theme="dark"]`)]) {
        expect(contrast(t.on, t.accent)).toBeGreaterThanOrEqual(4.5)
        expect(contrast(t.accent, t.soft)).toBeGreaterThanOrEqual(4.5)
      }
      // The device-dark rule carries the same values as the explicit dark rule.
      expect(tokens(`:root[data-accent="${key}"]:not([data-theme="light"])`)).toEqual(tokens(`:root[data-accent="${key}"][data-theme="dark"]`))
    })
  }
})

import { contrast as c2, customAccent, isHex, packAccent } from "~/utils/accents"

describe("customAccent", () => {
  const picked = ["#2071c2", "#ffff00", "#ffffff", "#000000", "#ff0000", "#00ff00", "#808080", "#ff69b4", "#0a0a30", "#7fffd4"]
  for (const hex of picked) {
    it(`${hex}: both sets stay readable`, () => {
      const { light, dark } = customAccent(hex)
      expect(c2(light.on, light.accent)).toBeGreaterThanOrEqual(4.5)
      expect(c2(light.accent, light.soft)).toBeGreaterThanOrEqual(4.5)
      expect(c2(dark.on, dark.accent)).toBeGreaterThanOrEqual(4.5)
      expect(c2(dark.accent, dark.soft)).toBeGreaterThanOrEqual(4.5)
      expect(c2(dark.accent, "#1d2129")).toBeGreaterThanOrEqual(4.5)
    })
  }
  it("barely moves a colour that is already readable", () => {
    expect(c2(customAccent("#2071c2").light.accent, "#2071c2")).toBeLessThan(1.1)
  })
  it("accepts only #rrggbb and packs six colours for the cookie", () => {
    expect(isHex("#2071c2")).toBe(true)
    expect(isHex("2071c2")).toBe(false)
    expect(isHex("#fff")).toBe(false)
    expect(packAccent(customAccent("#2071c2")).split(".")).toHaveLength(6)
  })
})
