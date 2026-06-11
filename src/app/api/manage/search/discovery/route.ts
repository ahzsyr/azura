import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { discoverCatalogSearchSources } from "@/features/search-framework/discovery/catalog-search-discovery";
import { buildSearchDiscoveryPayload } from "@/features/search/discovery/build-search-discovery-payload";
import { ensureSearchRuntimeConfig } from "@/features/search/settings/search-runtime";
import { adminLocale } from "@/features/catalog/admin/catalog-admin-config";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = await ensureSearchRuntimeConfig(adminLocale.code);
  const discovery = await discoverCatalogSearchSources();
  const payload = buildSearchDiscoveryPayload(admin, discovery, "admin");

  return NextResponse.json(payload);
}
