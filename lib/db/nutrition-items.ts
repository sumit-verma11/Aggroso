import { db } from "./index";
import { nutritionItems } from "./schema";
import type { LookupItem } from "../nutrition/lookup";
import type { NutritionValues } from "../nutrition/calculate";

export type NutritionItemRow = LookupItem & NutritionValues & { source: string };

export async function getAllNutritionItems(): Promise<NutritionItemRow[]> {
  const rows = await db.select().from(nutritionItems);
  return rows.map((row) => ({
    id: row.id,
    canonicalName: row.canonicalName,
    aliases: row.aliases,
    servingGrams: row.servingGrams,
    calories: row.calories,
    proteinG: row.proteinG,
    carbsG: row.carbsG,
    fatG: row.fatG,
    source: row.source,
  }));
}
