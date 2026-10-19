/** Accepts CSP report-only payloads. The header is ignored unless this endpoint exists. */
export function POST() {
  return new Response(null, { status: 204 });
}
