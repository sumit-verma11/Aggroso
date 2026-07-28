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
3. If you cannot reasonably estimate a gram/ml quantity for an item (the portion is genuinely ambiguous or unusual), add an entry to "clarifications_needed" asking the user for the quantity, rather than guessing wildly.
4. If preparation method is missing AND materially changes the calorie estimate (for example: fried vs. boiled vs. raw), add a clarification question rather than assuming.
5. Respond with JSON only, matching the provided schema exactly.`;

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
