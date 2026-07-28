import { ApiError, ThinkingLevel } from "@google/genai";
import type { ZodType } from "zod";
import { getGeminiClient, EXTRACTION_MODEL } from "./gemini";
import { recordAiRun } from "./log";
import type { aiRunWorkflowValues } from "../db/schema";

export type JsonWorkflowResult<T> =
  | { ok: true; result: T }
  | {
      ok: false;
      reason: "rate_limited" | "model_error" | "invalid_model_output";
      message: string;
    };

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

/**
 * Shared retry/validate/log pipeline for every "ask Gemini for JSON matching
 * a Zod schema" workflow (meal extraction, plan generation): call the model
 * constrained to a JSON schema, Zod-validate the response, retry once with
 * the validation error fed back on failure, log every attempt to ai_runs,
 * and turn rate-limit/network errors into a typed failure instead of a
 * thrown exception.
 */
export async function runJsonWorkflow<T>(options: {
  workflow: (typeof aiRunWorkflowValues)[number];
  schema: ZodType<T>;
  jsonSchema: unknown;
  buildPrompt: (previousError?: string) => string;
  invalidOutputMessage: string;
}): Promise<JsonWorkflowResult<T>> {
  const { workflow, schema, jsonSchema, buildPrompt, invalidOutputMessage } = options;
  const client = getGeminiClient();
  let previousError: string | undefined;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const prompt = buildPrompt(previousError);
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
          responseJsonSchema: jsonSchema,
          // MINIMAL keeps latency/cost down for straightforward structured-
          // extraction tasks — this model's default thinking budget is large
          // and mostly unnecessary here.
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
        workflow,
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
          message: "The AI service is busy right now. Please try again in a moment.",
        };
      }
      return {
        ok: false,
        reason: "model_error",
        message: "Something went wrong. Please try again.",
      };
    }

    const latencyMs = Date.now() - start;
    const parsed = tryParseJson(responseText);
    const validation = parsed ? schema.safeParse(parsed.value) : null;

    if (validation?.success) {
      await recordAiRun({
        workflow,
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
      workflow,
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
    message: invalidOutputMessage,
  };
}
