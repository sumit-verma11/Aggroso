import { randomUUID } from "crypto";
import { and, desc, eq, gte } from "drizzle-orm";
import { db } from "./index";
import { meals, mealPlans, mealPlanItems, nutritionItems, mealTypeValues } from "./schema";

export type MealType = (typeof mealTypeValues)[number];

export interface RecentMeal {
  mealType: MealType;
  rawText: string;
}

/** Last N days of meal history, used as context for plan generation. */
export async function getRecentMeals(
  profileId: string,
  days = 3
): Promise<RecentMeal[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const rows = await db
    .select({ mealType: meals.mealType, rawText: meals.rawText })
    .from(meals)
    .where(and(eq(meals.profileId, profileId), gte(meals.loggedAt, since)))
    .orderBy(desc(meals.loggedAt))
    .limit(10);

  return rows.map((r) => ({ mealType: r.mealType as MealType, rawText: r.rawText }));
}

export interface ApprovePlanItemInput {
  mealSlot: MealType;
  nutritionItemId: string | null;
  rawExtractedName: string;
  quantity: number;
  unit: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  userEdited: boolean;
}

export interface ApprovePlanInput {
  profileId: string;
  targetDate: string; // YYYY-MM-DD
  items: ApprovePlanItemInput[];
}

// Same neon-http batch pattern as lib/db/meals.ts's saveMeal — no
// interactive transactions available, so the plan id is generated here and
// both inserts go through db.batch() for atomicity.
export async function saveApprovedPlan(input: ApprovePlanInput) {
  const planId = randomUUID();
  const now = new Date();

  const insertPlan = db.insert(mealPlans).values({
    id: planId,
    profileId: input.profileId,
    targetDate: input.targetDate,
    status: "approved",
    generatedAt: now,
    approvedAt: now,
  });

  if (input.items.length === 0) {
    await insertPlan;
    return { id: planId };
  }

  const insertItems = db.insert(mealPlanItems).values(
    input.items.map((item) => ({
      planId,
      mealSlot: item.mealSlot,
      nutritionItemId: item.nutritionItemId,
      rawExtractedName: item.rawExtractedName,
      quantity: item.quantity,
      unit: item.unit,
      calories: item.calories,
      proteinG: item.proteinG,
      carbsG: item.carbsG,
      fatG: item.fatG,
      userEdited: item.userEdited,
    }))
  );

  await db.batch([insertPlan, insertItems]);
  return { id: planId };
}

export interface ApprovedPlanItemDetail {
  id: string;
  mealSlot: MealType;
  rawExtractedName: string;
  quantity: number;
  unit: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  userEdited: boolean;
  matchedName: string | null;
}

export interface ApprovedPlan {
  id: string;
  targetDate: string;
  approvedAt: Date | null;
  items: ApprovedPlanItemDetail[];
}

export async function getApprovedPlan(
  profileId: string,
  targetDate: string
): Promise<ApprovedPlan | null> {
  const [plan] = await db
    .select()
    .from(mealPlans)
    .where(
      and(
        eq(mealPlans.profileId, profileId),
        eq(mealPlans.targetDate, targetDate),
        eq(mealPlans.status, "approved")
      )
    )
    .orderBy(desc(mealPlans.approvedAt))
    .limit(1);

  if (!plan) return null;

  const itemRows = await db
    .select({ item: mealPlanItems, nutritionItem: nutritionItems })
    .from(mealPlanItems)
    .leftJoin(nutritionItems, eq(mealPlanItems.nutritionItemId, nutritionItems.id))
    .where(eq(mealPlanItems.planId, plan.id));

  return {
    id: plan.id,
    targetDate: plan.targetDate,
    approvedAt: plan.approvedAt,
    items: itemRows.map((row) => ({
      id: row.item.id,
      mealSlot: row.item.mealSlot as MealType,
      rawExtractedName: row.item.rawExtractedName,
      quantity: row.item.quantity,
      unit: row.item.unit,
      calories: row.item.calories,
      proteinG: row.item.proteinG,
      carbsG: row.item.carbsG,
      fatG: row.item.fatG,
      userEdited: row.item.userEdited,
      matchedName: row.nutritionItem?.canonicalName ?? null,
    })),
  };
}
