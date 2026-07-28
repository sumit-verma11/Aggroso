import { describe, expect, it } from "vitest";
import { buildMealDraft } from "../draft";
import type { NutritionItemRow } from "../../db/nutrition-items";
import type { ExtractionResult } from "../../ai/schema";

const KB: NutritionItemRow[] = [
  {
    id: "banana-1",
    canonicalName: "Banana",
    aliases: ["bananas"],
    servingGrams: 100,
    calories: 89,
    proteinG: 1.09,
    carbsG: 22.8,
    fatG: 0.33,
  },
  {
    id: "peanut-1",
    canonicalName: "Peanut butter",
    aliases: [],
    servingGrams: 100,
    calories: 589,
    proteinG: 24.1,
    carbsG: 21.6,
    fatG: 49.9,
  },
];

function extraction(items: ExtractionResult["items"], overrides: Partial<ExtractionResult> = {}): ExtractionResult {
  return { items, clarifications_needed: [], assumptions: [], ...overrides };
}

describe("buildMealDraft", () => {
  it("resolves a matched item and computes its totals correctly", () => {
    const draft = buildMealDraft(
      "a banana",
      extraction([{ name: "banana", quantity: 150, unit: "g", preparation_method: null, confidence: 0.9 }]),
      KB,
      { allergies: [], avoidFoods: [] }
    );
    expect(draft.items[0].status).toBe("computed");
    expect(draft.items[0].calories).toBeCloseTo(133.5, 2); // 89 * 1.5
    expect(draft.totals.calories).toBeCloseTo(133.5, 2);
    expect(draft.totals.isComplete).toBe(true);
  });

  it("marks an item not in the knowledge base as unresolved and excludes it from totals", () => {
    const draft = buildMealDraft(
      "dragonfruit",
      extraction([{ name: "dragonfruit", quantity: 100, unit: "g", preparation_method: null, confidence: 0.5 }]),
      KB,
      { allergies: [], avoidFoods: [] }
    );
    expect(draft.items[0].status).toBe("unresolved_item");
    expect(draft.totals.calories).toBe(0);
    expect(draft.totals.isComplete).toBe(false);
  });

  it("flags an item that conflicts with a stated allergy, checking both the raw and matched name", () => {
    const draft = buildMealDraft(
      "peanut butter toast",
      extraction([{ name: "peanut butter", quantity: 30, unit: "g", preparation_method: null, confidence: 0.9 }]),
      KB,
      { allergies: ["peanuts"], avoidFoods: [] }
    );
    expect(draft.items[0].conflicts).toContain("peanuts");
  });

  it("does not flag an item against an unrelated restriction", () => {
    const draft = buildMealDraft(
      "a banana",
      extraction([{ name: "banana", quantity: 100, unit: "g", preparation_method: null, confidence: 0.9 }]),
      KB,
      { allergies: ["peanuts"], avoidFoods: ["cilantro"] }
    );
    expect(draft.items[0].conflicts).toEqual([]);
  });

  it("carries clarifications and assumptions through from the extraction result unchanged", () => {
    const draft = buildMealDraft(
      "some rice",
      extraction(
        [{ name: "rice", quantity: null, unit: null, preparation_method: null, confidence: 0.4 }],
        {
          clarifications_needed: [
            { item_index: 0, field: "quantity", question: "How much rice?" },
          ],
          assumptions: ["Assumed white rice."],
        }
      ),
      KB,
      { allergies: [], avoidFoods: [] }
    );
    expect(draft.clarifications).toHaveLength(1);
    expect(draft.assumptions).toEqual(["Assumed white rice."]);
    // No quantity at all -> can't convert to grams -> unresolved_quantity,
    // and "rice" isn't in this test's KB either way -> unresolved_item.
    expect(draft.items[0].status).toBe("unresolved_item");
  });

  it("sums totals across multiple resolved items and stays isComplete when all resolve", () => {
    const draft = buildMealDraft(
      "two bananas and peanut butter",
      extraction([
        { name: "banana", quantity: 100, unit: "g", preparation_method: null, confidence: 0.9 },
        { name: "peanut butter", quantity: 30, unit: "g", preparation_method: null, confidence: 0.9 },
      ]),
      KB,
      { allergies: [], avoidFoods: [] }
    );
    // banana@100g: 89 kcal. peanut butter@30g (0.3x): 176.7 kcal.
    expect(draft.totals.calories).toBeCloseTo(89 + 176.7, 1);
    expect(draft.totals.isComplete).toBe(true);
  });
});
