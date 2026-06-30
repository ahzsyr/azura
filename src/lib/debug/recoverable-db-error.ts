export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Transient DB / pool failures that should degrade gracefully on public pages. */
export function isRecoverableDbError(error: unknown): boolean {
  const message = getErrorMessage(error);
  return (
    message.includes("ECHECKOUTTIMEOUT") ||
    message.includes("connection pool") ||
    message.includes("P2024") ||
    message.includes("Timed out fetching") ||
    message.includes("Can't reach database server") ||
    message.includes("ECONNREFUSED") ||
    message.includes("ECONNRESET")
  );
}
