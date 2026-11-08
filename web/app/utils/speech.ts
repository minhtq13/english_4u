// Reading English aloud with the browser's own voices (Web Speech API): nothing is sent to a server.

/** The text a person would read: tags and the [x] underline marks removed, blanks ("___") skipped. */
export const speakable = (html: string) =>
  html.replace(/<[^>]+>/g, " ").replace(/\[([^\]]+)\]/g, "$1").replace(/_{2,}|\.{3,}|…/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim()

export const canSpeak = () => typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined"

/** Reads `text` in English, replacing whatever is being read. Returns false when the browser cannot speak. */
export function speak(text: string, lang = "en-US") {
  if (!canSpeak()) return false
  const clean = speakable(text)
  if (!clean) return false
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(clean)
  u.lang = lang
  u.rate = 0.9
  window.speechSynthesis.speak(u)
  return true
}

export const stopSpeaking = () => { if (canSpeak()) window.speechSynthesis.cancel() }
