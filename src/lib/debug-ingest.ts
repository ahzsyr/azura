/** Debug session logging — local ingest + console (production log collectors). */
export function debugIngest(
  location: string,
  message: string,
  data: Record<string, unknown>,
  hypothesisId: string,
  runId = "pre-fix",
): void {
  const payload = {
    sessionId: "1cd6a8",
    location,
    message,
    data,
    hypothesisId,
    runId,
    timestamp: Date.now(),
  };

  // Visible in Vercel/Hostinger server logs when local ingest is unreachable.
  console.error("[debug-1cd6a8]", JSON.stringify(payload));

  // #region agent log
  fetch("http://127.0.0.1:7248/ingest/0b0335ed-bbbb-42da-af4f-1066617faf97", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "1cd6a8",
    },
    body: JSON.stringify(payload),
  }).catch(() => {});
  // #endregion
}
