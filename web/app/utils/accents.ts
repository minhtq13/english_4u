// The primary colours a person can choose (account page). "blue" is the default and has no rule: the tokens in main.css
// are blue. Every other key has a light and a dark set of --accent / --accent-soft / --on-accent in main.css, under
// `[data-accent="<key>"]` (tests/accents.test.ts checks each has its rules and enough contrast).

export const ACCENTS = [
  { key: "blue", swatch: "#1f5ee6" },
  { key: "indigo", swatch: "#4f46e5" },
  { key: "violet", swatch: "#7c3aed" },
  { key: "rose", swatch: "#be185d" },
  { key: "orange", swatch: "#c2410c" },
  { key: "green", swatch: "#166534" },
  { key: "teal", swatch: "#0f766e" },
  { key: "slate", swatch: "#475569" },
] as const

export type AccentKey = (typeof ACCENTS)[number]["key"]
export const DEFAULT_ACCENT: AccentKey = "blue"
export const isAccent = (v: unknown): v is AccentKey => ACCENTS.some(a => a.key === v)

// ---- a colour of the person's own choosing ----
// From one picked colour, a light set and a dark set of the three accent tokens are worked out so that text on the
// button and the accent on its soft background stay readable (contrast 4.5 or more), whatever was picked.

export interface AccentSet { accent: string; soft: string; on: string }
export interface CustomAccent { light: AccentSet; dark: AccentSet }

const HEX = /^#[0-9a-f]{6}$/i
export const isHex = (v: string) => HEX.test(v)

type Rgb = [number, number, number]
const toRgb = (hex: string): Rgb => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)) as Rgb
const toHex = (c: Rgb) => `#${c.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("")}`

function toHsl([r, g, b]: Rgb): [number, number, number] {
  const [R, G, B] = [r / 255, g / 255, b / 255]
  const max = Math.max(R, G, B)
  const min = Math.min(R, G, B)
  const l = (max + min) / 2
  const d = max - min
  if (!d) return [0, 0, l]
  const s = d / (1 - Math.abs(2 * l - 1))
  const h = max === R ? ((G - B) / d) % 6 : max === G ? (B - R) / d + 2 : (R - G) / d + 4
  return [(h * 60 + 360) % 360, s, l]
}
function fromHsl(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]
  return toHex([(r + m) * 255, (g + m) * 255, (b + m) * 255])
}

/** Relative luminance and contrast ratio (WCAG 2). */
export const luminance = (hex: string) => {
  const [r, g, b] = toRgb(hex).map(v => v / 255).map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)) as Rgb
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
export const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
  return (hi + 0.05) / (lo + 0.05)
}

const WHITE = "#ffffff"
const DARK_CARD = "#1d2129"
const MIN = 4.5

export function customAccent(hex: string): CustomAccent {
  const [h, s0] = toHsl(toRgb(hex))
  const s = Math.min(s0, 0.95)
  // Light: darken until white text reads on it, then until it reads on its own pale background.
  let l = toHsl(toRgb(hex))[2]
  const soft = fromHsl(h, Math.min(s, 0.6), 0.94)
  let accent = fromHsl(h, s, l)
  while ((contrast(WHITE, accent) < MIN || contrast(accent, soft) < MIN) && l > 0.02) { l -= 0.01; accent = fromHsl(h, s, l) }
  // Dark: lighten until it reads on the dark card, on its own deep background, and dark text reads on it.
  const dsoft = fromHsl(h, Math.min(s, 0.4), 0.2)
  const on = fromHsl(h, Math.min(s, 0.4), 0.08)
  let dl = Math.max(toHsl(toRgb(hex))[2], 0.5)
  let dark = fromHsl(h, s, dl)
  while ((contrast(dark, DARK_CARD) < MIN || contrast(dark, dsoft) < MIN || contrast(on, dark) < MIN) && dl < 0.98) { dl += 0.01; dark = fromHsl(h, s, dl) }
  return { light: { accent, soft, on: WHITE }, dark: { accent: dark, soft: dsoft, on } }
}

/** The six colours of a custom accent as written in the cookie (no "#", dot-separated): light accent, soft, on, dark accent, soft, on. */
export const packAccent = (c: CustomAccent) => [c.light.accent, c.light.soft, c.light.on, c.dark.accent, c.dark.soft, c.dark.on].map(v => v.slice(1)).join(".")
export const CUSTOM_VARS = ["--c-accent", "--c-soft", "--c-on", "--cd-accent", "--cd-soft", "--cd-on"] as const
