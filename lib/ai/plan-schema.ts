import { z } from "zod";
import { mealTypeValues } from "../db/schema";

// Same rule as meal extraction: the model proposes food identity and a
// portion estimate only. It never returns a calorie or macro number —
// those come from the knowledge base and are computed in code.
export const planItemSchema = z.object({
  meal_slot: z.enum(mealTypeValues),
  name: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.string().min(1),
});

export const planGenerationResultSchema = z.object({
  items: z.array(planItemSchema),
  notes: z.array(z.string()),
});

export type PlanItem = z.infer<typeof planItemSchema>;
export type PlanGenerationResult = z.infer<typeof planGenerationResultSchema>;

export const PLAN_RESPONSE_JSON_SCHEMA = z.toJSONSchema(planGenerationResultSchema);
