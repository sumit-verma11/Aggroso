import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { parseSeedCsv } from "../seed-csv";
import { resolveFood } from "../lookup";

// Regression test against the REAL shipped data/nutrition-seed.csv, not a
// synthetic fixture — the bread bug this guards against wasn't a lookup
// algorithm defect (resolveFood worked correctly), it was a missing alias
// in the actual seed data ("White bread" had no bare "bread" alias, so a
// generic "Bread" extraction from a real meal description couldn't
// resolve). lookup.test.ts's synthetic fixtures would never catch this
// class of bug since they don't reflect the real KB's content.
const csv = readFileSync(join(process.cwd(), "data", "nutrition-seed.csv"), "utf8");
const rows = parseSeedCsv(csv).map((r, i) => ({
  id: String(i),
  canonicalName: r.canonicalName,
  aliases: r.aliases,
}));

const COMMON_GENERIC_TERMS = [
  "bread",
  "rice",
  "chicken",
  "egg",
  "milk",
  "banana",
  "tofu",
  "cheese",
  "yogurt",
  "butter",
];

describe("nutrition-seed.csv coverage of common generic food terms", () => {
  it.each(COMMON_GENERIC_TERMS)("resolves a bare, generic mention of '%s'", (term) => {
    const result = resolveFood(term, rows);
    expect(result, `expected "${term}" to resolve to some KB row`).not.toBeNull();
  });
});
