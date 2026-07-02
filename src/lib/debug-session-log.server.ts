import "server-only";

import { appendFileSync } from "node:fs";
import { join } from "node:path";

function getDebugSession(): string | null {
  const session = process.env.DEBUG_SESSION?.trim();
  return session ? session : null;
}

export function appendDebugSessionLog(payload: {
  location: string;
  message: string;
  hypothesisId?: string;
  runId?: string;
  data?: Record<string, unknown>;
}) {
  const debugSession = getDebugSession();
  if (!debugSession) return;

  try {
    const line = JSON.stringify({
      sessionId: debugSession,
      timestamp: Date.now(),
      ...payload,
    });
    appendFileSync(join(process.cwd(), `debug-${debugSession}.log`), `${line}\n`, "utf8");
  } catch {
    /* ignore logging failures */
  }
}
