# Agent log (scratch — not part of the submission, becomes AGENT_USAGE.md source material)

Format per entry: what happened, what was wrong, why, what I did instead.

## Module 1 — Bootstrap
- create-next-app refused to scaffold directly into `/Volumes/Projects/Aggroso` because
  the directory name "Aggroso" contains a capital letter and npm package names must be
  lowercase. Worked around by scaffolding into a temp dir with a valid name
  (`nutrition-planner`) and moving the files into place, keeping `package.json`'s
  `name` field as `nutrition-planner`.
- create-next-app's default installed Next.js 16.2.12, but the spec locks the stack to
  Next.js 15. Pinned `next` and `eslint-config-next` to `15.5.22` explicitly after
  scaffolding rather than letting the default install stand.

## Module 3 — Nutrition knowledge base
- The spec requires nutrition numbers to be retrieved from a documented source, never
  invented — including by me. So instead of writing the seed CSV from memory, I fetched
  real values from the USDA FoodData Central `/v1/foods/search` API and built the CSV
  programmatically from the JSON responses (fdcId kept as `source_id` for traceability).
- USDA's DEMO_KEY has a very low rate limit (10 req/hour observed), which wasn't enough
  to cover ~90 distinct common foods via search. The user supplied a real personal FDC
  API key mid-task (3600 req/hour) which unblocked fetching the remaining gaps (plain
  milk, rice, oats, salmon, tuna, sweet potato, lettuce, peppers, nuts, etc). The key is
  only used for this one-time offline seed-generation step — it is not used by the
  running app and was not written to any file in the repo or to .env.example.
- USDA's search endpoint doesn't return standard "1 egg = 50g" style serving/measure
  data, only per-100g proximates. Rather than inventing per-piece gram weights, the
  seed stores everything per 100g and documents this as a known limitation in
  data/README.md — the app will ask the user for a gram quantity instead of guessing.
