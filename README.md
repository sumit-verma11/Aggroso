# Nutrition Planning Assistant

A single-user wellness app: log meals in plain text, review the AI-extracted
food items against a real nutrition database before saving, track daily
intake against a calorie target, and generate/approve a next-day meal plan.

**Live app:** _TODO — fill in after Vercel deployment_
**Repo:** https://github.com/sumit-verma11/Aggroso

> This app estimates nutrition information for planning purposes only. It is
> not medical advice, diagnosis, or treatment, and does not guarantee any
> health outcome.

## Architecture at a glance

```
User types meal text
      │
      ▼
lib/ai/extract.ts ──────────► Gemini (gemini-flash-latest)
      │  Zod-validated JSON: food identity + quantity/unit estimate only.
      │  NEVER returns a calorie/macro number.
      ▼
lib/nutrition/lookup.ts ────► resolves each item against nutrition_items
      │  (deterministic exact/alias/normalized/descriptor-strip matching —
      │   no fuzzy/edit-distance matching; a genuine miss stays unresolved)
      ▼
lib/nutrition/calculate.ts ─► computeItem() — the ONLY place arithmetic
      │  happens. Pure functions, zero I/O, zero LLM involvement.
      ▼
Editable review screen ─────► user corrects/approves ─► meals + meal_items
                                                          (Postgres/Neon)
```

The same extract → lookup → calculate → review/approve → persist pipeline
is reused for meal-plan generation (`lib/ai/generate-plan.ts` →
`lib/meal-plan/build.ts` → `app/plan`). **The model never performs
arithmetic in either workflow** — it identifies foods and estimates
portions; every calorie/macro number is looked up from `nutrition_items`
and computed in plain TypeScript.

## Stack

- **Next.js 15** (App Router), TypeScript, Tailwind
- **Postgres on Neon**, Drizzle ORM (`@neondatabase/serverless`, HTTP driver)
- **Google Gemini** via `@google/genai`, model `gemini-flash-latest` — see
  [Substitutions](#substitutions-from-the-original-spec) for why, not
  `@google/generative-ai` / `gemini-2.5-flash` as originally spec'd
- **Vitest** for tests, Playwright (ad hoc, not committed) for live
  browser verification during development
- **pino** for structured JSON logs
- Deployed on **Vercel**

## Setup

### 1. Prerequisites

- Node.js 20+
- A [Neon](https://console.neon.tech) Postgres project (free tier is fine)
- A [Google AI Studio](https://aistudio.google.com/apikey) Gemini API key

### 2. Install and configure

```bash
npm install
cp .env.example .env.local
# fill in DATABASE_URL and GEMINI_API_KEY in .env.local
```

### 3. Set up the database

```bash
npm run db:migrate   # applies drizzle/0000_*.sql to your Neon database
npm run db:seed      # loads data/nutrition-seed.csv into nutrition_items
```

### 4. Run

```bash
npm run dev          # http://localhost:3000
npm test             # run the test suite (38 tests)
npm run build        # production build
```

First run: the app redirects `/` → `/profile` until a profile exists, then
`/` → `/log`.

## What's implemented

| Requirement | Where |
|---|---|
| Profile (calorie target, preferences, allergies, avoid-list) | `app/profile` |
| Log a meal in free text | `app/log` — `MealEntryForm` |
| Review extracted items, quantities, preparation methods | `app/log` — `MealReview` |
| Correct calorie/nutrition estimates before saving | `MealReview`'s editable macro fields; `ai_<field>`/`<field>` pair + `wasCorrected` on `meal_items` |
| Daily intake vs. calorie target | `app/dashboard` |
| Generate + review a next-day meal plan | `app/plan` |
| Edit, approve, or reject the generated plan | `app/plan/PlanGenerator` |
| Extract structured food data from free text | `lib/ai/extract.ts` |
| Ask a clarification question when quantity/prep is missing and matters | Extraction prompt rule 3/4; required inputs in `MealReview` before Confirm |
| Retrieve nutrition from a documented knowledge base, not invented | `data/nutrition-seed.csv` (real USDA FoodData Central values) + `lib/nutrition/lookup.ts` |
| Show assumptions/uncertainty | `assumptions` array rendered per meal/plan; unresolved items visibly flagged, never silently zeroed into a "complete" total (`isComplete` flag) |
| Meal plan follows saved preferences/restrictions | Profile allergies/avoid-list passed into the generation prompt **and** independently re-checked in code on approve (never trusted from the model alone) |
| No medical diagnosis/treatment/guaranteed outcomes | Behavioral, not a UI banner: no screen, prompt, or generated copy makes a diagnosis, prescribes treatment, or guarantees an outcome — see note below |
| Preserve meal history, corrections, approved plans | Append-only `meals`/`meal_items`/`meal_plans`/`meal_plan_items`; nothing is ever overwritten, only new rows added |
| Loading / empty / validation / success / failure states | Every route has a `loading.tsx`; forms show inline validation errors, success/failure messages; dashboard has an explicit empty state |
| Structured app + AI-workflow logs | `lib/logger.ts` (pino JSON) + `lib/observability/with-action-logging.ts` per server action; `ai_runs` table + a separate `ai_workflow` log line per model call |
| Tests for important behavior | 38 Vitest tests — see [Tests](#tests) |
| Health check | `GET /api/health` — verifies real DB connectivity |
| Deployed application | Vercel — see link above |

## Intentionally out of scope

Documented here rather than left unexplained:

- **No authentication / multi-user support.** The spec describes a
  single-user app; `lib/db/profiles.ts` treats the earliest-created
  `profiles` row as "the" profile. Adding real auth would be the first
  thing to build for a multi-user version.
- **No editing/deleting a meal or plan after it's saved.** History is
  append-only by design (the spec asks to "preserve meal history" and
  "previously approved plans"), so there's no delete/undo UI. A correction
  workflow would need a new "amend" concept, which felt like scope
  creep for this pass.
- **No dedicated "swap food" UI for meal plans.** "Swap" is implemented as
  edit-the-name-field-in-place (which re-resolves against the knowledge
  base live) plus remove/add-item buttons, rather than a search-and-pick
  interface. Functionally equivalent, less UI surface.
- **No fuzzy/typo-tolerant food matching.** `lib/nutrition/lookup.ts` does
  exact → alias → normalized-plural → descriptor-word-stripped matching,
  deliberately not edit-distance/fuzzy matching — a genuine miss should
  stay visible, not get silently guessed at. See
  [Known limitations](#known-limitations) for what this means in practice.
- **No email/push notifications, no data export, no offline support.**
  Not asked for; would be straightforward additions on top of the existing
  data model.
- **No persistent disclaimer banner in the UI.** The assignment's actual
  constraint is behavioral — "the application must not provide medical
  diagnosis, treatment, or guaranteed health outcomes" — not a literal
  requirement to display a banner. An earlier version of this app included
  one; it was deliberately removed as a UI decision. Nothing in the app's
  prompts, generated copy, or screens makes a diagnosis, prescribes
  treatment, or promises an outcome, which is the actual requirement.

## Tests

```bash
npm test
```

38 tests across 5 files:

| File | Covers |
|---|---|
| `lib/nutrition/__tests__/lookup.test.ts` | Exact/alias/case/plural/descriptor-strip matching; genuine misses return `null` |
| `lib/nutrition/__tests__/seed-csv.test.ts` | CSV validation fails loudly (row-numbered errors) on missing columns/non-numeric values, never silently skips a bad row |
| `lib/nutrition/__tests__/calculate.test.ts` | Hand-checked unit conversion and totals math; unresolved items excluded from totals and flagged via `isComplete: false`, never silently zero-padded |
| `lib/ai/__tests__/extract.test.ts` | Mocked-Gemini coverage: clean extraction, missing-quantity clarification, ambiguous-preparation clarification, retry-then-succeed on malformed JSON, fail-after-two-attempts, rate limit, generic API error |
| `lib/ai/__tests__/generate-plan.test.ts` | Plan generation happy path, prompt includes allergies/avoid-list/recent meals, fails gracefully on malformed output |

Everything DB/network-dependent (Drizzle queries, Server Actions, the
actual meal-logging/plan-approval flows) was verified by hand against a
real Neon database and the real Gemini API during development — driven
with a headless browser (Playwright, run ad hoc, not part of the committed
suite) rather than curl, since Server Actions can't be invoked with a raw
HTTP request. `AGENT_USAGE.md` has the detail on what that caught.

## Known limitations

- **Nutrition knowledge base is 88 items**, not exhaustive, by design (the
  brief asks for a "small, documented" KB, not a full food database). See
  `data/README.md` for the full list, sourcing method, and specific
  documented gaps (e.g. no per-piece reference weights, single variant per
  food). A food outside these 88 items is surfaced as **unresolved** in the
  review screen — this is the intended fallback, not a bug.
- **Portion-size estimation is delegated to the model.** Since the
  knowledge base has no per-food "1 egg = 50g" reference weights, the
  extraction/plan-generation prompts instruct Gemini to convert household
  units ("2 eggs", "a glass of juice") to grams/ml itself, surfaced as an
  assumption. This is a portion-size estimate, not a nutrition value — the
  model still never returns a calorie/macro number — but it does mean two
  different runs could estimate a slightly different gram weight for "a
  banana."
- **Re-running `db:seed` breaks historical source citations.** It deletes
  and reinserts all of `nutrition_items`; `meal_items.nutritionItemId` is
  `ON DELETE SET NULL`, so a meal logged before a reseed loses its
  "source: ..." citation link (its stored calorie/macro values are
  unaffected — those are frozen at confirm time). Only matters if you
  reseed against a database that already has meal history.
- **`npm audit` reports 16 vulnerabilities**, all in dev-only build tooling
  (eslint's `minimatch`, `drizzle-kit`'s bundled esbuild dev server,
  Next's bundled `postcss`/`sharp`) — none reachable from the deployed
  production runtime. The automated fix would downgrade Next 15→9 and
  drizzle-kit to 0.18, which is worse than the advisories. Reviewed and
  left as-is intentionally.
- **Single representative variant per food.** Where USDA has many
  preparations of an ingredient (e.g. dozens of bread/cheese variants),
  one was picked for the seed. A different variant named in a meal will
  still resolve to the seeded row via alias matching, using its values as
  the closest documented match, not a perfect substitute.

## Substitutions from the original spec

Both discovered by checking directly against the live API/registry before
writing code, not assumed:

- **`@google/generative-ai` → `@google/genai`.** The former hasn't been
  published since April 2025; the latter is Google's actively maintained
  SDK.
- **`gemini-2.5-flash` → `gemini-flash-latest`.** The named model returns a
  live 404 ("no longer available to new users") for a fresh API key.
  `gemini-flash-latest` is Google's maintained alias for the current
  recommended flash model (currently resolves to `gemini-3.6-flash`).

## Deployment

Deployed on Vercel, connected to the `main` branch of this repo. Required
environment variables (set in the Vercel project settings, same names as
`.env.example`):

- `DATABASE_URL` — Neon Postgres connection string
- `GEMINI_API_KEY` — Google AI Studio API key

The database schema and nutrition knowledge base must be provisioned once
against the production database before first use:

```bash
DATABASE_URL="<production connection string>" npm run db:migrate
DATABASE_URL="<production connection string>" npm run db:seed
```

## Repository layout

```
app/                  Routes (App Router) — profile, log, dashboard, plan
lib/ai/               Gemini client, extraction + plan-generation workflows
lib/nutrition/        Lookup, deterministic calculation, restriction checks
lib/meal/, lib/meal-plan/   Draft-building (resolve + compute + conflict-check)
lib/db/               Drizzle schema and query modules
data/                 Nutrition knowledge base (CSV) + its own README
scripts/              One-off seed script
drizzle/              Generated SQL migration
```

See `CLAUDE.md` for the original product spec and architectural rules this
was built against, and `AGENT_USAGE.md` for how AI coding agents were used
to build it.
