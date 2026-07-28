import pino from "pino";

// Plain JSON logs always — this is the actual requirement (structured,
// machine-parseable lines Vercel's log viewer can filter on), and it's also
// the safer choice here: pino's pretty-print transport spawns a worker
// thread, which crashed outright ("uncaughtException: the worker has
// exited") once bundled inside Next.js's dev/server runtime. Found by
// actually triggering a logged action, not by assumption.
//
// Never pass API keys, passwords, or full user-submitted prompt/response
// text through this — see lib/ai/log.ts for where that boundary is drawn
// (full prompt/response goes to the ai_runs table for audit purposes, not
// to stdout).
export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  redact: {
    paths: ["*.apiKey", "*.password", "*.DATABASE_URL", "*.GEMINI_API_KEY"],
    censor: "[REDACTED]",
  },
});
