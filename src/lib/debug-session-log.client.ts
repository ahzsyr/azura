type DebugLogPayload = {
  hypothesisId: string;
  location: string;
  message: string;
  runId?: string;
  data?: Record<string, unknown>;
};

const DEBUG_SESSION_ID = "80ac51";
const DEBUG_BUFFER_KEY = `debug-session-${DEBUG_SESSION_ID}`;
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

/** Client debug logger — session buffer always; API only on localhost. */
export function postDebugSessionLog(payload: DebugLogPayload): void {
  if (typeof window === "undefined") return;

  pushDebugBuffer(payload);

  if (!isLocalDebugHost()) return;

  fetch("/api/debug/session-log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(() => {});
}
