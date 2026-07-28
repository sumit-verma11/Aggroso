import { GoogleGenAI } from "@google/genai";

// gemini-2.5-flash (named in the original spec) is no longer available to
// new API keys/projects — verified directly against the API. gemini-flash-
// latest is Google's maintained alias for the current recommended flash
// model (resolves to gemini-3.6-flash as of this writing) and avoids
// hardcoding a model name that will hit the same deprecation again.
export const EXTRACTION_MODEL = "gemini-flash-latest";

let client: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set");
    }
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}
