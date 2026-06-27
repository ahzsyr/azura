import "server-only";

import { appendFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

const SESSION_ID = "faeff3";
const LOG_PATH = join(process.cwd(), ".cursor", "debug-faeff3.log");
const INGEST_URL = "http://127.0.0.1:7876/ingest/f81b0e3d-321d-4cf5-b5cc-dd5430760f2f";

export type AgentDebugPayload = {
  location: string;
  message: string;
  data?: Record<string, unknown>;
  hypothesisId?: string;
  runId?: string;
};

/** Server-side debug log: stdout (production) + local NDJSON file + optional ingest. */
export function logAgentDebug(payload: AgentDebugPayload): void {
  const entry = {
    sessionId: SESSION_ID,
    timestamp: Date.now(),
    ...payload,
  };

  console.error("[agent-debug]", JSON.stringify(entry));

  try {
    mkdirSync(dirname(LOG_PATH), { recursive: true });
    appendFileSync(LOG_PATH, `${JSON.stringify(entry)}\n`);
  } catch {
    // ignore filesystem errors on read-only deploy roots
  }

  fetch(INGEST_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": SESSION_ID },
    body: JSON.stringify(entry),
  }).catch(() => {});
}
