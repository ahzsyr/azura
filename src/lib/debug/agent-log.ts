/** No-op debug helpers kept for any residual call sites. */

function serializeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    const prisma = error as Error & { code?: string; meta?: unknown };
    return {
      name: error.name,
      message: error.message,
      code: prisma.code ?? null,
      meta: prisma.meta ?? null,
      stack: error.stack?.split("\n").slice(0, 5) ?? null,
    };
  }
  return { raw: String(error) };
}

export function agentLog(
  _location: string,
  _message: string,
  _data: Record<string, unknown>,
  _hypothesisId: string,
): void {
  /* intentionally empty — debug ingest removed from production */
}

export { serializeError };
