const DEBUG_ENDPOINT =
  "http://127.0.0.1:7876/ingest/6e6c5bde-6579-4633-b8e0-f055b7efa2da";
const SESSION_ID = "1563f6";

/** Debug ingest only works from localhost — never call from production origins. */
export function isLocalDebugLoggingEnabled(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1";
}

export function sessionDebugLog(
  location: string,
  message: string,
  data: Record<string, unknown>,
  hypothesisId: string,
): void {
  if (!isLocalDebugLoggingEnabled()) return;

  // #region agent log
  fetch(DEBUG_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": SESSION_ID,
    },
    body: JSON.stringify({
      sessionId: SESSION_ID,
      location,
      message,
      data,
      timestamp: Date.now(),
      hypothesisId,
    }),
  }).catch(() => {});
  // #endregion
}
