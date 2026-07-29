import { resolveFood } from "../nutrition/lookup";
import { computeItem, type NutritionValues } from "../nutrition/calculate";
import { findConflicts } from "../nutrition/restrictions";
import type { PlanGenerationResult } from "../ai/plan-schema";
import type { NutritionItemRow } from "../db/nutrition-items";

export interface PlanDraftItem {
  index: number;
  mealSlot: string;
  name: string;
  quantity: number;
  unit: string;
  nutritionItemId: string | null;
  matchedName: string | null;
  matchedSource: string | null;
  referenceNutrition: NutritionValues | null;
  status: "computed" | "unresolved_item" | "unresolved_quantity";
  grams: number | null;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  conflicts: string[];
}

export interface PlanDraft {
  items: PlanDraftItem[];
  notes: string[];
  totals: { calories: number; proteinG: number; carbsG: number; fatG: number };
  calorieTarget: number;
  gapFromTarget: number;
  hasConflicts: boolean;
}

export function buildPlanDraft(
  generation: PlanGenerationResult,
  nutritionItems: NutritionItemRow[],
  restrictions: { allergies: string[]; avoidFoods: string[] },
  calorieTarget: number
): PlanDraft {
  const items: PlanDraftItem[] = generation.items.map((item, index) => {
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
    const computed = computeItem(item.quantity, item.unit, referenceNutrition);

    return {
      index,
      mealSlot: item.meal_slot,
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      nutritionItemId: matched?.id ?? null,
      matchedName: matched?.canonicalName ?? null,
      matchedSource: matched?.source ?? null,
      referenceNutrition,
      ...computed,
      conflicts: [
        ...findConflicts(item.name, matched?.canonicalName ?? null, restrictions.allergies),
        ...findConflicts(item.name, matched?.canonicalName ?? null, restrictions.avoidFoods),
      ],
    };
  });

  const totals = items
    .filter((i) => i.status === "computed")
    .reduce(
      (acc, i) => ({
        calories: acc.calories + i.calories,
        proteinG: acc.proteinG + i.proteinG,
        carbsG: acc.carbsG + i.carbsG,
        fatG: acc.fatG + i.fatG,
      }),
      { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 }
    );

  return {
    items,
    notes: generation.notes,
    totals,
    calorieTarget,
    gapFromTarget: totals.calories - calorieTarget,
    hasConflicts: items.some((i) => i.conflicts.length > 0),
  };
}
