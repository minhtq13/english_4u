import type { Ref } from "vue"
import type { Database, Views } from "~/types/database.types"
import type { ScoredType, StoredItem } from "~/utils/sectionKinds"

export type BankRow = Views<"question_bank">

/** Which questions to list by whether they are already picked: all of them, only the picked ones, or only the others. */
export type Selection = "all" | "in" | "out"

/**
 * Questions of earlier lessons, from the question_bank view (RLS: what the reader may see with answers),
 * paged in the database. Filters: grade (course), section type, text in the question or explanation, tag.
 * Used by the question bank page and by the editor's dialog, which fixes the type to the section's.
 * The exam builder also passes `selection` and `picked` (the ids chosen so far): "in" lists only those (in any grade),
 * "out" leaves them out. `picked` is read when a page is fetched, so ticking a row never reloads the list under the
 * cursor; the next page or filter change shows the new state.
 */
export function useQuestionBank(
  f: { course: Ref<string>; type: Ref<string>; search: Ref<string>; tag: Ref<string>; selection?: Ref<Selection>; picked?: () => string[] },
  pageSize = 15,
) {
  const client = useSupabaseClient<Database>()
  return useServerList<BankRow>(([from, to]) => {
    const mode = f.selection?.value ?? "all"
    const ids = f.picked?.() ?? []
    // Nothing is picked, so nothing can be listed as picked.
    if (mode === "in" && !ids.length) return Promise.resolve({ data: [], count: 0, error: null })
    let q = client.from("question_bank").select("*", { count: "exact" })
    if (f.type.value) q = q.eq("type", f.type.value as BankRow["type"] & string)
    if (f.course.value && mode !== "in") q = q.eq("course_id", f.course.value)
    if (mode === "in") q = q.in("id", ids)
    else if (mode === "out" && ids.length) q = q.not("id", "in", `(${ids.join(",")})`)
    const term = filterTerm(f.search.value)
    if (term) q = q.or(`prompt.ilike.*${term}*,explanation.ilike.*${term}*`)
    const tag = likeTerm(f.tag.value)
    if (tag) q = q.ilike("tag", `%${tag}%`)
    // `id` breaks the ties: many questions share a lesson, and without it PostgreSQL may return the same row on two pages.
    return q.order("lesson_id").order("id").range(from, to)
  }, { pageSize, filters: [f.course, f.type, f.search, f.tag, ...(f.selection ? [f.selection] : [])] })
}

/** Stored questions (bank rows, wrong answers) grouped into one draft section per type, in the usual order, for a new lesson. */
export function sectionsFromQuestions(rows: (StoredItem & { type: string | null })[], title: (type: ScoredType) => string) {
  return SCORED_TYPES
    .map(type => ({ type, items: rows.filter(r => r.type === type) }))
    .filter(g => g.items.length)
    .map(g => emptySection(g.type, { title: title(g.type), items: g.items.map(r => itemToDraft(r, g.type)), short: g.type === "typed" }))
}
