import { config } from "dotenv";
import { readFileSync } from "fs";
import { join } from "path";
import { parseSeedCsv } from "../lib/nutrition/seed-csv";

config({ path: ".env.local" });
config();

async function main() {
  // Dynamic import: lib/db throws if DATABASE_URL is unset, and static
  // imports are hoisted above the config() calls above regardless of
  // source order, so it must load after env vars are in place.
  const { db } = await import("../lib/db");
  const { nutritionItems } = await import("../lib/db/schema");

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
