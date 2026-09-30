import { z } from "zod";

/** First Zod issue message for API/UI errors. */
export function zodErrorMessage(error: unknown, fallback = "Invalid request"): string {
  if (error instanceof z.ZodError) {
    const issue = error.issues[0];
    if (issue?.message) return issue.message;
  }
  if (error instanceof Error && error.message && error.name === "ZodError") {
    return error.message;
  }
  return fallback;
}
