import type { Enums, Json, Tables } from "~/types/database.types"
import type { Lesson, Section } from "~/utils/course"

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

type ItemFields = Pick<Tables<"section_items">, "prompt" | "back" | "options" | "correct_option" | "answers" | "words" | "explanation" | "tag">

/** A stored question (section_items row or question_bank row) of a section type as an editable draft item. */
export const itemToDraft = (i: { [K in keyof ItemFields]?: ItemFields[K] | null }, type?: SectionType | null): DraftItem => ({
  prompt: i.prompt ?? "",
  back: i.back ?? "",
  options: i.options?.length && type !== "error" && type !== "match" ? [...i.options] : ["", "", ""],
  correct: i.correct_option ?? 1,
  answers: (i.answers ?? []).join(" | "),
  // Error chunks are stored in options; the editor types them like order chunks.
  words: (type === "error" ? i.options ?? [] : i.words ?? []).join(" / "),
  explanation: i.explanation ?? "",
  tag: i.tag ?? "",
})

type StoredItem = { type: SectionType | null } & { [K in keyof ItemFields]?: ItemFields[K] | null }
/** A stored question in one line, for lists (question bank, review sheets). */
export const questionText = (r: StoredItem) =>
  r.type === "order" ? (r.words ?? []).join(" / ") : r.type === "error" ? (r.options ?? []).join(" ") : stripTags(r.prompt ?? "")
/** A stored question's answer key in one line. */
export const answerText = (r: StoredItem) =>
  r.type === "mcq" || r.type === "error" ? (r.options ?? [])[(r.correct_option ?? 1) - 1] ?? ""
    : r.type === "order" ? (r.words ?? []).join(" ")
      : r.type === "match" ? r.back ?? "" : (r.answers ?? []).join(" / ")

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

export const splitList = (text: string, sep: string) => text.split(sep).map(x => x.trim()).filter(Boolean)

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
      if (s.type === "mcq") {
        const opts = it.options.map(o => o.trim())
        if (!it.prompt.trim()) at("noPrompt", q)
        if (opts.filter(Boolean).length < 2) at("twoOptions", q)
        if (!opts[it.correct - 1]) at("noCorrect", q)
      }
      if (s.type === "typed") {
        if (!it.prompt.trim()) at("noPrompt", q)
        if (!splitList(it.answers, "|").length) at("noAnswer", q)
      }
      if (s.type === "order" && splitList(it.words, "/").length < 2) at("twoChunks", q)
      if (s.type === "match" && (!it.prompt.trim() || !it.back.trim())) at("matchSides", q)
      if (s.type === "error") {
        const chunks = splitList(it.words, "/")
        if (chunks.length < 2) at("twoChunks", q)
        else if (!chunks[it.correct - 1]) at("noWrongChunk", q)
        if (new Set(chunks).size < chunks.length) at("dupChunks", q)
      }
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

/** The save_lesson() payload. */
export function draftPayload(d: LessonDraft, meta: { id: string; phaseId: number }): Json {
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

function itemPayload(type: SectionType, it: DraftItem) {
  const base = { explanation: it.explanation.trim(), tag: it.tag.trim() }
  switch (type) {
    case "cards":
      return { prompt: it.prompt.trim(), back: it.back.trim() }
    case "mcq": {
      // Blank options are dropped; the right answer's index follows its option.
      const kept = it.options.map((o, i) => ({ o: o.trim(), right: i === it.correct - 1 })).filter(x => x.o)
      return { ...base, prompt: it.prompt.trim(), options: kept.map(x => x.o), correct_option: kept.findIndex(x => x.right) + 1 }
    }
    case "typed":
      return { ...base, prompt: it.prompt.trim(), answers: splitList(it.answers, "|") }
    case "match":
      return { ...base, prompt: it.prompt.trim(), back: it.back.trim() }
    case "error":
      return { ...base, options: splitList(it.words, "/"), correct_option: it.correct }
    default:
      return { ...base, prompt: it.prompt.trim(), words: splitList(it.words, "/"), answers: splitList(it.answers, "|") }
  }
}

/**
 * The draft as a Lesson, for previewing in the editor without saving. Mirrors what save_lesson() stores
 * and toLesson() reads back (same score keys, same answer key), so the preview grades like the real lesson.
 */
export function draftToLesson(d: LessonDraft, meta: { id: string; courseId: string; phase: number }): Lesson {
  const keys = scoreKeys(d.sections)
  const label = d.label.trim() || tr("draftCheck.newLesson")
  const title = d.title.trim() || tr("draftCheck.untitled")
  const sections: Section[] = d.sections.map((s, i): Section => {
    const base = { title: s.title.trim() || SECTION_TYPES[s.type].label, time: s.time.trim() || undefined, hint: s.hint ? safeHtml(s.hint) : undefined }
    const why = (it: DraftItem) => (it.explanation ? safeHtml(it.explanation) : undefined)
    const tag = (it: DraftItem) => it.tag.trim() || undefined
    switch (s.type) {
      case "explain":
        return { ...base, type: "explain", html: safeHtml(s.body) }
      case "writing":
        return { ...base, type: "writing", placeholder: s.placeholder || undefined }
      case "cards":
        return { ...base, type: "cards", items: s.items.map(it => [safeHtml(it.prompt), safeHtml(it.back)] as [string, string]) }
      case "error":
        return {
          ...base, type: "error", key: keys[i]!,
          items: s.items.map(it => ({ q: "", opts: splitList(it.words, "/"), a: it.correct - 1, why: why(it), tag: tag(it) })),
        }
      case "match":
        return {
          ...base, type: "match", key: keys[i]!, choices: shuffled(s.items.map(it => it.back.trim())),
          items: s.items.map(it => ({ q: safeHtml(it.prompt), a: it.back.trim(), why: why(it), tag: tag(it) })),
        }
      case "mcq":
        return {
          ...base, type: "mcq", key: keys[i]!, passage: s.body ? safeHtml(s.body) : undefined,
          items: s.items.map((it) => {
            const p = itemPayload("mcq", it) as { options: string[]; correct_option: number }
            return { q: safeHtml(it.prompt), opts: p.options, a: p.correct_option - 1, why: why(it), tag: tag(it) }
          }),
        }
      case "typed":
        return {
          ...base, type: "typed", key: keys[i]!, short: s.short, passage: s.body ? safeHtml(s.body) : undefined,
          items: s.items.map(it => ({ q: safeHtml(it.prompt), ans: splitList(it.answers, "|"), why: why(it), tag: tag(it) })),
        }
      case "order":
        return {
          ...base, type: "order", key: keys[i]!,
          items: s.items.map((it) => {
            const words = splitList(it.words, "/")
            return { words: shuffled(words), prompt: it.prompt.trim() || undefined, ans: [words.join(" "), ...splitList(it.answers, "|")], why: why(it), tag: tag(it) }
          }),
        }
    }
  })
  return {
    id: meta.id, label, courseId: meta.courseId, phase: meta.phase, title, desc: d.description,
    heading: `${label} - ${title}`, sub: d.subtitle, sections,
  }
}
