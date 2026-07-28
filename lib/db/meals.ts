import { randomUUID } from "crypto";
import { and, asc, eq, gte, inArray, lte } from "drizzle-orm";
import { db } from "./index";
import { meals, mealItems, nutritionItems, mealTypeValues } from "./schema";

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

export interface MealItemDetail {
  id: string;
  rawExtractedName: string;
  quantity: number;
  unit: string;
  preparationMethod: string | null;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  wasCorrected: boolean;
  matchedName: string | null;
  source: string | null;
}

export interface MealWithItems {
  id: string;
  mealType: MealType;
  loggedAt: Date;
  rawText: string;
  totalCalories: number;
  totalProteinG: number;
  totalCarbsG: number;
  totalFatG: number;
  items: MealItemDetail[];
}

// Reads back only the values stored at confirm time — nothing here is
// recomputed or re-queried against the AI. Date is treated as a UTC
// calendar day since the profile has no stored timezone.
export async function getMealsForDate(
  profileId: string,
  date: string
): Promise<MealWithItems[]> {
  const dayStart = new Date(`${date}T00:00:00.000Z`);
  const dayEnd = new Date(`${date}T23:59:59.999Z`);

  const mealRows = await db
    .select()
    .from(meals)
    .where(
      and(
        eq(meals.profileId, profileId),
        gte(meals.loggedAt, dayStart),
        lte(meals.loggedAt, dayEnd)
      )
    )
    .orderBy(asc(meals.loggedAt));

  if (mealRows.length === 0) return [];

  const mealIds = mealRows.map((m) => m.id);
  const itemRows = await db
    .select({ item: mealItems, nutritionItem: nutritionItems })
    .from(mealItems)
    .leftJoin(nutritionItems, eq(mealItems.nutritionItemId, nutritionItems.id))
    .where(inArray(mealItems.mealId, mealIds));

  return mealRows.map((meal) => ({
    id: meal.id,
    mealType: meal.mealType as MealType,
    loggedAt: meal.loggedAt,
    rawText: meal.rawText,
    totalCalories: meal.totalCalories,
    totalProteinG: meal.totalProteinG,
    totalCarbsG: meal.totalCarbsG,
    totalFatG: meal.totalFatG,
    items: itemRows
      .filter((row) => row.item.mealId === meal.id)
      .map((row) => ({
        id: row.item.id,
        rawExtractedName: row.item.rawExtractedName,
        quantity: row.item.quantity,
        unit: row.item.unit,
        preparationMethod: row.item.preparationMethod,
        calories: row.item.calories,
        proteinG: row.item.proteinG,
        carbsG: row.item.carbsG,
        fatG: row.item.fatG,
        wasCorrected: row.item.wasCorrected,
        matchedName: row.nutritionItem?.canonicalName ?? null,
        source: row.nutritionItem?.source ?? null,
      })),
  }));
}
