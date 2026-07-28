import { resolveFood, normalizeFoodName } from "../nutrition/lookup";
import { computeItem, type NutritionValues } from "../nutrition/calculate";
import type { ExtractionResult } from "../ai/schema";
import type { NutritionItemRow } from "../db/nutrition-items";

export interface DraftItem {
  index: number;
  name: string;
  quantity: number | null;
  unit: string | null;
  preparationMethod: string | null;
  confidence: number;
  nutritionItemId: string | null;
  matchedName: string | null;
  /** Per-100g reference values for the matched food — sent to the client so
   * editing quantity/unit can recompute via the same computeItem() logic
   * without a server round-trip. Null when unresolved_item. */
  referenceNutrition: NutritionValues | null;
  status: "computed" | "unresolved_item" | "unresolved_quantity";
  grams: number | null;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  conflicts: string[];
}

export interface MealDraft {
  rawText: string;
  items: DraftItem[];
  clarifications: ExtractionResult["clarifications_needed"];
  assumptions: string[];
  totals: {
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    isComplete: boolean;
  };
}

function findConflicts(
  itemName: string,
  matchedName: string | null,
  restrictions: string[]
): string[] {
  if (restrictions.length === 0) return [];
  const targets = [itemName, matchedName]
    .filter(Boolean)
    .map((n) => normalizeFoodName(n as string));
  return restrictions.filter((restriction) => {
    const normalizedRestriction = normalizeFoodName(restriction);
    return targets.some(
      (t) => t.includes(normalizedRestriction) || normalizedRestriction.includes(t)
    );
  });
}

export function buildMealDraft(
  rawText: string,
  extraction: ExtractionResult,
  nutritionItems: NutritionItemRow[],
  restrictions: { allergies: string[]; avoidFoods: string[] }
): MealDraft {
  const items: DraftItem[] = extraction.items.map((item, index) => {
    const matched = resolveFood(item.name, nutritionItems);
    const referenceNutrition: NutritionValues | null = matched
      ? {
          servingGrams: matched.servingGrams,
          calories: matched.calories,
          proteinG: matched.proteinG,
          carbsG: matched.carbsG,
          fatG: matched.fatG,
        }
      : null;
    const computed = computeItem(item.quantity ?? 0, item.unit ?? "", referenceNutrition);

    return {
      index,
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      preparationMethod: item.preparation_method,
      confidence: item.confidence,
      nutritionItemId: matched?.id ?? null,
      matchedName: matched?.canonicalName ?? null,
      referenceNutrition,
      ...computed,
      conflicts: [
        ...findConflicts(item.name, matched?.canonicalName ?? null, restrictions.allergies),
        ...findConflicts(item.name, matched?.canonicalName ?? null, restrictions.avoidFoods),
      ],
    };
  });

  const computedItems = items.filter((i) => i.status === "computed");
  const totals = computedItems.reduce(
    (acc, i) => ({
      calories: acc.calories + i.calories,
      proteinG: acc.proteinG + i.proteinG,
      carbsG: acc.carbsG + i.carbsG,
      fatG: acc.fatG + i.fatG,
    }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 }
  );

  return {
    rawText,
    items,
    clarifications: extraction.clarifications_needed,
    assumptions: extraction.assumptions,
    totals: {
      ...totals,
      isComplete: items.every((i) => i.status === "computed"),
    },
  };
}
