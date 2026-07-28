# Nutrition Planning Assistant — Product Spec

A single-user wellness app. The user can:
- Create a profile: daily calorie target, dietary preferences, allergies, foods to avoid
- Log a meal by typing a free-text description
- Review the extracted food items, quantities, and preparation methods
- Correct any calorie or nutrition value before saving
- See today's intake against their calorie target
- Generate, edit, approve, or reject a suggested meal plan for the next day

## Stack (locked — do not substitute)
- Next.js 15 App Router, TypeScript, Tailwind
- Postgres on Neon, Drizzle ORM
- Google Gemini via `@google/genai` — see substitution note below
- Deployed on Vercel

**Substitution note:** the original spec named `gemini-2.5-flash` via
`@google/generative-ai`. Both are stale: `@google/generative-ai` hasn't been
published since April 2025 and is superseded by `@google/genai` (actively
maintained), and `gemini-2.5-flash` returns 404 "no longer available to new
users" for the API key in use. Using `gemini-flash-latest` (Google's
maintained alias for the current recommended flash model, currently
resolving to `gemini-3.6-flash`) instead — verified directly against the
API before building on it. See `lib/ai/gemini.ts`.

## Hard architectural rules (these are graded, do not violate)
- The LLM extracts and structures text. It NEVER performs arithmetic.
- All calorie and macro totals are computed in TypeScript from values retrieved
  out of the `nutrition_items` table.
- The LLM never invents a nutrition value. If a food is not in the knowledge base,
  the app surfaces it as unresolved and asks the user, rather than guessing.
- When quantity or preparation method is missing and it materially changes the
  estimate, the app asks a clarification question before saving.
- Nothing is written to meal history or plans without explicit user approval.
- The app must never provide medical diagnosis, treatment, or guaranteed outcomes.
  A persistent disclaimer appears in the UI.

Every screen needs: loading, empty, validation error, success, and failure states.

## Build modules (tracked in this session's todo list)
1. Bootstrap (this file, env/gitignore, first commit)
2. Database schema (Drizzle) + migrations
3. Nutrition knowledge base loader + lookup + tests
4. AI extraction layer (Gemini structured output + Zod + logging)
5. Deterministic calculation engine + unit tests
6. Meal logging flow (profile, entry, review/confirm screens)
7. Daily intake dashboard
8. Meal plan generation with approval gate
9. Observability, logging, hardening, secrets audit
10. README.md and AGENT_USAGE.md documentation

## Notes
- Do not reproduce the full hiring-assignment problem statement anywhere in this repo.
- lib/ai/ and lib/nutrition/calculate.ts are the critical boundary: LLM output is
  parsed/validated into structured data, and arithmetic happens only in
  calculate.ts, never inside a model call.

@AGENTS.md
