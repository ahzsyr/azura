import { appendFileSync } from "fs";
import { join } from "path";

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
  location: string,
  message: string,
  data: Record<string, unknown>,
  hypothesisId: string,
): void {
  const payload = {
    sessionId: "2ccf00",
    hypothesisId,
    location,
    message,
    data,
    timestamp: Date.now(),
  };

  // #region agent log
  fetch("http://127.0.0.1:7488/ingest/df527c40-4d85-418d-9e53-ef93ef205fb9", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "2ccf00",
    },
    body: JSON.stringify(payload),
  }).catch(() => {});

  try {
    appendFileSync(join(process.cwd(), "debug-2ccf00.log"), `${JSON.stringify(payload)}\n`);
  } catch {
    /* ignore when filesystem unavailable */
  }
  // #endregion
}

export { serializeError };
