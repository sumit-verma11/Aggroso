import { describe, expect, it } from "vitest";
import { parseSeedCsv } from "../seed-csv";

const HEADER =
  "name,aliases,serving_unit,serving_grams,calories,protein_g,carbs_g,fat_g,source,source_id";

describe("parseSeedCsv", () => {
  it("parses a valid row, splitting aliases on ';'", () => {
    const csv = `${HEADER}\nBanana,bananas;banana fruit,100 g,100,89,1.09,22.8,0.33,USDA FDC,173944\n`;
    const rows = parseSeedCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      canonicalName: "Banana",
      aliases: ["bananas", "banana fruit"],
      servingGrams: 100,
      calories: 89,
      proteinG: 1.09,
      carbsG: 22.8,
      fatG: 0.33,
      source: "USDA FDC",
      sourceId: "173944",
    });
  });

  it("defaults aliases to an empty array when absent", () => {
    const csv = `${HEADER}\nTomato,,100 g,100,18,0.9,3.9,0.2,USDA FDC,170457\n`;
    const rows = parseSeedCsv(csv);
    expect(rows[0].aliases).toEqual([]);
  });

  it("throws with a row-numbered message on a non-numeric nutrition value", () => {
    const csv = `${HEADER}\nBanana,bananas,100 g,100,NOT_A_NUMBER,1.09,22.8,0.33,USDA FDC,173944\n`;
    expect(() => parseSeedCsv(csv)).toThrowError(/row 2.*"calories"/);
  });

  it("throws when a required column is missing from the header", () => {
    const csv = "name,aliases,serving_unit,serving_grams,calories,protein_g,carbs_g,fat_g,source\nBanana,,100 g,100,89,1.09,22.8,0.33,USDA FDC\n";
    expect(() => parseSeedCsv(csv)).toThrowError(/missing required column "source_id"/);
  });

  it("throws on a row with an empty name", () => {
    const csv = `${HEADER}\n,,100 g,100,89,1.09,22.8,0.33,USDA FDC,173944\n`;
    expect(() => parseSeedCsv(csv)).toThrowError(/"name" is required/);
  });
});
