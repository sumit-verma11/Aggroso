import { runJsonWorkflow, type JsonWorkflowResult } from "./run-json-workflow";
import {
  planGenerationResultSchema,
  PLAN_RESPONSE_JSON_SCHEMA,
  type PlanGenerationResult,
} from "./plan-schema";

export type GeneratePlanResult = JsonWorkflowResult<PlanGenerationResult>;

export interface PlanProfileContext {
  calorieTarget: number;
  dietaryPreferences: string[];
  allergies: string[];
  avoidFoods: string[];
}

export interface RecentMealSummary {
  mealType: string;
  rawText: string;
}

const SYSTEM_PROMPT_HEADER = `You are a meal-planning assistant. Propose a full day's meal plan (breakfast, lunch, dinner, snack) for the user using real, ordinary foods.

Rules:
1. For each item, give: meal_slot (breakfast/lunch/dinner/snack), name, quantity, and unit. Quantity must be a number of grams (solid foods) or milliliters (liquids) — estimate a typical portion yourself, the same way you would when logging a meal.
2. NEVER include a calorie, protein, carb, or fat number — nutrition values are looked up separately from a database and totals are computed in code, not by you.
3. Do NOT propose any food that conflicts with the user's stated allergies or foods to avoid, listed below. This is a hard requirement.
4. Prefer variety from the user's recent meals rather than repeating them.
5. Add any reasoning or notes in "notes".
6. Respond with JSON only, matching the provided schema exactly.`;

function buildPrompt(
  profile: PlanProfileContext,
  recentMeals: RecentMealSummary[],
  previousError?: string
): string {
  const context = `
User's daily calorie target: ${profile.calorieTarget} kcal
Dietary preferences: ${profile.dietaryPreferences.join(", ") || "none stated"}
Allergies (must avoid): ${profile.allergies.join(", ") || "none"}
Foods to avoid (must avoid): ${profile.avoidFoods.join(", ") || "none"}
Recent meals (for variety, do not just repeat these):
${
  recentMeals.length > 0
    ? recentMeals.map((m) => `- ${m.mealType}: ${m.rawText}`).join("\n")
    : "(no recent meal history)"
}
`;

  const base = `${SYSTEM_PROMPT_HEADER}\n${context}`;
  if (!previousError) return base;
  return `${base}\n\nYour previous response was invalid: ${previousError}\nReturn ONLY valid JSON matching the schema, with no extra commentary or markdown fences.`;
}

// The model is instructed not to propose conflicting foods, but per the
// spec, that instruction is never trusted on its own — the caller
// (lib/meal-plan/build.ts) re-checks every proposed item against the
// profile's allergies/avoid-list in code, the same way meal review does.
export async function generatePlan(
  profile: PlanProfileContext,
  recentMeals: RecentMealSummary[]
): Promise<GeneratePlanResult> {
  return runJsonWorkflow({
    workflow: "plan_generation",
    schema: planGenerationResultSchema,
    jsonSchema: PLAN_RESPONSE_JSON_SCHEMA,
    buildPrompt: (previousError) => buildPrompt(profile, recentMeals, previousError),
    invalidOutputMessage:
      "The meal plan didn't come back in the expected format. Please try generating again.",
  });
}
