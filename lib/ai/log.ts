import { createHash } from "crypto";
import { db } from "../db";
import { aiRuns, type aiRunStatusValues, type aiRunWorkflowValues } from "../db/schema";

export interface AiRunEntry {
  workflow: (typeof aiRunWorkflowValues)[number];
  model: string;
  prompt: string;
  rawResponse: unknown;
  latencyMs: number;
  inputTokens?: number;
  outputTokens?: number;
  status: (typeof aiRunStatusValues)[number];
  errorMessage?: string;
}

export function hashPrompt(prompt: string): string {
  return createHash("sha256").update(prompt).digest("hex").slice(0, 16);
}

export async function recordAiRun(entry: AiRunEntry): Promise<void> {
  await db.insert(aiRuns).values({
    workflow: entry.workflow,
    model: entry.model,
    promptHash: hashPrompt(entry.prompt),
    rawResponse: entry.rawResponse ?? null,
    latencyMs: entry.latencyMs,
    inputTokens: entry.inputTokens,
    outputTokens: entry.outputTokens,
    status: entry.status,
    errorMessage: entry.errorMessage,
  });
}
