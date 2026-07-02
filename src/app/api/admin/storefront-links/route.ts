import { NextResponse } from "next/server";
import { requireAdmin } from "@/features/auth/guards";
import { searchStorefrontLinks } from "@/features/catalog/admin/storefront-links.service";

export async function GET(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sp = new URL(request.url).searchParams;
  const locale = sp.get("locale")?.trim() || "en";
  const q = sp.get("q")?.trim() ?? "";
  const limit = Math.min(100, Math.max(1, parseInt(sp.get("limit") ?? "50", 10) || 50));

  try {
    const results = await searchStorefrontLinks({ locale, q, limit });

    // #region agent log
    fetch("http://127.0.0.1:7488/ingest/df527c40-4d85-418d-9e53-ef93ef205fb9", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "00db0b" },
      body: JSON.stringify({
        sessionId: "00db0b",
        location: "storefront-links/route.ts:GET",
        message: "storefront-links search ok",
        data: { locale, q, limit, resultCount: results.length },
        timestamp: Date.now(),
        hypothesisId: "A",
        runId: "post-fix",
      }),
    }).catch(() => {});
    // #endregion

    return NextResponse.json({ results });
  } catch (err) {
    // #region agent log
    fetch("http://127.0.0.1:7488/ingest/df527c40-4d85-418d-9e53-ef93ef205fb9", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "00db0b" },
      body: JSON.stringify({
        sessionId: "00db0b",
        location: "storefront-links/route.ts:GET",
        message: "storefront-links search error",
        data: { locale, q, error: err instanceof Error ? err.message : "unknown" },
        timestamp: Date.now(),
        hypothesisId: "C",
        runId: "post-fix",
      }),
    }).catch(() => {});
    // #endregion

    console.error("[storefront-links]", err);
    return NextResponse.json({ error: "Failed to search storefront links" }, { status: 500 });
  }
}
