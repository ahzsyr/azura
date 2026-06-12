const DEBUG_ENDPOINT =
  "http://127.0.0.1:7876/ingest/6e6c5bde-6579-4633-b8e0-f055b7efa2da";
const DEBUG_SESSION_ID = "1b5707";
const CARD_DEBUG_SESSION_ID = "028ba6";
const DEBUG_TAG = `[debug-${DEBUG_SESSION_ID}]`;

export function isLocalBrowserDebugHost(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1";
}

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

/** Product-card debug session — browser ingest only on localhost. */
export function cardSessionDebugLog(
  location: string,
  message: string,
  data: Record<string, unknown>,
  hypothesisId: string,
  runId?: string,
): void {
  if (!isLocalBrowserDebugHost()) return;

  // #region agent log
  fetch(DEBUG_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": CARD_DEBUG_SESSION_ID,
    },
    body: JSON.stringify({
      sessionId: CARD_DEBUG_SESSION_ID,
      runId,
      location,
      message,
      data,
      hypothesisId,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
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
