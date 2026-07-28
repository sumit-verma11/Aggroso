import { describe, expect, it } from "vitest";
import { buildPlanDraft } from "../build";
import type { NutritionItemRow } from "../../db/nutrition-items";
import type { PlanGenerationResult } from "../../ai/plan-schema";

const KB: NutritionItemRow[] = [
  {
    id: "chicken-1",
    canonicalName: "Chicken breast, cooked",
    aliases: ["chicken", "chicken breast"],
    servingGrams: 100,
    calories: 165,
    proteinG: 31,
    carbsG: 0,
    fatG: 3.57,
  },
  {
    id: "rice-1",
    canonicalName: "White rice, cooked",
    aliases: ["rice"],
    servingGrams: 100,
    calories: 130,
    proteinG: 2.69,
    carbsG: 28.2,
    fatG: 0.28,
  },
];

describe("buildPlanDraft", () => {
  it("resolves matched items and computes calorie totals against the target", () => {
    const generation: PlanGenerationResult = {
      items: [
        { meal_slot: "lunch", name: "chicken breast", quantity: 150, unit: "g" },
        { meal_slot: "lunch", name: "rice", quantity: 100, unit: "g" },
      ],
      notes: ["Balanced lunch."],
    };
    const draft = buildPlanDraft(generation, KB, { allergies: [], avoidFoods: [] }, 500);

    // chicken@150g = 247.5, rice@100g = 130
    expect(draft.totals.calories).toBeCloseTo(377.5, 1);
    expect(draft.calorieTarget).toBe(500);
    expect(draft.gapFromTarget).toBeCloseTo(377.5 - 500, 1);
    expect(draft.notes).toEqual(["Balanced lunch."]);
    expect(draft.hasConflicts).toBe(false);
  });

  it("excludes an unresolved item from totals but still lists it", () => {
    const generation: PlanGenerationResult = {
      items: [{ meal_slot: "dinner", name: "soy sauce", quantity: 15, unit: "ml" }],
      notes: [],
    };
    const draft = buildPlanDraft(generation, KB, { allergies: [], avoidFoods: [] }, 2000);

    expect(draft.items[0].status).toBe("unresolved_item");
    expect(draft.totals.calories).toBe(0);
    expect(draft.gapFromTarget).toBe(-2000);
  });

  it("sets hasConflicts when a proposed item conflicts with an allergy — this is what blocks Approve", () => {
    const generation: PlanGenerationResult = {
      items: [{ meal_slot: "breakfast", name: "chicken breast", quantity: 100, unit: "g" }],
      notes: [],
    };
    const draft = buildPlanDraft(
      generation,
      KB,
      { allergies: ["chicken"], avoidFoods: [] },
      2000
    );
    expect(draft.hasConflicts).toBe(true);
    expect(draft.items[0].conflicts).toContain("chicken");
  });

  it("does not set hasConflicts when nothing matches a restriction", () => {
    const generation: PlanGenerationResult = {
      items: [{ meal_slot: "breakfast", name: "rice", quantity: 100, unit: "g" }],
      notes: [],
    };
    const draft = buildPlanDraft(
      generation,
      KB,
      { allergies: ["peanuts"], avoidFoods: ["cilantro"] },
      2000
    );
    expect(draft.hasConflicts).toBe(false);
  });

  it("reports a negative gapFromTarget plainly when the plan is short of the calorie target", () => {
    const generation: PlanGenerationResult = {
      items: [{ meal_slot: "snack", name: "rice", quantity: 50, unit: "g" }],
      notes: [],
    };
    const draft = buildPlanDraft(generation, KB, { allergies: [], avoidFoods: [] }, 2000);
    expect(draft.gapFromTarget).toBeLessThan(0);
    expect(draft.gapFromTarget).toBeCloseTo(65 - 2000, 1);
  });
});
