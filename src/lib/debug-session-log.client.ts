type DebugLogPayload = {
  runId: string;
  hypothesisId: string;
  location: string;
  message: string;
  data?: Record<string, unknown>;
};

const DEBUG_BUFFER_KEY = "debug-session-451a88";
const DEBUG_BUFFER_LIMIT = 40;

function isLocalDebugHost(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1";
}

function pushDebugBuffer(payload: DebugLogPayload): void {
  if (typeof window === "undefined") return;

  try {
    const existing = sessionStorage.getItem(DEBUG_BUFFER_KEY);
    const entries: Array<DebugLogPayload & { timestamp: number }> = existing
      ? (JSON.parse(existing) as Array<DebugLogPayload & { timestamp: number }>)
      : [];
    entries.push({ ...payload, timestamp: Date.now() });
    sessionStorage.setItem(
      DEBUG_BUFFER_KEY,
      JSON.stringify(entries.slice(-DEBUG_BUFFER_LIMIT)),
    );
  } catch {
    /* ignore storage failures */
  }
}

export function readDebugSessionBuffer(): Array<DebugLogPayload & { timestamp: number }> {
  if (typeof window === "undefined") return [];

  try {
    const existing = sessionStorage.getItem(DEBUG_BUFFER_KEY);
    return existing
      ? (JSON.parse(existing) as Array<DebugLogPayload & { timestamp: number }>)
      : [];
  } catch {
    return [];
  }
}

/** Client debug logger — local ingest (dev only), API fallback, and session buffer. */
export function postDebugSessionLog(payload: DebugLogPayload): void {
  if (typeof window === "undefined") return;

  pushDebugBuffer(payload);

  if (isLocalDebugHost()) {
    const body = {
      id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      sessionId: "451a88",
      timestamp: Date.now(),
      ...payload,
    };

    // #region agent log transport
    fetch("http://127.0.0.1:7488/ingest/df527c40-4d85-418d-9e53-ef93ef205fb9", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "451a88",
      },
      body: JSON.stringify(body),
    }).catch(() => {});

    fetch("/api/debug/session-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => {});
    // #endregion
  }
}
