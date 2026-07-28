import { describe, expect, it, vi, beforeEach } from "vitest";

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

const { generatePlan } = await import("../generate-plan");

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

describe("generatePlan", () => {
  it("returns a well-formed plan and logs it under the plan_generation workflow", async () => {
    generateContentMock.mockResolvedValueOnce(
      geminiResponse({
        items: [
          { meal_slot: "breakfast", name: "oats", quantity: 80, unit: "g" },
          { meal_slot: "lunch", name: "chicken breast", quantity: 150, unit: "g" },
        ],
        notes: ["Balanced protein across meals."],
      })
    );

    const result = await generatePlan(
      { calorieTarget: 2000, dietaryPreferences: [], allergies: [], avoidFoods: [] },
      []
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.result.items).toHaveLength(2);
    }
    expect(recordAiRunMock).toHaveBeenCalledWith(
      expect.objectContaining({ workflow: "plan_generation", status: "ok" })
    );
  });

  it("includes allergies and recent meals in the prompt sent to the model", async () => {
    generateContentMock.mockResolvedValueOnce(
      geminiResponse({ items: [], notes: [] })
    );

    await generatePlan(
      {
        calorieTarget: 1800,
        dietaryPreferences: ["vegetarian"],
        allergies: ["peanuts"],
        avoidFoods: ["cilantro"],
      },
      [{ mealType: "dinner", rawText: "grilled salmon and rice" }]
    );

    const promptSent = generateContentMock.mock.calls[0][0].contents;
    expect(promptSent).toContain("peanuts");
    expect(promptSent).toContain("cilantro");
    expect(promptSent).toContain("vegetarian");
    expect(promptSent).toContain("grilled salmon and rice");
  });

  it("fails gracefully after two malformed responses", async () => {
    generateContentMock
      .mockResolvedValueOnce({ text: "not json", usageMetadata: {} })
      .mockResolvedValueOnce({ text: "still not json", usageMetadata: {} });

    const result = await generatePlan(
      { calorieTarget: 2000, dietaryPreferences: [], allergies: [], avoidFoods: [] },
      []
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("invalid_model_output");
    }
    expect(generateContentMock).toHaveBeenCalledTimes(2);
  });
});
