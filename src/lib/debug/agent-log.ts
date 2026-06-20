const DEBUG_SESSION_ID = "1b5707";
const DEBUG_TAG = `[debug-${DEBUG_SESSION_ID}]`;

export function isLocalBrowserDebugHost(): boolean {
  return false;
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

  // Server: visible in Vercel / Hostinger runtime logs only.
  if (typeof window === "undefined") {
    console.error(DEBUG_TAG, line);
  }
}

/** Debug session logging — server logs to runtime console only. */
export function agentLog(payload: AgentLogPayload): void {
  emit({ ...payload, level: "log" });
}

/** Product-card debug session — retired (no browser ingest). */
export function cardSessionDebugLog(
  _location: string,
  _message: string,
  _data: Record<string, unknown>,
  _hypothesisId: string,
  _runId?: string,
): void {
  /* no-op */
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
