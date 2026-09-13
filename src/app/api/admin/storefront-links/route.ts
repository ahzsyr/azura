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
    return NextResponse.json({ results });
  } catch (err) {
    console.error("[storefront-links]", err);
    return NextResponse.json({ error: "Failed to search storefront links" }, { status: 500 });
  }
}
