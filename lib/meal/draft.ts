import { resolveFood, normalizeFoodName } from "../nutrition/lookup";
import { calculateMealTotals, type MealItemInput } from "../nutrition/calculate";
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
  const targets = [itemName, matchedName].filter(Boolean).map((n) => normalizeFoodName(n as string));
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
  const calcInputs: MealItemInput[] = extraction.items.map((item, index) => {
    const matched = resolveFood(item.name, nutritionItems);
    return {
      id: String(index),
      name: item.name,
      quantity: item.quantity ?? 0,
      unit: item.unit ?? "",
      nutritionItem: matched
        ? {
            servingGrams: matched.servingGrams,
            calories: matched.calories,
            proteinG: matched.proteinG,
            carbsG: matched.carbsG,
            fatG: matched.fatG,
          }
        : null,
    };
  });

  const totals = calculateMealTotals(calcInputs);

  const items: DraftItem[] = extraction.items.map((item, index) => {
    const matched = resolveFood(item.name, nutritionItems);
    const breakdown = totals.items[index];
    const allergyConflicts = findConflicts(item.name, matched?.canonicalName ?? null, restrictions.allergies);
    const avoidConflicts = findConflicts(item.name, matched?.canonicalName ?? null, restrictions.avoidFoods);

    return {
      index,
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      preparationMethod: item.preparation_method,
      confidence: item.confidence,
      nutritionItemId: matched?.id ?? null,
      matchedName: matched?.canonicalName ?? null,
      status: breakdown.status,
      grams: breakdown.grams,
      calories: breakdown.calories,
      proteinG: breakdown.proteinG,
      carbsG: breakdown.carbsG,
      fatG: breakdown.fatG,
      conflicts: [...allergyConflicts, ...avoidConflicts],
    };
  });

  return {
    rawText,
    items,
    clarifications: extraction.clarifications_needed,
    assumptions: extraction.assumptions,
    totals: {
      calories: totals.calories,
      proteinG: totals.proteinG,
      carbsG: totals.carbsG,
      fatG: totals.fatG,
      isComplete: totals.isComplete,
    },
  };
}
