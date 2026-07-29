import { runJsonWorkflow, type JsonWorkflowResult } from "./run-json-workflow";
import {
  extractionResultSchema,
  EXTRACTION_RESPONSE_JSON_SCHEMA,
  type ExtractionResult,
} from "./schema";

export type ExtractMealResult = JsonWorkflowResult<ExtractionResult>;

const SYSTEM_PROMPT = `You are a meal-logging assistant. Extract structured food data from the user's meal description.

Rules:
1. Extract only food identity, quantity, unit, and preparation method. NEVER include a calorie, protein, carb, or fat number — nutrition values are looked up separately from a database, not estimated by you.
2. Quantity must be a number of grams (solid foods) or milliliters (liquids) — not a count of household units. Convert common-sense household portions yourself using typical reference weights (e.g. "2 large eggs" -> quantity 100, unit "g"; "a slice of toast" -> quantity 30, unit "g"; "a glass of orange juice" -> quantity 240, unit "ml"; "a medium banana" -> quantity 118, unit "g"). Record each such conversion in "assumptions" so the user can see and correct it. This is a portion-size estimate, not a nutrition value.
3. If an item carries a relative size adjective (e.g. "large", "small", "jumbo", "extra-large", "giant", "mini") and no explicit gram/ml quantity is stated anywhere in the text, do NOT guess a weight for it — these adjectives are too inconsistent across foods and users to estimate reliably. Add a "quantity" clarification asking the user for the actual weight instead. This does NOT apply to "medium" or an unqualified mention (e.g. "a banana", "a medium banana") — keep using a standard reference weight for those per rule 2.
4. If a food is stated as a bare plural with no explicit count, article, or quantity anywhere in the text (e.g. "oranges", "eggs", "bananas" used generically, as in "I had oranges and toast"), do NOT assume a default count or weight — how many is genuinely unknown. Add a "quantity" clarification asking how many/how much instead. This differs from an unqualified SINGULAR mention ("a banana", "an orange"), which implies exactly one and keeps the rule 2 standard-weight assumption.
5. If you cannot reasonably estimate a gram/ml quantity for an item for any other reason (the portion is genuinely ambiguous or unusual), add an entry to "clarifications_needed" asking the user for the quantity, rather than guessing wildly.
6. If preparation method is missing AND materially changes the calorie estimate (for example: fried vs. boiled vs. raw), add a clarification question rather than assuming.
7. Respond with JSON only, matching the provided schema exactly.`;

function buildPrompt(rawText: string, previousError?: string): string {
  if (!previousError) {
    return `${SYSTEM_PROMPT}\n\nMeal description:\n"""${rawText}"""`;
  }
  return `${SYSTEM_PROMPT}\n\nMeal description:\n"""${rawText}"""\n\nYour previous response was invalid: ${previousError}\nReturn ONLY valid JSON matching the schema, with no extra commentary or markdown fences.`;
}

export async function extractMeal(rawText: string): Promise<ExtractMealResult> {
  return runJsonWorkflow({
    workflow: "extraction",
    schema: extractionResultSchema,
    jsonSchema: EXTRACTION_RESPONSE_JSON_SCHEMA,
    buildPrompt: (previousError) => buildPrompt(rawText, previousError),
    invalidOutputMessage:
      "The extraction result didn't come back in the expected format. Please try rephrasing your meal.",
  });
}
