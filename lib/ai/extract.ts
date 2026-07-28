import { ApiError, ThinkingLevel } from "@google/genai";
import { getGeminiClient, EXTRACTION_MODEL } from "./gemini";
import { recordAiRun } from "./log";
import {
  extractionResultSchema,
  EXTRACTION_RESPONSE_JSON_SCHEMA,
  type ExtractionResult,
} from "./schema";

export type ExtractMealResult =
  | { ok: true; result: ExtractionResult }
  | {
      ok: false;
      reason: "rate_limited" | "model_error" | "invalid_model_output";
      message: string;
    };

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

function isRateLimitError(err: unknown): boolean {
  return err instanceof ApiError && err.status === 429;
}

function tryParseJson(text: string): { value: unknown } | null {
  try {
    return { value: JSON.parse(text) };
  } catch {
    return null;
  }
}

const MAX_ATTEMPTS = 2;

export async function extractMeal(rawText: string): Promise<ExtractMealResult> {
  const client = getGeminiClient();
  let previousError: string | undefined;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const prompt = buildPrompt(rawText, previousError);
    const start = Date.now();

    let responseText: string;
    let inputTokens: number | undefined;
    let outputTokens: number | undefined;

    try {
      const response = await client.models.generateContent({
        model: EXTRACTION_MODEL,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseJsonSchema: EXTRACTION_RESPONSE_JSON_SCHEMA,
          // MINIMAL keeps latency/cost down for a straightforward extraction
          // task — this model's default thinking budget is large and mostly
          // unnecessary here.
          thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
        },
      });
      responseText = response.text ?? "";
      inputTokens = response.usageMetadata?.promptTokenCount;
      outputTokens = response.usageMetadata?.candidatesTokenCount;
    } catch (err) {
      const latencyMs = Date.now() - start;
      const rateLimited = isRateLimitError(err);
      await recordAiRun({
        workflow: "extraction",
        model: EXTRACTION_MODEL,
        prompt,
        rawResponse: null,
        latencyMs,
        status: "error",
        errorMessage: rateLimited ? "rate_limited" : String(err),
      });
      if (rateLimited) {
        return {
          ok: false,
          reason: "rate_limited",
          message:
            "The meal extraction service is busy right now. Please try again in a moment.",
        };
      }
      return {
        ok: false,
        reason: "model_error",
        message: "Something went wrong extracting this meal. Please try again.",
      };
    }

    const latencyMs = Date.now() - start;
    const parsed = tryParseJson(responseText);
    const validation = parsed
      ? extractionResultSchema.safeParse(parsed.value)
      : null;

    if (validation?.success) {
      await recordAiRun({
        workflow: "extraction",
        model: EXTRACTION_MODEL,
        prompt,
        rawResponse: parsed!.value,
        latencyMs,
        inputTokens,
        outputTokens,
        status: "ok",
      });
      return { ok: true, result: validation.data };
    }

    previousError = parsed
      ? validation!.error.message
      : `response was not valid JSON: ${responseText.slice(0, 200)}`;

    const isFinalAttempt = attempt === MAX_ATTEMPTS;
    await recordAiRun({
      workflow: "extraction",
      model: EXTRACTION_MODEL,
      prompt,
      rawResponse: parsed?.value ?? responseText,
      latencyMs,
      inputTokens,
      outputTokens,
      status: isFinalAttempt ? "error" : "retry",
      errorMessage: previousError,
    });
  }

  return {
    ok: false,
    reason: "invalid_model_output",
    message:
      "The extraction result didn't come back in the expected format. Please try rephrasing your meal.",
  };
}
