/** No-op — debug ingest disabled (was causing extra fetch/process load on Hostinger). */
export function debugIngest(
  _location: string,
  _message: string,
  _data: Record<string, unknown>,
  _hypothesisId: string,
  _runId = "pre-fix",
): void {
  // intentionally empty
}
