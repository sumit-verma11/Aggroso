// Pure, deterministic arithmetic — zero LLM involvement, zero I/O. This is
// the only place calorie/macro totals get computed. Every number here comes
// from a resolved nutrition_items row times a unit-converted quantity; there
// is no fallback path that invents a value.

export interface NutritionValues {
  servingGrams: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface MealItemInput {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  /** null when the food wasn't found in the knowledge base. */
  nutritionItem: NutritionValues | null;
}

export type ItemStatus = "computed" | "unresolved_item" | "unresolved_quantity";

export interface ItemBreakdown {
  id: string;
  name: string;
  status: ItemStatus;
  grams: number | null;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface MealTotals {
  /** Sum of only the "computed" items — never silently padded with zeros
   * for unresolved items. */
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  items: ItemBreakdown[];
  unresolved: ItemBreakdown[];
  /** False whenever any item didn't make it into the totals above — the UI
   * must not present `calories` etc. as a complete daily/meal total when
   * this is false. */
  isComplete: boolean;
}

// Standard, food-independent unit-to-gram conversion factors. Deliberately
// limited to weight units: converting "1 piece" or "1 cup" to grams needs a
// per-food reference weight our knowledge base doesn't have (documented in
// data/README.md), so those are surfaced as unresolved_quantity rather than
// guessed.
const WEIGHT_UNITS_TO_GRAMS: Record<string, number> = {
  g: 1,
  gram: 1,
  grams: 1,
  kg: 1000,
  kilogram: 1000,
  kilograms: 1000,
  oz: 28.3495,
  ounce: 28.3495,
  ounces: 28.3495,
  lb: 453.592,
  lbs: 453.592,
  pound: 453.592,
  pounds: 453.592,
};

export function convertToGrams(quantity: number, unit: string): number | null {
  const factor = WEIGHT_UNITS_TO_GRAMS[unit.trim().toLowerCase()];
  if (factor === undefined) return null;
  return quantity * factor;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function scaledValue(grams: number, item: NutritionValues, key: keyof Omit<NutritionValues, "servingGrams">): number {
  const scale = grams / item.servingGrams;
  return round2(item[key] * scale);
}

function zeroBreakdown(input: MealItemInput, status: ItemStatus, grams: number | null): ItemBreakdown {
  return {
    id: input.id,
    name: input.name,
    status,
    grams,
    calories: 0,
    proteinG: 0,
    carbsG: 0,
    fatG: 0,
  };
}

export function calculateMealTotals(inputs: MealItemInput[]): MealTotals {
  const items: ItemBreakdown[] = inputs.map((input) => {
    if (!input.nutritionItem) {
      return zeroBreakdown(input, "unresolved_item", null);
    }

    const grams = convertToGrams(input.quantity, input.unit);
    if (grams === null) {
      return zeroBreakdown(input, "unresolved_quantity", null);
    }

    const item = input.nutritionItem;
    return {
      id: input.id,
      name: input.name,
      status: "computed",
      grams,
      calories: scaledValue(grams, item, "calories"),
      proteinG: scaledValue(grams, item, "proteinG"),
      carbsG: scaledValue(grams, item, "carbsG"),
      fatG: scaledValue(grams, item, "fatG"),
    };
  });

  const computed = items.filter((i) => i.status === "computed");
  const unresolved = items.filter((i) => i.status !== "computed");

  const totals = computed.reduce(
    (acc, i) => ({
      calories: acc.calories + i.calories,
      proteinG: acc.proteinG + i.proteinG,
      carbsG: acc.carbsG + i.carbsG,
      fatG: acc.fatG + i.fatG,
    }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 }
  );

  return {
    calories: round2(totals.calories),
    proteinG: round2(totals.proteinG),
    carbsG: round2(totals.carbsG),
    fatG: round2(totals.fatG),
    items,
    unresolved,
    isComplete: unresolved.length === 0,
  };
}
