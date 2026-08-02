import type { ZodError } from "zod";

function formatZodIssues(error: ZodError): string {
  return error.issues
    .slice(0, 5)
    .map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`)
    .join("; ");
}

/**
 * Logs server render diagnostics without exposing raw user content in production.
 */
export function logServerRenderDiagnostic(context: string, error: unknown): void {
  if (process.env.NODE_ENV === "development") {
    if (error instanceof Error && "issues" in error) {
      console.error(`[server-render] ${context}:`, formatZodIssues(error as ZodError));
      return;
    }
    console.error(`[server-render] ${context}:`, error);
    return;
  }

  console.warn(`[server-render] ${context}: invalid block props (using defaults)`);
}

export function logBlockRenderFailure(
  blockId: string,
  blockType: string,
  error: unknown,
): void {
  if (process.env.NODE_ENV === "development") {
    console.error(`[BlockRenderer] block ${blockId} (${blockType}) failed:`, error);
    return;
  }

  console.warn(`[BlockRenderer] block ${blockId} (${blockType}) failed to render`);
}
