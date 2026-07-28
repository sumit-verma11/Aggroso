# Agent Usage

This project was built with Claude Code (Sonnet 5) as the primary coding
agent, working from a self-directed 10-module build plan, each module
planned, implemented, tested, and committed separately. This document
covers what the agent did, what it got wrong, and how its output was
verified — not just what the final code looks like.

## Tools used

- **Claude Code** (Sonnet 5) — all implementation, the vast majority of
  this file's content describes its work.
- **USDA FoodData Central API** — called directly (via `curl`, not through
  the agent's own knowledge) to build the real nutrition seed data. See
  [Nutrition data sourcing](#nutrition-data-sourcing-not-invented) below.
- **Playwright** (ad hoc, via `npx`, not committed to the repo) — used as
  a live browser driver to verify every interactive feature actually works
  against the real Gemini API and a real Neon database, not just to pass
  type-checking or mocked unit tests. This caught most of the real bugs
  listed below.

## Representative prompts

The project began from a pre-written 10-prompt build plan (bootstrap → DB
schema → knowledge base → AI extraction → calculation engine → meal
logging UI → dashboard → meal plan → hardening → docs), given to the agent
up front along with the rule: *"plan first, don't write code yet"* for the
architecturally significant modules. Representative examples of what was
actually said during the build, beyond the initial plan:

> "Design the Drizzle schema... I want the original AI estimate preserved
> alongside every user correction — that's a graded requirement. Explain
> your reasoning for the corrections-tracking design before writing
> anything."

> "Do not paste the assignment email into the repo... Do not let the agent
> generate these [nutrition] numbers" — the seed data had to come from a
> real API call, not the model's own recollection, even though the model
> could plausibly guess correct-looking calorie values.

> "act like a senior developer and plan carefully and do the job module
> wise" — given after the agent started on Module 1, this set the standing
> rule for the rest of the build: plan → implement → verify → commit, one
> module at a time, not a single giant undifferentiated commit.

Within each module, the agent was largely left to plan and execute
independently, with the user answering scoped questions when a real
decision was needed (see below) rather than directing implementation
details line by line.

## Decisions delegated to the agent vs. the user

The user was asked for input specifically when a decision needed either an
external credential or a genuine product trade-off the agent couldn't
resolve alone:

- Correction-tracking design: last-value-wins `ai_<field>`/`<field>` pair
  vs. a full edit-history table → user chose the simpler pair.
- Sourcing the nutrition knowledge base: agent fetches real USDA data vs.
  user supplies a file → user chose agent-fetched, live from the API.
- Neon database and Gemini API key provisioning — required the user's own
  accounts; the agent gave step-by-step instructions for creating the Neon
  project and explained why "Neon Auth" wasn't needed.
- Module 6 UI approach (three separate slices vs. one combined commit) →
  user approved the three-slice plan as proposed.
- GitHub repo and Vercel deployment strategy → user provided an existing
  (near-empty) repo and chose to connect Vercel via its dashboard rather
  than the CLI.

Everything else — schema field names, the retry/logging architecture, the
lookup-matching algorithm, UI copy, test cases — was the agent's own
implementation judgment.

## Nutrition data sourcing (not invented)

The single most important constraint in this assignment is that nutrition
numbers must be *retrieved*, never invented — and that applies to the
agent's own output just as much as the app's runtime behavior. Rather than
writing `data/nutrition-seed.csv` from training-data recollection (which
would have been fast and plausible-looking, and exactly the failure mode
the assignment is designed to catch), the agent:

1. Called the USDA FoodData Central `/v1/foods/search` API directly for
   real records, keeping each row's `fdcId` as `source_id`.
2. Discovered mid-task that the `DEMO_KEY`'s rate limit (10 req/hour) was
   too low to cover ~90 foods; the user supplied a personal FDC API key,
   which the agent used only for this one-time offline step (confirmed:
   never written to any repo file, never used by the running app).
3. Caught its own gap while writing `calculate.ts`'s tests: the seed had no
   chicken entry, and a draft test fixture had drifted to a
   plausible-but-made-up number instead of a cited source. Fetched the
   real record and rewrote the fixture before it was ever committed.

Full detail (sourcing method, exact API calls, and the specific documented
gaps in the resulting 88-item knowledge base) is in `data/README.md`.

## Real mistakes caught before/during verification

The agent's own log of what went wrong, kept live during the build
(condensed here; nothing added in hindsight):

1. **Stale static rendering.** `next build` would have prerendered `/` and
   `/profile` at build time, baking in a one-time DB read that would never
   update in production. Caught by reading the build output's `○`/`ƒ`
   route markers, not by assumption. Fixed with `export const dynamic =
   "force-dynamic"`.
2. **Form state bug, found only via a real browser.** Submitting an
   invalid profile value showed the validation error, but the input
   silently reverted to the last-saved DB value instead of showing what
   was actually typed — caused by `revalidatePath` forcing a remount that
   re-evaluates an uncontrolled input's `defaultValue`. A curl-based check
   couldn't have caught this (curl can't invoke a Server Action at all);
   it took an actual Playwright-driven form submission to see the field
   silently overwrite the user's input.
3. **Nearly every real meal would have shown 0 kcal.** Gemini returned
   natural units ("2 large", "1 slice", "1 glass") that the deterministic
   unit-conversion table couldn't parse. Found only by submitting a
   realistic multi-item meal description end-to-end against the real
   model, not by unit-testing the calculation engine in isolation (whose
   tests all used clean gram values and therefore never exercised this
   path). Fixed by having the extraction prompt itself convert household
   portions to grams/ml, disclosed as an assumption.
4. **A data-loss bug in the agent's own review-screen code**, caught
   before it ever shipped: answering a clarification's quantity field
   reused the same handler as a normal quantity edit, which would have
   silently wiped out nutrition values the user had just manually typed
   in for an unresolved item. Found while writing a combined test scenario
   (manual entry + clarification answer together) — the two individually
   would not have surfaced it.
5. **A logging library crashed the server.** pino's `pino-pretty`
   transport (added for readable dev logs) spawns a worker thread that
   doesn't survive being bundled into Next.js's server runtime —
   `uncaughtException: the worker has exited`, thrown the moment any
   server action actually ran. `next build` and the unit tests both stayed
   green throughout; only triggering a real logged action surfaced it.
   Fixed by dropping the pretty-printer and always emitting plain JSON.
6. **Meal-plan items the knowledge base actually had were coming back
   unresolved** ("Cooked Lentils" vs. the KB's plain "Lentils") because
   plan generation folds the preparation method into the food name itself,
   a pattern the lookup's existing matching tiers didn't cover. Fixed with
   one more deterministic (not fuzzy) matching tier — a fixed, explicit
   list of prep/cut words stripped before re-matching.

None of these were caught by `next build`, `tsc`, or the committed Vitest
suite alone — all six needed an actual end-to-end run against the real
Gemini API and/or a real Neon database. That's the main reason live
verification (via a headless browser, since curl cannot drive a Next.js
Server Action) was treated as mandatory for every UI-facing module before
committing it, not an optional nice-to-have.

## Rejected/overridden suggestions

- The original build plan specified `gemini-2.5-flash` via
  `@google/generative-ai`. The agent checked both directly against the
  live API/npm registry before writing any code — the model 404s for new
  API keys, and the SDK hasn't been published since April 2025 — and
  substituted `gemini-flash-latest` via the actively-maintained
  `@google/genai`, documenting the substitution in `CLAUDE.md` rather than
  silently deviating from the locked stack.
- `npm audit fix --force` was available to "resolve" all 16 reported
  vulnerabilities. Rejected: it would downgrade Next.js from 15.5.22 to
  9.3.3 and drizzle-kit to 0.18.1 — all 16 are in dev-only build tooling
  with no production runtime exposure, so the automated fix was strictly
  worse than the vulnerabilities. Documented as a reviewed decision in the
  README instead.
- `db.transaction()` was the natural first reach for the meal-save/plan-
  approve writes. Rejected after reading the driver source: neon-http has
  no interactive transactions. Used `db.batch()` with an
  application-generated id instead.

## How output was verified

- **Unit tests** (38, Vitest) for everything that's pure logic: the
  nutrition lookup/matching, CSV validation, the calculation engine, and
  both Gemini workflows (mocked client, so retry/error-handling logic is
  exercised without real API calls or cost).
- **Live, end-to-end verification** for everything that touches the real
  Gemini API or the real Neon database — driven with a headless browser
  (Playwright) rather than curl, since Server Actions require the
  framework's own request encoding. Every module from the profile screen
  onward was clicked through for real, with screenshots inspected, before
  being committed.
- **`next build` after every module** to catch type errors and confirm
  routes render with the intended static/dynamic strategy.
- **Manual hand-checked math** — e.g. verifying a saved meal's stored
  calories against the seed CSV's per-100g value times the logged gram
  quantity — rather than trusting that "tests pass" implies the numbers
  are actually right.
- **A repo-wide secrets audit** (git history + tracked files, grepped for
  the literal credential values) before considering the hardening module
  done.

See `agent-log.md` for the unedited, module-by-module version of the notes
this document was written from.
