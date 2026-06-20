type C37cd4LogPayload = {
  location: string;
  message: string;
  data?: Record<string, unknown>;
  hypothesisId?: string;
  runId?: string;
};

/** Retired debug session — no browser ingest (prevents 127.0.0.1:7334 console noise). */
export function isC37cd4DebugEnabled(): boolean {
  return false;
}

export function c37cd4Log(_payload: C37cd4LogPayload): void {
  /* no-op */
}

export function describeUnknownError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      isDomException: error instanceof DOMException,
      stack: error.stack?.slice(0, 800),
    };
  }
  return { value: String(error) };
}
