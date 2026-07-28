"use server";

import { extractMeal } from "@/lib/ai/extract";
import { getAllNutritionItems } from "@/lib/db/nutrition-items";
import { getProfile } from "@/lib/db/profiles";
import { buildMealDraft, type MealDraft } from "@/lib/meal/draft";

export interface MealEntryState {
  status: "idle" | "error" | "success";
  message?: string;
  draft?: MealDraft;
}

export async function extractMealAction(
  _prevState: MealEntryState,
  formData: FormData
): Promise<MealEntryState> {
  const rawText = String(formData.get("mealText") ?? "").trim();
  if (rawText.length < 3) {
    return { status: "error", message: "Please describe what you ate." };
  }

  const profile = await getProfile();
  if (!profile) {
    return { status: "error", message: "Please set up your profile first." };
  }

  const extraction = await extractMeal(rawText);
  if (!extraction.ok) {
    return { status: "error", message: extraction.message };
  }

  if (extraction.result.items.length === 0) {
    return {
      status: "error",
      message:
        "Couldn't identify any food items in that description. Try adding more detail.",
    };
  }

  const nutritionItems = await getAllNutritionItems();
  const draft = buildMealDraft(rawText, extraction.result, nutritionItems, {
    allergies: profile.allergies,
    avoidFoods: profile.avoidFoods,
  });

  return { status: "success", draft };
}
