/** Only HTTP 200 responses consume the daily inspection quota. */
export function inspectionSucceeded(response: { ok: boolean; status: number } | null): boolean {
  return Boolean(response && response.ok && response.status === 200);
}
