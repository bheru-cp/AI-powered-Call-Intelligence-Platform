import { APIError } from "openai";

/** Human-readable message for logs and API JSON error field. */
export function formatOpenAIError(error: unknown): string {
  if (error instanceof APIError) {
    const base = error.message || "OpenAI API error";
    return error.status != null ? `${base} (HTTP ${error.status})` : base;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Unknown error";
}
