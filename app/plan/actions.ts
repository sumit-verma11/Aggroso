"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { generatePlan } from "@/lib/ai/generate-plan";
import { getAllNutritionItems } from "@/lib/db/nutrition-items";
import { getProfile } from "@/lib/db/profiles";
import { getRecentMeals, saveApprovedPlan } from "@/lib/db/meal-plans";
import { buildPlanDraft, type PlanDraft } from "@/lib/meal-plan/build";
import { findConflicts } from "@/lib/nutrition/restrictions";
import { mealTypeValues } from "@/lib/db/schema";

export interface PlanGenerationState {
  status: "idle" | "error" | "success";
  message?: string;
  draft?: PlanDraft;
}

export async function generatePlanAction(): Promise<PlanGenerationState> {
  const profile = await getProfile();
  if (!profile) {
    return { status: "error", message: "Please set up your profile first." };
  }

  const recentMeals = await getRecentMeals(profile.id);
  const generation = await generatePlan(
    {
      calorieTarget: profile.calorieTarget,
      dietaryPreferences: profile.dietaryPreferences,
      allergies: profile.allergies,
      avoidFoods: profile.avoidFoods,
    },
    recentMeals
  );

  if (!generation.ok) {
    return { status: "error", message: generation.message };
  }

  if (generation.result.items.length === 0) {
    return {
      status: "error",
      message: "Couldn't generate a plan. Please try again.",
    };
  }

  const nutritionItems = await getAllNutritionItems();
  const draft = buildPlanDraft(
    generation.result,
    nutritionItems,
    { allergies: profile.allergies, avoidFoods: profile.avoidFoods },
    profile.calorieTarget
  );

  return { status: "success", draft };
}

const approveItemSchema = z.object({
  mealSlot: z.enum(mealTypeValues),
  name: z.string().min(1),
  quantity: z.number(),
  unit: z.string(),
  nutritionItemId: z.string().nullable(),
  calories: z.number().min(0),
  proteinG: z.number().min(0),
  carbsG: z.number().min(0),
  fatG: z.number().min(0),
  userEdited: z.boolean(),
});

const approvePlanSchema = z.object({
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  items: z.array(approveItemSchema).min(1),
});

export type ApprovePlanActionInput = z.infer<typeof approvePlanSchema>;

export interface ApprovePlanResult {
  ok: boolean;
  message: string;
}

export async function approvePlanAction(
  input: ApprovePlanActionInput
): Promise<ApprovePlanResult> {
  const parsed = approvePlanSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "That plan doesn't look valid. Please try again." };
  }

  const profile = await getProfile();
  if (!profile) {
    return { ok: false, message: "Please set up your profile first." };
  }

  // Blocking per spec: re-validate against allergies/avoid-list in code
  // before ever writing to the database, regardless of what the client
  // sent or what the model originally proposed.
  const stillConflicting = parsed.data.items.some((item) => {
    const conflicts = [
      ...findConflicts(item.name, null, profile.allergies),
      ...findConflicts(item.name, null, profile.avoidFoods),
    ];
    return conflicts.length > 0;
  });
  if (stillConflicting) {
    return {
      ok: false,
      message:
        "This plan still conflicts with an allergy or avoided food and can't be approved. Remove or edit the flagged item first.",
    };
  }

  try {
    await saveApprovedPlan({
      profileId: profile.id,
      targetDate: parsed.data.targetDate,
      items: parsed.data.items.map((item) => ({
        mealSlot: item.mealSlot,
        nutritionItemId: item.nutritionItemId,
        rawExtractedName: item.name,
        quantity: item.quantity,
        unit: item.unit,
        calories: item.calories,
        proteinG: item.proteinG,
        carbsG: item.carbsG,
        fatG: item.fatG,
        userEdited: item.userEdited,
      })),
    });
  } catch {
    return {
      ok: false,
      message: "Something went wrong saving your plan. Please try again.",
    };
  }

  revalidatePath("/plan");
  return { ok: true, message: "Meal plan approved and saved." };
}
