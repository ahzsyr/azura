type FlashDebugPayload = {
  location: string;
  message: string;
  data?: Record<string, unknown>;
  hypothesisId?: string;
  runId?: string;
};

/** Retired debug session — no browser ingest (prevents localhost ingest console noise). */
export function flashDebugLog(_payload: FlashDebugPayload): void {
  /* no-op */
}
