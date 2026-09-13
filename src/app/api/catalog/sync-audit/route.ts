import { NextResponse } from "next/server";
import { requireCatalogAdmin } from "@/lib/catalog-api-auth";
import { loadCatalogSyncAudit } from "@/features/catalog/admin/sync/catalog-sync-audit";

export async function GET() {
  const unauthorized = await requireCatalogAdmin();
  if (unauthorized) return unauthorized;

  try {
    const runs = await loadCatalogSyncAudit();
    return NextResponse.json({ runs });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load audit" },
      { status: 500 },
    );
  }
}
