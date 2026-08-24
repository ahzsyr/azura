export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function getErrorCode(error: unknown): string | null {
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === "string" ? code : null;
  }
  return null;
}

/** Transient DB / pool / schema failures that should degrade gracefully on public pages. */
export function isRecoverableDbError(error: unknown): boolean {
  const message = getErrorMessage(error);
  const code = getErrorCode(error);

  if (
    code === "P1001" ||
    code === "P1008" ||
    code === "P1017" ||
    code === "P2021" ||
    code === "P2024" ||
    code === "ECHECKOUTTIMEOUT" ||
    code === "ECONNREFUSED" ||
    code === "ECONNRESET"
  ) {
    return true;
  }

  return (
    message.includes("ECHECKOUTTIMEOUT") ||
    message.includes("connection pool") ||
    message.includes("P1001") ||
    message.includes("P1008") ||
    message.includes("P1017") ||
    message.includes("P2021") ||
    message.includes("P2024") ||
    message.includes("Timed out fetching") ||
    message.includes("Can't reach database server") ||
    message.includes("ECONNREFUSED") ||
    message.includes("ECONNRESET") ||
    message.includes("Invalid `prisma.") ||
    message.includes("does not exist in the current database") ||
    message.includes("Server has closed the connection") ||
    message.includes("Connection terminated unexpectedly")
  );
}
