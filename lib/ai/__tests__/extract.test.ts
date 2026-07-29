import { describe, expect, it, vi, beforeEach } from "vitest";
import { ApiError } from "@google/genai";

const generateContentMock = vi.fn();
const recordAiRunMock = vi.fn().mockResolvedValue(undefined);

vi.mock("../gemini", () => ({
  getGeminiClient: () => ({
    models: { generateContent: generateContentMock },
  }),
  EXTRACTION_MODEL: "gemini-flash-latest",
}));

vi.mock("../log", () => ({
  recordAiRun: (...args: unknown[]) => recordAiRunMock(...args),
}));

const { extractMeal } = await import("../extract");

function geminiResponse(jsonBody: unknown) {
  return {
    text: JSON.stringify(jsonBody),
    usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 20 },
  };
}

beforeEach(() => {
  generateContentMock.mockReset();
  recordAiRunMock.mockClear();
});

describe("extractMeal", () => {
  it("returns a clean extraction on a well-formed response", async () => {
    generateContentMock.mockResolvedValueOnce(
      geminiResponse({
        items: [
          {
            name: "banana",
            quantity: 1,
            unit: "piece",
            preparation_method: null,
            confidence: 0.95,
          },
        ],
        clarifications_needed: [],
        assumptions: [],
      })
    );

    const result = await extractMeal("I had a banana");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.result.items).toHaveLength(1);
      expect(result.result.items[0].name).toBe("banana");
    }
    expect(generateContentMock).toHaveBeenCalledTimes(1);
    expect(recordAiRunMock).toHaveBeenCalledWith(
      expect.objectContaining({ status: "ok", workflow: "extraction" })
    );
  });

  it("surfaces a clarification when quantity is missing", async () => {
    generateContentMock.mockResolvedValueOnce(
      geminiResponse({
        items: [
          {
            name: "rice",
            quantity: null,
            unit: null,
            preparation_method: "cooked",
            confidence: 0.6,
          },
        ],
        clarifications_needed: [
          { item_index: 0, field: "quantity", question: "How much rice did you eat?" },
        ],
        assumptions: [],
      })
    );

    const result = await extractMeal("I had some rice");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.result.clarifications_needed).toHaveLength(1);
      expect(result.result.clarifications_needed[0].field).toBe("quantity");
    }
  });

  it("surfaces a clarification when preparation method is ambiguous", async () => {
    generateContentMock.mockResolvedValueOnce(
      geminiResponse({
        items: [
          {
            name: "chicken breast",
            quantity: 200,
            unit: "g",
            preparation_method: null,
            confidence: 0.7,
          },
        ],
        clarifications_needed: [
          {
            item_index: 0,
            field: "preparation_method",
            question: "Was the chicken fried, grilled, or boiled?",
          },
        ],
        assumptions: [],
      })
    );

    const result = await extractMeal("200g of chicken breast");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.result.clarifications_needed[0].field).toBe(
        "preparation_method"
      );
    }
  });

  it("retries once on malformed JSON, then succeeds", async () => {
    generateContentMock
      .mockResolvedValueOnce({ text: "not json at all", usageMetadata: {} })
      .mockResolvedValueOnce(
        geminiResponse({
          items: [
            {
              name: "apple",
              quantity: 1,
              unit: "piece",
              preparation_method: null,
              confidence: 0.9,
            },
          ],
          clarifications_needed: [],
          assumptions: [],
        })
      );

    const result = await extractMeal("an apple");

    expect(result.ok).toBe(true);
    expect(generateContentMock).toHaveBeenCalledTimes(2);
    const secondCallArgs = generateContentMock.mock.calls[1][0];
    expect(secondCallArgs.contents).toContain("Your previous response was invalid");
    expect(recordAiRunMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ status: "retry" })
    );
    expect(recordAiRunMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ status: "ok" })
    );
  });

  it("fails gracefully after two malformed responses", async () => {
    generateContentMock
      .mockResolvedValueOnce({ text: "still not json", usageMetadata: {} })
      .mockResolvedValueOnce({ text: "also not json", usageMetadata: {} });

    const result = await extractMeal("garbled input");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("invalid_model_output");
    }
    expect(generateContentMock).toHaveBeenCalledTimes(2);
  });

  it("returns a rate-limit-specific message on a 429", async () => {
    generateContentMock.mockRejectedValueOnce(
      new ApiError({ message: "Too many requests", status: 429 })
    );

    const result = await extractMeal("a banana");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("rate_limited");
    }
    expect(generateContentMock).toHaveBeenCalledTimes(1);
  });

  it("returns a generic failure message on a non-rate-limit API error", async () => {
    generateContentMock.mockRejectedValueOnce(new Error("network exploded"));

    const result = await extractMeal("a banana");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("model_error");
    }
  });

  // Locks in the prompt-authoring decision itself, not model behavior (which
  // can't be asserted deterministically): a relative size adjective like
  // "large" must be instructed to trigger a clarification rather than a
  // guessed reference weight, while "medium"/unqualified mentions still get
  // a standard-weight estimate. See rule 2 vs rule 3 in extract.ts.
  it("instructs the model to ask for a size-adjective item's real weight rather than guess", async () => {
    generateContentMock.mockResolvedValueOnce(
      geminiResponse({ items: [], clarifications_needed: [], assumptions: [] })
    );

    await extractMeal("a large orange");

    const promptSent = generateContentMock.mock.calls[0][0].contents;
    expect(promptSent).toMatch(/relative size adjective/i);
    expect(promptSent).toMatch(/large/);
    expect(promptSent).toMatch(/does NOT apply to "medium"/i);
  });
});
