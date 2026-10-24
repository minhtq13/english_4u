import type { Enums, Json, Tables } from "~/types/database.types"
import type { Lesson } from "./course"
import { shuffled, stripTags, toLesson } from "./course"
import { tr } from "./i18n"
import { SECTION_KINDS, isScoredType, type StoredItem } from "./sectionKinds"

// The lesson editor works on a draft: plain strings for every input, turned into the
// save_lesson() payload on save. List fields are typed as one line each: typed answers are
// separated by "|", order chunks by "/".

export type SectionType = Enums<"section_type">

export interface DraftItem {
  prompt: string
  back: string
  options: string[]
  /** 1-based index of the right option (mcq) or of the wrong chunk (error). */
  correct: number
  /** typed: accepted answers; order: other accepted sentences. Separated by "|". */
  answers: string
  /** order: chunks in the correct order; error: the sentence's chunks. Separated by "/". */
  words: string
  explanation: string
  tag: string
}

export interface DraftSection {
  /** Local id for v-for keys. */
  uid: number
  type: SectionType
  title: string
  time: string
  hint: string
  /** explain: content; mcq / typed: optional reading passage shared by the questions. */
  body: string
  placeholder: string
  short: boolean
  items: DraftItem[]
  /** Key of the exam-format preset the section was made from (SECTION_PRESETS), kept so a saved structure rebuilds it. */
  preset?: string
}

export interface LessonDraft {
  label: string
  title: string
  description: string
  subtitle: string
  sections: DraftSection[]
}

const sectionType = (type: SectionType, scored: boolean, letter: string) =>
  ({ get label() { return tr(`sectionType.${type}`) }, scored, letter })
/** Section kinds: label (current language, i18n sectionType.*), auto-graded or not, default score key. */
export const SECTION_TYPES: Record<SectionType, { readonly label: string; scored: boolean; letter: string }> = {
  explain: sectionType("explain", false, ""),
  cards: sectionType("cards", false, ""),
  mcq: sectionType("mcq", true, "M"),
  typed: sectionType("typed", true, "G"),
  order: sectionType("order", true, "O"),
  match: sectionType("match", true, "N"),
  error: sectionType("error", true, "E"),
  writing: sectionType("writing", false, ""),
}
/** Section types that may carry a reading passage in `body`. */
export const hasPassage = (t: SectionType) => t === "mcq" || t === "typed"
export const hasItems = (t: SectionType) => t !== "explain" && t !== "writing"

let nextUid = 1
export const emptyItem = (init: Partial<DraftItem> = {}): DraftItem =>
  ({ prompt: "", back: "", options: ["", "", ""], correct: 1, answers: "", words: "", explanation: "", tag: "", ...init })

export function emptySection(type: SectionType, init: Partial<DraftSection> = {}): DraftSection {
  return {
    uid: nextUid++, type, title: "", time: "", hint: "", body: "", placeholder: "", short: type === "typed",
    items: hasItems(type) ? [emptyItem()] : [],
    ...init,
  }
}

/** A copy with its own uid, so the same template section can be used again. */
export function cloneSection(s: DraftSection): DraftSection {
  const { uid: _, items, ...rest } = s
  return emptySection(s.type, { ...rest, items: items.map(i => ({ ...i, options: [...i.options] })) })
}

/** The structure every built-in lesson follows: one 30-minute session. */
export const STANDARD_STRUCTURE = (): DraftSection[] => [
  emptySection("explain", { title: tr("standard.explain.title"), time: tr("standard.explain.time") }),
  emptySection("cards", { title: tr("standard.cards.title"), time: tr("standard.cards.time"), hint: tr("standard.cards.hint") }),
  emptySection("mcq", { title: tr("standard.mcq.title"), time: tr("standard.mcq.time") }),
  emptySection("typed", { title: tr("standard.typed.title"), time: tr("standard.typed.time"), hint: tr("standard.typed.hint") }),
  emptySection("order", { title: tr("standard.order.title"), time: tr("standard.order.time"), hint: tr("standard.order.hint") }),
  emptySection("writing", { title: tr("standard.writing.title"), time: tr("standard.writing.time") }),
]

/**
 * Ready-made sections for THCS exam formats, built on the section types above (i18n presets.*).
 * Each sets a title, an instruction and starter questions; the teacher fills in the content.
 */
// `init` is a function: starter questions use tr(), which only works once the app (and i18n) is running, not at import time.
const preset = (key: string, type: SectionType, init: () => Partial<DraftSection> = () => ({})) => ({
  get label() { return tr(`presets.${key}.label`) },
  make: (): DraftSection => emptySection(type, { title: tr(`presets.${key}.label`), hint: tr(`presets.${key}.hint`), ...init(), preset: key }),
})
const repeat = (n: number, item: (i: number) => Partial<DraftItem>) => Array.from({ length: n }, (_, i) => emptyItem(item(i)))
export const SECTION_PRESETS = {
  pronunciation: preset("pronunciation", "mcq", () => ({ items: repeat(4, () => ({ prompt: tr("presets.pronunciation.prompt"), options: ["", "", "", ""] })) })),
  stress: preset("stress", "mcq", () => ({ items: repeat(4, () => ({ prompt: tr("presets.stress.prompt"), options: ["", "", "", ""] })) })),
  trueFalse: preset("trueFalse", "mcq", () => ({ items: repeat(4, () => ({ options: ["True", "False"] })) })),
  reading: preset("reading", "mcq", () => ({ items: repeat(4, () => ({ options: ["", "", "", ""] })) })),
  cloze: preset("cloze", "mcq", () => ({ items: repeat(5, i => ({ prompt: `(${i + 1})`, options: ["", "", "", ""] })) })),
  clozeTyped: preset("clozeTyped", "typed", () => ({ short: true, items: repeat(5, i => ({ prompt: `(${i + 1})` })) })),
  wordForm: preset("wordForm", "typed", () => ({ short: true, items: repeat(4, () => ({})) })),
  rewrite: preset("rewrite", "typed", () => ({ short: false, items: repeat(3, () => ({})) })),
  match: preset("match", "match", () => ({ items: repeat(5, () => ({})) })),
  error: preset("error", "error", () => ({ items: repeat(4, () => ({})) })),
}
export type PresetKey = keyof typeof SECTION_PRESETS

/** The exam layout of a "Luyện đề" worksheet: pronunciation, true/false reading, cloze, matching, error finding. */
export const EXAM_STRUCTURE = (): DraftSection[] =>
  (["pronunciation", "trueFalse", "cloze", "match", "error"] as const).map(k => SECTION_PRESETS[k].make())

// ---- saved structures: the outline of a lesson without any question or answer ----

/** What is stored in lesson_structures.sections, one entry per section. */
export interface StructureSpec {
  type: SectionType
  title: string
  time: string
  hint: string
  short: boolean
  /** Number of (empty) questions or cards. */
  items: number
  preset?: string
}
export const MAX_ITEMS_PER_SECTION = 60

export const structureOf = (sections: DraftSection[]): StructureSpec[] => sections.map(s => ({
  type: s.type, title: s.title.trim(), time: s.time.trim(), hint: s.hint.trim(), short: s.short, items: s.items.length,
  ...(s.preset ? { preset: s.preset } : {}),
}))

/** A section whose body or questions hold something the teacher typed (a preset's starter prompt and True / False options do not count). */
export function hasContent(s: DraftSection): boolean {
  if (s.body.trim() || s.placeholder.trim()) return true
  const starter = s.preset && s.preset in SECTION_PRESETS ? SECTION_PRESETS[s.preset as PresetKey].make().items[0]?.prompt ?? "" : ""
  return s.items.some((i) => {
    const prompt = i.prompt.trim() === starter.trim() || /^\(\d+\)$/.test(i.prompt.trim()) ? "" : i.prompt
    return !!(prompt.trim() || i.back.trim() || i.words.trim() || i.answers.trim()
      || i.options.some(o => o.trim() && o !== "True" && o !== "False"))
  })
}

/** Resizes the question list of a section: new questions copy the option layout of the last one, never its text. */
export function resizeItems(s: DraftSection, n: number) {
  const target = Math.max(1, Math.min(MAX_ITEMS_PER_SECTION, n))
  while (s.items.length > target) s.items.pop()
  while (s.items.length < target) {
    const last = s.items.at(-1)
    s.items.push(emptyItem(last ? { options: last.options.map(o => (o === "True" || o === "False" ? o : "")) } : {}))
  }
}

/** Rebuilds sections from a stored structure; anything malformed is skipped, so old data never breaks the editor. */
export function sectionsFromStructure(spec: unknown): DraftSection[] {
  if (!Array.isArray(spec)) return []
  const out: DraftSection[] = []
  for (const raw of spec) {
    const r = raw as Partial<StructureSpec> | null
    if (!r || typeof r !== "object" || !r.type || !(r.type in SECTION_TYPES)) continue
    const base = r.preset && r.preset in SECTION_PRESETS ? SECTION_PRESETS[r.preset as PresetKey].make() : emptySection(r.type)
    const s: DraftSection = {
      ...base,
      type: r.type,
      title: String(r.title ?? ""), time: String(r.time ?? ""), hint: String(r.hint ?? ""),
      short: typeof r.short === "boolean" ? r.short : base.short,
    }
    if (hasItems(s.type)) resizeItems(s, Number(r.items) || s.items.length || 1)
    else s.items = []
    out.push(s)
  }
  return out
}

type SectionRow = Tables<"lesson_sections"> & { section_items: Tables<"section_items">[] }
const byPosition = (a: { position: number }, b: { position: number }) => a.position - b.position

/** A stored question (section_items row or question_bank row) of a section type as an editable draft item. */
export const itemToDraft = (i: StoredItem, type?: SectionType | null): DraftItem => emptyItem({
  prompt: i.prompt ?? "",
  back: i.back ?? "",
  explanation: i.explanation ?? "",
  tag: i.tag ?? "",
  ...(isScoredType(type) ? SECTION_KINDS[type].draft(i) : {}),
})

type TypedStoredItem = { type: SectionType | null } & StoredItem
/** A stored question in one line, for lists (question bank, review sheets). */
export const questionText = (r: TypedStoredItem) => (isScoredType(r.type) ? SECTION_KINDS[r.type].question(r) : stripTags(r.prompt ?? ""))
/** A stored question's answer key in one line. */
export const answerText = (r: TypedStoredItem) => (isScoredType(r.type) ? SECTION_KINDS[r.type].answer(r) : r.back ?? "")

/** Sections of an existing lesson as a draft; without `withContent` only the structure is kept. */
export function sectionsFromRows(rows: SectionRow[], withContent: boolean): DraftSection[] {
  return [...rows].sort(byPosition).map((s) => {
    const items = [...s.section_items].sort(byPosition).map(i => itemToDraft(i, s.type))
    return emptySection(s.type, {
      title: s.title,
      time: s.time_label ?? "",
      hint: s.hint ?? "",
      short: s.short_input,
      body: withContent ? s.body ?? "" : "",
      placeholder: withContent ? s.placeholder ?? "" : "",
      items: hasItems(s.type) ? (withContent && items.length ? items : [emptyItem()]) : [],
    })
  })
}

/** Problems that would make the lesson unusable, in the current language, in section order. */
export function validateDraft(d: LessonDraft): string[] {
  const errors: string[] = []
  if (!d.title.trim()) errors.push(tr("draftCheck.noTitle"))
  if (!d.sections.length) errors.push(tr("draftCheck.noSections"))
  d.sections.forEach((s, si) => {
    const where = tr("draftCheck.where", { n: si + 1, type: SECTION_TYPES[s.type].label })
    const at = (key: string, q?: string) => errors.push(`${q ?? where}: ${tr(`draftCheck.${key}`)}`)
    if (s.type === "explain" && !s.body.trim()) at("noBody")
    if (hasItems(s.type) && !s.items.length) at("noItems")
    s.items.forEach((it, ii) => {
      const q = tr("draftCheck.whereItem", { where, n: ii + 1 })
      if (s.type === "cards" && (!it.prompt.trim() || !it.back.trim())) at("cardSides", q)
      if (isScoredType(s.type)) SECTION_KINDS[s.type].problems(it).forEach(key => at(key, q))
    })
  })
  return errors
}

/** One upper-case score key per scored section: M / G / O when free, otherwise the next unused letter. */
function scoreKeys(sections: DraftSection[]): (string | null)[] {
  const used = new Set<string>()
  return sections.map((s) => {
    if (!SECTION_TYPES[s.type].scored) return null
    let key = SECTION_TYPES[s.type].letter
    for (let c = 65; used.has(key); c++) key = String.fromCharCode(c)
    used.add(key)
    return key
  })
}

/** The lesson save_lesson() stores from a draft. */
function lessonPayload(d: LessonDraft, meta: { id: string; phaseId: number }) {
  const keys = scoreKeys(d.sections)
  const label = d.label.trim()
  const title = d.title.trim()
  return {
    id: meta.id,
    phase_id: meta.phaseId,
    label,
    title,
    heading: label ? `${label} - ${title}` : title,
    description: d.description.trim(),
    subtitle: d.subtitle.trim(),
    sections: d.sections.map((s, i) => ({
      type: s.type,
      score_key: keys[i] ?? "",
      title: s.title.trim(),
      time_label: s.time.trim(),
      hint: s.hint.trim(),
      body: s.type === "explain" || hasPassage(s.type) ? s.body : "",
      placeholder: s.type === "writing" ? s.placeholder : "",
      short_input: s.type === "typed" && s.short,
      items: hasItems(s.type) ? s.items.map(it => itemPayload(s.type, it)) : [],
    })),
  }
}

/** The save_lesson() payload. */
export const draftPayload = (d: LessonDraft, meta: { id: string; phaseId: number }) => lessonPayload(d, meta) as unknown as Json

function itemPayload(type: SectionType, it: DraftItem): StoredItem {
  if (type === "cards") return { prompt: it.prompt.trim(), back: it.back.trim() }
  return { ...(isScoredType(type) ? SECTION_KINDS[type].payload(it) : {}), explanation: it.explanation.trim(), tag: it.tag.trim() }
}

/**
 * What lesson_items() serves a teacher for one section's stored questions: order chunks shuffled, with the
 * right sentence first among the accepted answers; every right side of a match section, shuffled, in options.
 */
function served<T extends StoredItem>(type: SectionType, items: T[]): T[] {
  if (type === "order") return items.map(i => ({ ...i, words: shuffled(i.words ?? []), answers: [(i.words ?? []).join(" "), ...(i.answers ?? [])] }))
  if (type === "match") {
    const choices = shuffled(items.map(i => i.back ?? ""))
    return items.map(i => ({ ...i, options: choices }))
  }
  return items
}

/**
 * The draft as a Lesson, for previewing in the editor without saving: what save_lesson() would store, served
 * as lesson_items() serves it with the answer key, read by toLesson() like any saved lesson. So the preview
 * shows and grades exactly like the real lesson.
 */
export function draftToLesson(d: LessonDraft, meta: { id: string; courseId: string; phase: number }): Lesson {
  const p = lessonPayload(d, { id: meta.id, phaseId: meta.phase })
  const sections = p.sections.map((s, i) => ({
    id: `draft-${i}`, position: i, type: s.type, title: s.title, time_label: s.time_label, hint: s.hint,
    body: s.body, placeholder: s.placeholder, score_key: s.score_key || null, short_input: s.short_input,
  }))
  const items = p.sections.flatMap((s, i) => served(s.type, s.items.map((it, k) => ({ ...it, section_id: `draft-${i}`, position: k }))))
  const lesson = toLesson({ ...p, lesson_sections: sections, phases: { course_id: meta.courseId } }, items)
  // An unfinished draft still reads well: placeholders for what is not typed yet.
  const label = p.label || tr("draftCheck.newLesson")
  const title = p.title || tr("draftCheck.untitled")
  return {
    ...lesson, label, title, heading: `${label} - ${title}`,
    sections: lesson.sections.map((s, i) => ({ ...s, title: s.title || SECTION_TYPES[d.sections[i]!.type].label })),
  }
}
