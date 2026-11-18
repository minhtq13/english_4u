// "Lên lớp" at the start of a school year: which class goes where. A class named by its grade digit and a suffix
// (6T1, 7T2…) goes to the same suffix one grade up (6T1 → 7T1); grade 9 graduates. Steps run from the highest grade
// down, so a class that has just been moved up is not moved again with the one it joined.

export interface PlanClass { id: string; name: string; students: number }
export interface PromotionStep {
  from: PlanClass
  /** The class the students go to; null = they graduate (grade 9). */
  to: PlanClass | null
  graduates: boolean
  /** Why this step cannot run, as a promotion.problem.* key. */
  problem: "noTarget" | "unknownName" | null
}

const GRADE = /^([6-9])(.*)$/

export function planPromotion(classes: readonly PlanClass[]): PromotionStep[] {
  const byName = new Map(classes.map(c => [c.name.trim().toUpperCase(), c]))
  return classes
    .map((from): PromotionStep => {
      const m = GRADE.exec(from.name.trim().toUpperCase())
      if (!m) return { from, to: null, graduates: false, problem: "unknownName" }
      if (m[1] === "9") return { from, to: null, graduates: true, problem: null }
      const to = byName.get(`${Number(m[1]) + 1}${m[2]}`) ?? null
      return { from, to, graduates: false, problem: to ? null : "noTarget" }
    })
    .filter(s => s.problem !== "unknownName")
    .sort((a, b) => b.from.name.localeCompare(a.from.name, "vi", { numeric: true }))
}
