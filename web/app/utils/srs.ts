// Leitner boxes for flashcards: a card in box 1 comes back after a day, box 2 after 2, then 4, 8 and 16 days.
// "Remembered" moves it up a box, "not yet" sends it back to box 1 for tomorrow.

export const INTERVALS = [1, 2, 4, 8, 16] as const
export const MAX_BOX = INTERVALS.length

/** The id of a flashcard as stored in card_reviews: "<lesson id>:<section index>:<card index>". */
export const cardId = (lessonId: string, section: number, index: number) => `${lessonId}:${section}:${index}`

export function parseCardId(card: string) {
  const m = /^(.+):(\d+):(\d+)$/.exec(card)
  return m ? { lessonId: m[1]!, section: Number(m[2]), index: Number(m[3]) } : null
}

const addDays = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 864e5).toISOString().slice(0, 10)

/** The new box and next review day of a card after the student answered. `today` is "YYYY-MM-DD" (Vietnam time). */
export function review(box: number, remembered: boolean, today: string) {
  const next = remembered ? Math.min(MAX_BOX, Math.max(1, box) + 1) : 1
  return { box: next, due_on: addDays(today, remembered ? INTERVALS[next - 1]! : 1) }
}
