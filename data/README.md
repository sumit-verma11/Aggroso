# Nutrition knowledge base — `nutrition-seed.csv`

88 whole foods and common ingredients, retrieved from the
[USDA FoodData Central](https://fdc.nal.usda.gov/) API (SR Legacy dataset),
covering fruits, vegetables, grains/breads, proteins, dairy, fats, legumes,
nuts/seeds, and a few common staples (sugar, honey, chocolate, tea, juice).

## Columns

| column | meaning |
|---|---|
| `name` | Canonical display name used in the app |
| `aliases` | `;`-separated alternate names the lookup module matches against |
| `serving_unit` / `serving_grams` | All rows are per **100 g** — USDA SR Legacy values are reported per 100 g edible portion |
| `calories`, `protein_g`, `carbs_g`, `fat_g` | Per 100 g, taken directly from the USDA record's Energy (kcal), Protein, Total lipid (fat), and Carbohydrate-by-difference nutrients |
| `source` | Always `USDA FoodData Central (SR Legacy)` |
| `source_id` | The USDA `fdcId` for the exact record — traceable back to `https://fdc.nal.usda.gov/food-details/<source_id>/nutrients` |

## How this was built

Values were fetched programmatically from the USDA FDC `/v1/foods/search`
API (not hand-typed, not recalled from memory) and written straight into the
CSV from the JSON response. This matters for the assignment's core rule:
nutrition numbers are retrieved from a documented source, never invented.

## Known limitations (documented intentionally, not silently missing)

- **Per-100g only, no per-piece weights.** USDA's search endpoint doesn't
  return standard serving/measure data (e.g. "1 egg = 50 g"), only per-100g
  proximates. The deterministic calculation engine (`lib/nutrition/
  calculate.ts`) only converts weight/volume units (g, kg, oz, lb, ml, l) —
  it has no food-specific "1 piece = N grams" table. Household units like
  "2 eggs" or "a slice of toast" are instead converted to grams/ml by the AI
  extraction layer itself, using its own estimate of a typical reference
  weight (a portion-size estimate, not a nutrition value — the extraction
  prompt is still forbidden from returning any calorie/macro number). Every
  such conversion is surfaced to the user as an assumption on the review
  screen, and a portion the model can't reasonably estimate becomes a
  clarification question instead of a guess.
- **Single variant per food.** Where USDA has many preparations of the same
  ingredient (e.g. dozens of bread or cheese variants), one representative
  row was picked. A meal description that names a different variant (e.g.
  "low-fat mozzarella" vs. the seeded "whole milk mozzarella") will still
  resolve to the seeded row via alias matching, using its values as the
  closest documented match — not a perfect substitute.
- **~88 items, not exhaustive.** This is intentionally a *small, documented*
  knowledge base per the assignment brief, not a full food database. A food
  not in this list is surfaced as **unresolved** in the meal review screen
  rather than estimated — this is the intended fallback behavior, not a bug.
