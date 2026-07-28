import { randomUUID } from "crypto";
import { logger } from "../logger";

/**
 * Wraps a server action body with a structured request-id/duration/status
 * log line. Next.js Server Actions have no middleware layer of their own —
 * this is the equivalent for them. Never log the action's raw arguments —
 * they can contain user-submitted meal text.
 */
export async function withActionLogging<T>(
  route: string,
  fn: () => Promise<T>
): Promise<T> {
  const requestId = randomUUID();
  const start = Date.now();
  try {
    const result = await fn();
    logger.info(
      { requestId, route, durationMs: Date.now() - start, status: "ok" },
      "action completed"
    );
    return result;
  } catch (err) {
    logger.error(
      {
        requestId,
        route,
        durationMs: Date.now() - start,
        status: "error",
        error: err instanceof Error ? err.message : String(err),
      },
      "action failed"
    );
    throw err;
  }
}
