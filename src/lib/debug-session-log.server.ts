import "server-only";

import { appendFileSync } from "node:fs";
import { join } from "node:path";

const DEBUG_LOG_PATH = join(process.cwd(), "debug-57e90f.log");
const DEBUG_SESSION = "57e90f";

export function appendDebugSessionLog(payload: {
  location: string;
  message: string;
  hypothesisId?: string;
  runId?: string;
  data?: Record<string, unknown>;
}) {
  if (process.env.DEBUG_SESSION !== DEBUG_SESSION) return;

  try {
    const line = JSON.stringify({
      sessionId: DEBUG_SESSION,
      timestamp: Date.now(),
      ...payload,
    });
    appendFileSync(DEBUG_LOG_PATH, `${line}\n`, "utf8");
  } catch {
    /* ignore logging failures */
  }
}
