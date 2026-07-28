import { randomUUID } from "crypto";
import { db } from "./index";
import { meals, mealItems, mealTypeValues } from "./schema";

export type MealType = (typeof mealTypeValues)[number];

export interface ConfirmMealItemInput {
  nutritionItemId: string | null;
  rawExtractedName: string;
  quantity: number;
  unit: string;
  preparationMethod: string | null;
  aiCalories: number;
  calories: number;
  aiProteinG: number;
  proteinG: number;
  aiCarbsG: number;
  carbsG: number;
  aiFatG: number;
  fatG: number;
  wasCorrected: boolean;
}

export interface ConfirmMealInput {
  profileId: string;
  rawText: string;
  mealType: MealType;
  loggedAt: Date;
  items: ConfirmMealItemInput[];
  totals: { calories: number; proteinG: number; carbsG: number; fatG: number };
}

// @neondatabase/serverless's HTTP driver has no interactive transactions
// (drizzle throws "No transactions support in neon-http driver" — the
// connection is stateless per request, there's no multi-statement session
// to hold open). db.batch() is neon-http's atomic alternative, but it sends
// every statement's values up front — so the meal id is generated here in
// application code rather than left to the database's DEFAULT, so the
// meal_items rows can reference it in the same batch instead of needing a
// round-trip to read back an auto-generated id.
export async function saveMeal(input: ConfirmMealInput) {
  const mealId = randomUUID();

  const insertMeal = db.insert(meals).values({
    id: mealId,
    profileId: input.profileId,
    rawText: input.rawText,
    mealType: input.mealType,
    loggedAt: input.loggedAt,
    status: "confirmed",
    totalCalories: input.totals.calories,
    totalProteinG: input.totals.proteinG,
    totalCarbsG: input.totals.carbsG,
    totalFatG: input.totals.fatG,
  });

  if (input.items.length === 0) {
    await insertMeal;
    return { id: mealId };
  }

  const insertItems = db.insert(mealItems).values(
    input.items.map((item) => ({
      mealId,
      nutritionItemId: item.nutritionItemId,
      rawExtractedName: item.rawExtractedName,
      quantity: item.quantity,
      unit: item.unit,
      preparationMethod: item.preparationMethod,
      aiCalories: item.aiCalories,
      calories: item.calories,
      aiProteinG: item.aiProteinG,
      proteinG: item.proteinG,
      aiCarbsG: item.aiCarbsG,
      carbsG: item.carbsG,
      aiFatG: item.aiFatG,
      fatG: item.fatG,
      wasCorrected: item.wasCorrected,
    }))
  );

  await db.batch([insertMeal, insertItems]);
  return { id: mealId };
}
