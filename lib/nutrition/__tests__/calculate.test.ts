import { describe, expect, it } from "vitest";
import { calculateMealTotals, convertToGrams, type MealItemInput } from "../calculate";

// Values below are copied from data/nutrition-seed.csv (per 100g), not
// invented — same USDA source the app itself reads from.
// Banana, raw (fdcId 173944)
const BANANA = { servingGrams: 100, calories: 89, proteinG: 1.09, carbsG: 22.8, fatG: 0.33 };
// Chicken breast, cooked, roasted (fdcId 171477)
const CHICKEN = { servingGrams: 100, calories: 165, proteinG: 31, carbsG: 0, fatG: 3.57 };

describe("convertToGrams", () => {
  it("converts grams and kilograms directly", () => {
    expect(convertToGrams(150, "g")).toBe(150);
    expect(convertToGrams(1.5, "kg")).toBe(1500);
  });

  it("converts ounces and pounds using standard factors", () => {
    expect(convertToGrams(1, "oz")).toBeCloseTo(28.3495, 4);
    expect(convertToGrams(1, "lb")).toBeCloseTo(453.592, 3);
  });

  it("converts ml and l using a 1g=1ml density approximation", () => {
    expect(convertToGrams(240, "ml")).toBe(240);
    expect(convertToGrams(1, "l")).toBe(1000);
  });

  it("is case-insensitive and trims whitespace", () => {
    expect(convertToGrams(2, " KG ")).toBe(2000);
  });

  it("returns null for a unit with no defined weight conversion", () => {
    expect(convertToGrams(1, "piece")).toBeNull();
    expect(convertToGrams(1, "cup")).toBeNull();
  });
});

describe("calculateMealTotals", () => {
  it("computes hand-checked totals for a resolved gram-based item", () => {
    const inputs: MealItemInput[] = [
      { id: "1", name: "Banana", quantity: 150, unit: "g", nutritionItem: BANANA },
    ];
    const result = calculateMealTotals(inputs);
    // 150g is 1.5x the 100g reference: 89*1.5=133.5, 1.09*1.5=1.635->1.64, 22.8*1.5=34.2, 0.33*1.5=0.495->0.5
    expect(result.calories).toBeCloseTo(133.5, 2);
    expect(result.proteinG).toBeCloseTo(1.64, 2);
    expect(result.carbsG).toBeCloseTo(34.2, 2);
    expect(result.fatG).toBeCloseTo(0.5, 2);
    expect(result.isComplete).toBe(true);
    expect(result.unresolved).toHaveLength(0);
  });

  it("sums multiple resolved items correctly", () => {
    const inputs: MealItemInput[] = [
      { id: "1", name: "Banana", quantity: 100, unit: "g", nutritionItem: BANANA },
      { id: "2", name: "Chicken", quantity: 200, unit: "g", nutritionItem: CHICKEN },
    ];
    const result = calculateMealTotals(inputs);
    // Banana@100g: 89/1.09/22.8/0.33. Chicken@200g (2x): 330/62/0/7.14
    expect(result.calories).toBeCloseTo(89 + 330, 2);
    expect(result.proteinG).toBeCloseTo(1.09 + 62, 2);
    expect(result.carbsG).toBeCloseTo(22.8 + 0, 2);
    expect(result.fatG).toBeCloseTo(0.33 + 7.14, 2);
  });

  it("marks an item not found in the knowledge base as unresolved_item and excludes it from totals", () => {
    const inputs: MealItemInput[] = [
      { id: "1", name: "Banana", quantity: 100, unit: "g", nutritionItem: BANANA },
      { id: "2", name: "Dragonfruit", quantity: 1, unit: "piece", nutritionItem: null },
    ];
    const result = calculateMealTotals(inputs);
    expect(result.calories).toBeCloseTo(89, 2);
    expect(result.unresolved).toHaveLength(1);
    expect(result.unresolved[0]).toMatchObject({ id: "2", status: "unresolved_item" });
  });

  it("marks a resolved item with an inconvertible unit as unresolved_quantity", () => {
    const inputs: MealItemInput[] = [
      { id: "1", name: "Banana", quantity: 1, unit: "piece", nutritionItem: BANANA },
    ];
    const result = calculateMealTotals(inputs);
    expect(result.calories).toBe(0);
    expect(result.unresolved).toHaveLength(1);
    expect(result.unresolved[0].status).toBe("unresolved_quantity");
  });

  it("sets isComplete to false whenever any item is unresolved — totals must not read as complete", () => {
    const inputs: MealItemInput[] = [
      { id: "1", name: "Banana", quantity: 100, unit: "g", nutritionItem: BANANA },
      { id: "2", name: "Mystery item", quantity: 1, unit: "serving", nutritionItem: null },
    ];
    const result = calculateMealTotals(inputs);
    expect(result.isComplete).toBe(false);
    // The total is only the banana's contribution — it must never silently
    // present as "the whole meal" while an item is unaccounted for.
    expect(result.calories).toBeCloseTo(89, 2);
    expect(result.unresolved).toHaveLength(1);
  });

  it("returns isComplete: true and empty unresolved for an all-resolved meal", () => {
    const inputs: MealItemInput[] = [
      { id: "1", name: "Chicken", quantity: 100, unit: "g", nutritionItem: CHICKEN },
    ];
    const result = calculateMealTotals(inputs);
    expect(result.isComplete).toBe(true);
    expect(result.unresolved).toEqual([]);
  });
});
