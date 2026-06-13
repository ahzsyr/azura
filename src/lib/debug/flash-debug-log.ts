const FLASH_DEBUG_ENDPOINT =
  "http://127.0.0.1:7300/ingest/df4ee46a-c9a3-41ec-a748-5c05bd29eec9";
const FLASH_DEBUG_SESSION = "9fed69";

type FlashDebugPayload = {
  location: string;
  message: string;
  data?: Record<string, unknown>;
  hypothesisId?: string;
  runId?: string;
};

function isLocalDebugHost(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1";
}

/** Page-flash debug session — localhost ingest only. */
export function flashDebugLog(payload: FlashDebugPayload): void {
  if (typeof window === "undefined" || !isLocalDebugHost()) return;

  const body = {
    sessionId: FLASH_DEBUG_SESSION,
    timestamp: Date.now(),
    ...payload,
  };

  // #region agent log
  fetch(FLASH_DEBUG_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": FLASH_DEBUG_SESSION,
    },
    body: JSON.stringify(body),
  }).catch(() => {});

  fetch("/api/debug/flash-probe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => {});
  // #endregion
}
