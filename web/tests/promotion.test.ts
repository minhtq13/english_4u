import { describe, expect, it } from "vitest"
import { planPromotion } from "~/utils/promotion"

const c = (name: string, students = 3) => ({ id: name, name, students })

describe("planPromotion", () => {
  const plan = planPromotion([c("6T1"), c("7T1"), c("8T1"), c("9T1"), c("6T2"), c("7T2")])
  it("goes from the highest grade down", () => {
    expect(plan.map(s => s.from.name)).toEqual(["9T1", "8T1", "7T2", "7T1", "6T2", "6T1"])
  })
  it("sends a class to the same suffix one grade up, and grade 9 graduates", () => {
    expect(plan.find(s => s.from.name === "6T1")!.to?.name).toBe("7T1")
    expect(plan.find(s => s.from.name === "9T1")).toMatchObject({ graduates: true, to: null, problem: null })
  })
  it("reports a class with no class to move up to, and skips names it cannot read", () => {
    expect(plan.find(s => s.from.name === "7T2")).toMatchObject({ to: null, problem: "noTarget" })
    expect(planPromotion([c("Khác")])).toEqual([])
  })
})
