import { describe, expect, it } from "vitest"
import { isBlockedShortcut } from "~/composables/useAntiCheat"

const key = (k: string, mods: { ctrl?: boolean; meta?: boolean; alt?: boolean } = {}) =>
  ({ key: k, ctrlKey: !!mods.ctrl, metaKey: !!mods.meta, altKey: !!mods.alt })

describe("isBlockedShortcut", () => {
  it("stops print, save and view-source, with Ctrl or ⌘, in either case", () => {
    for (const k of ["p", "s", "u", "P", "S"]) {
      expect(isBlockedShortcut(key(k, { ctrl: true }))).toBe(true)
      expect(isBlockedShortcut(key(k, { meta: true }))).toBe(true)
    }
  })
  it("lets typing and other shortcuts through", () => {
    expect(isBlockedShortcut(key("p"))).toBe(false)
    expect(isBlockedShortcut(key("z", { ctrl: true }))).toBe(false)
    expect(isBlockedShortcut(key("Enter", { meta: true }))).toBe(false)
    // AltGr on some keyboards is Ctrl+Alt: typing a character, not a shortcut
    expect(isBlockedShortcut(key("p", { ctrl: true, alt: true }))).toBe(false)
  })
})
