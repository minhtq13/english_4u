export interface Toast { id: number; text: string; kind: "ok" | "error" }

const DURATION = { ok: 4000, error: 7000 } as const

/**
 * Short messages that appear at the bottom of the screen and go away by themselves ("Saved", "Lesson given",
 * a network failure). Shown by ToastHost in the layout; a screen reader hears them without focus moving.
 * Use it for the outcome of an action; keep inline messages (`fb`) for text tied to one control or field.
 */
export function useToast() {
  const toasts = useState<Toast[]>("toasts", () => [])
  let seq = useState<number>("toast-seq", () => 0)

  function dismiss(id: number) {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }
  function show(text: string, kind: Toast["kind"]) {
    if (!text) return
    const id = ++seq.value
    // The same text twice in a row shows once.
    toasts.value = [...toasts.value.filter(t => t.text !== text), { id, text, kind }].slice(-3)
    if (import.meta.client) setTimeout(() => dismiss(id), DURATION[kind])
  }
  return { toasts, ok: (text: string) => show(text, "ok"), error: (text: string) => show(text, "error"), dismiss }
}
