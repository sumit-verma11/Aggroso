import { z } from "zod";

export const profileFormSchema = z.object({
  calorieTarget: z.coerce
    .number()
    .int("Calorie target must be a whole number")
    .min(800, "Calorie target must be at least 800")
    .max(10000, "Calorie target must be at most 10,000"),
  dietaryPreferences: z.string().optional().default(""),
  allergies: z.string().optional().default(""),
  avoidFoods: z.string().optional().default(""),
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;

export function splitList(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
