import { createHash } from "crypto";
import { db } from "../db";
import { logger } from "../logger";
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
  // Structured stdout line for the "ai_workflow" log stream — workflow,
  // model, latency, tokens, outcome only. The full prompt/response text
  // (which can contain user-submitted meal descriptions) goes to the
  // ai_runs table below for audit purposes, never to stdout.
  logger.info(
    {
      type: "ai_workflow",
      workflow: entry.workflow,
      model: entry.model,
      latencyMs: entry.latencyMs,
      inputTokens: entry.inputTokens,
      outputTokens: entry.outputTokens,
      status: entry.status,
    },
    "ai_workflow run"
  );

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
