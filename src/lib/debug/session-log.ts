/** Retired debug session — no browser ingest (prevents localhost ingest console noise). */
export function isLocalDebugLoggingEnabled(): boolean {
  return false;
}

export function sessionDebugLog(
  _location: string,
  _message: string,
  _data: Record<string, unknown>,
  _hypothesisId: string,
): void {
  /* no-op */
}
