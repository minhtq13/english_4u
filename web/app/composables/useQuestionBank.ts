import type { Ref } from "vue"
import type { Database, Views } from "~/types/database.types"
import type { ScoredType, StoredItem } from "~/utils/sectionKinds"

export type BankRow = Views<"question_bank">

/**
 * Questions of earlier lessons, from the question_bank view (RLS: what the reader may see with answers),
 * paged in the database. Filters: grade (course), section type, text in the question or explanation, tag.
 * Used by the question bank page and by the editor's dialog, which fixes the type to the section's.
 */
export function useQuestionBank(f: { course: Ref<string>; type: Ref<string>; search: Ref<string>; tag: Ref<string> }, pageSize = 15) {
  const client = useSupabaseClient<Database>()
  return useServerList<BankRow>(([from, to]) => {
    let q = client.from("question_bank").select("*", { count: "exact" })
    if (f.type.value) q = q.eq("type", f.type.value as BankRow["type"] & string)
    if (f.course.value) q = q.eq("course_id", f.course.value)
    const term = filterTerm(f.search.value)
    if (term) q = q.or(`prompt.ilike.*${term}*,explanation.ilike.*${term}*`)
    const tag = likeTerm(f.tag.value)
    if (tag) q = q.ilike("tag", `%${tag}%`)
    return q.order("lesson_id").range(from, to)
  }, { pageSize, filters: [f.course, f.type, f.search, f.tag] })
}

/** Stored questions (bank rows, wrong answers) grouped into one draft section per type, in the usual order, for a new lesson. */
export function sectionsFromQuestions(rows: (StoredItem & { type: string | null })[], title: (type: ScoredType) => string) {
  return SCORED_TYPES
    .map(type => ({ type, items: rows.filter(r => r.type === type) }))
    .filter(g => g.items.length)
    .map(g => emptySection(g.type, { title: title(g.type), items: g.items.map(r => itemToDraft(r, g.type)), short: g.type === "typed" }))
}
