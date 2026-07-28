import "dotenv/config";
import { readFileSync } from "fs";
import { join } from "path";
import { db } from "../lib/db";
import { nutritionItems } from "../lib/db/schema";
import { parseSeedCsv } from "../lib/nutrition/seed-csv";

async function main() {
  const csvPath = join(process.cwd(), "data", "nutrition-seed.csv");
  const csvContent = readFileSync(csvPath, "utf8");
  const rows = parseSeedCsv(csvContent);

  console.log(`Parsed ${rows.length} valid rows from ${csvPath}`);

  await db.delete(nutritionItems);
  await db.insert(nutritionItems).values(
    rows.map((row) => ({
      canonicalName: row.canonicalName,
      aliases: row.aliases,
      servingUnit: row.servingUnit,
      servingGrams: row.servingGrams,
      calories: row.calories,
      proteinG: row.proteinG,
      carbsG: row.carbsG,
      fatG: row.fatG,
      source: row.source,
      sourceId: row.sourceId,
    }))
  );

  console.log(`Seeded ${rows.length} nutrition_items rows.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
