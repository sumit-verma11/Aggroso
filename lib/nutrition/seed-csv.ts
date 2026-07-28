import { parse } from "csv-parse/sync";

export interface SeedRow {
  canonicalName: string;
  aliases: string[];
  servingUnit: string;
  servingGrams: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  source: string;
  sourceId: string | null;
}

const REQUIRED_COLUMNS = [
  "name",
  "aliases",
  "serving_unit",
  "serving_grams",
  "calories",
  "protein_g",
  "carbs_g",
  "fat_g",
  "source",
  "source_id",
] as const;

const NUMERIC_COLUMNS = [
  "serving_grams",
  "calories",
  "protein_g",
  "carbs_g",
  "fat_g",
] as const;

/**
 * Parses and validates the nutrition seed CSV. Throws with a specific,
 * row-numbered message on the first bad row rather than skipping it —
 * a silently dropped row is a nutrition value quietly missing later.
 */
export function parseSeedCsv(csvContent: string): SeedRow[] {
  const records: Record<string, string>[] = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  if (records.length === 0) {
    throw new Error("Seed CSV has no data rows");
  }

  const header = Object.keys(records[0]);
  for (const col of REQUIRED_COLUMNS) {
    if (!header.includes(col)) {
      throw new Error(`Seed CSV is missing required column "${col}"`);
    }
  }

  return records.map((record, index) => {
    const rowNumber = index + 2; // +1 for header, +1 for 1-indexing

    for (const col of NUMERIC_COLUMNS) {
      const raw = record[col];
      if (raw === undefined || raw === "" || Number.isNaN(Number(raw))) {
        throw new Error(
          `Seed CSV row ${rowNumber} ("${record.name}"): "${col}" is not a valid number (got "${raw}")`
        );
      }
    }

    if (!record.name || record.name.trim() === "") {
      throw new Error(`Seed CSV row ${rowNumber}: "name" is required`);
    }
    if (!record.source || record.source.trim() === "") {
      throw new Error(
        `Seed CSV row ${rowNumber} ("${record.name}"): "source" is required`
      );
    }

    return {
      canonicalName: record.name.trim(),
      aliases: record.aliases
        ? record.aliases
            .split(";")
            .map((a) => a.trim())
            .filter(Boolean)
        : [],
      servingUnit: record.serving_unit.trim(),
      servingGrams: Number(record.serving_grams),
      calories: Number(record.calories),
      proteinG: Number(record.protein_g),
      carbsG: Number(record.carbs_g),
      fatG: Number(record.fat_g),
      source: record.source.trim(),
      sourceId: record.source_id ? record.source_id.trim() : null,
    };
  });
}
