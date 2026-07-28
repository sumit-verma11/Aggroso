"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { extractMeal } from "@/lib/ai/extract";
import { getAllNutritionItems } from "@/lib/db/nutrition-items";
import { getProfile } from "@/lib/db/profiles";
import { buildMealDraft, type MealDraft } from "@/lib/meal/draft";
import { saveMeal } from "@/lib/db/meals";
import { mealTypeValues } from "@/lib/db/schema";
import { withActionLogging } from "@/lib/observability/with-action-logging";
import { logger } from "@/lib/logger";

export interface MealEntryState {
  status: "idle" | "error" | "success";
  message?: string;
  draft?: MealDraft;
}

export async function extractMealAction(
  _prevState: MealEntryState,
  formData: FormData
): Promise<MealEntryState> {
  return withActionLogging("extractMealAction", async () => {
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
  });
}

const confirmItemSchema = z.object({
  name: z.string().min(1),
  quantity: z.number(),
  unit: z.string(),
  preparationMethod: z.string().nullable(),
  nutritionItemId: z.string().nullable(),
  aiCalories: z.number(),
  calories: z.number().min(0),
  aiProteinG: z.number(),
  proteinG: z.number().min(0),
  aiCarbsG: z.number(),
  carbsG: z.number().min(0),
  aiFatG: z.number(),
  fatG: z.number().min(0),
});

const confirmMealSchema = z.object({
  rawText: z.string().min(1),
  mealType: z.enum(mealTypeValues),
  items: z.array(confirmItemSchema).min(1),
});

export type ConfirmMealInput = z.infer<typeof confirmMealSchema>;

export interface ConfirmMealResult {
  ok: boolean;
  message: string;
}

export async function confirmMealAction(
  input: ConfirmMealInput
): Promise<ConfirmMealResult> {
  return withActionLogging("confirmMealAction", async () => {
    const parsed = confirmMealSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, message: "That meal doesn't look valid. Please try again." };
    }

    const profile = await getProfile();
    if (!profile) {
      return { ok: false, message: "Please set up your profile first." };
    }

    const totals = parsed.data.items.reduce(
      (acc, i) => ({
        calories: acc.calories + i.calories,
        proteinG: acc.proteinG + i.proteinG,
        carbsG: acc.carbsG + i.carbsG,
        fatG: acc.fatG + i.fatG,
      }),
      { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 }
    );

    try {
      await saveMeal({
        profileId: profile.id,
        rawText: parsed.data.rawText,
        mealType: parsed.data.mealType,
        loggedAt: new Date(),
        totals,
        items: parsed.data.items.map((item) => ({
          nutritionItemId: item.nutritionItemId,
          rawExtractedName: item.name,
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
          wasCorrected:
            item.calories !== item.aiCalories ||
            item.proteinG !== item.aiProteinG ||
            item.carbsG !== item.aiCarbsG ||
            item.fatG !== item.aiFatG,
        })),
      });
    } catch (err) {
      logger.error({ route: "confirmMealAction", error: String(err) }, "db write failed");
      return {
        ok: false,
        message: "Something went wrong saving your meal. Please try again.",
      };
    }

    revalidatePath("/log");
    revalidatePath("/dashboard");
    return { ok: true, message: "Meal saved." };
  });
}
