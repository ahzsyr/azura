import { NextResponse } from "next/server";
import { discoverCatalogSearchSources } from "@/features/search-framework/discovery/catalog-search-discovery";
import { buildSearchDiscoveryPayload } from "@/features/search/discovery/build-search-discovery-payload";
import { ensureSearchRuntimeConfig } from "@/features/search/settings/search-runtime";

export async function GET() {
  const admin = await ensureSearchRuntimeConfig("en-us");
  const discovery = await discoverCatalogSearchSources();
  const payload = buildSearchDiscoveryPayload(admin, discovery, "public");

  return NextResponse.json(payload);
}
