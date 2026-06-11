const DEBUG_ENDPOINT =
  "http://127.0.0.1:7300/ingest/df4ee46a-c9a3-41ec-a748-5c05bd29eec9";
const DEBUG_SESSION_ID = "695504";
const DEBUG_TAG = `[debug-${DEBUG_SESSION_ID}]`;

type AgentLogPayload = {
  location: string;
  message: string;
  data?: Record<string, unknown>;
  hypothesisId?: string;
  runId?: string;
};

function emit(payload: AgentLogPayload & { level: "log" | "error" }): void {
  const line = JSON.stringify({
    sessionId: DEBUG_SESSION_ID,
    timestamp: Date.now(),
    ...payload,
  });

  // Server: always visible in Vercel / Hostinger runtime logs
  if (typeof window === "undefined") {
    if (payload.level === "error") {
      console.error(DEBUG_TAG, line);
    } else {
      console.error(DEBUG_TAG, line);
    }
    // #region agent log
    fetch(DEBUG_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": DEBUG_SESSION_ID,
      },
      body: line,
    }).catch(() => {});
    // #endregion
    return;
  }

  // Browser: local dev only (avoid CORS noise on Vercel/Hostinger)
  const host = window.location.hostname;
  if (host !== "localhost" && host !== "127.0.0.1") return;

  // #region agent log
  fetch(DEBUG_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": DEBUG_SESSION_ID,
    },
    body: line,
  }).catch(() => {});
  // #endregion
}

/** Debug session logging — server logs to runtime console; browser logs locally only. */
export function agentLog(payload: AgentLogPayload): void {
  emit({ ...payload, level: "log" });
}

export function agentLogError(
  location: string,
  error: unknown,
  hypothesisId: string,
  data?: Record<string, unknown>,
): void {
  const err =
    error instanceof Error
      ? { name: error.name, message: error.message, stack: error.stack?.slice(0, 500) }
      : { value: String(error) };
  emit({
    location,
    message: "error",
    hypothesisId,
    level: "error",
    data: { ...data, err },
  });
}
