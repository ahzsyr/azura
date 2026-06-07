/** Debug session logging — local ingest + console (production log collectors). */
export function debugIngest(
  location: string,
  message: string,
  data: Record<string, unknown>,
  hypothesisId: string,
  runId = "pre-fix",
): void {
  const payload = {
    sessionId: "9a6b22",
    location,
    message,
    data,
    hypothesisId,
    runId,
    timestamp: Date.now(),
  };

  // Visible in Vercel/Hostinger server logs when local ingest is unreachable.
  console.error("[debug-9a6b22]", JSON.stringify(payload));

  // #region agent log
  fetch("http://127.0.0.1:7498/ingest/1d86b498-7c2d-4481-a276-91bbb2186639", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "9a6b22",
    },
    body: JSON.stringify(payload),
  }).catch(() => {});
  // #endregion
}
