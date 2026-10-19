/** Browser probes (Chrome DevTools) must not fall through to the marketing locale routes. */
export function GET() {
  return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
}
