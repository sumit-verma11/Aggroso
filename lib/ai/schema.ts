import { z } from "zod";

// The model extracts food identity, quantity, unit, and preparation only —
// it must never return a calorie or macro number. Calculations happen in
// lib/nutrition/calculate.ts against retrieved nutrition_items rows.
export const extractedItemSchema = z.object({
  name: z.string().min(1),
  quantity: z.number().positive().nullable(),
  unit: z.string().min(1).nullable(),
  preparation_method: z.string().nullable(),
  confidence: z.number().min(0).max(1),
});

export const clarificationSchema = z.object({
  item_index: z.number().int().min(0),
  field: z.enum(["quantity", "preparation_method"]),
  question: z.string().min(1),
});

export const extractionResultSchema = z.object({
  items: z.array(extractedItemSchema),
  clarifications_needed: z.array(clarificationSchema),
  assumptions: z.array(z.string()),
});

export type ExtractedItem = z.infer<typeof extractedItemSchema>;
export type Clarification = z.infer<typeof clarificationSchema>;
export type ExtractionResult = z.infer<typeof extractionResultSchema>;

export const EXTRACTION_RESPONSE_JSON_SCHEMA = z.toJSONSchema(
  extractionResultSchema
);
