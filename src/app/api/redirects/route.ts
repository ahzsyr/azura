import { NextRequest, NextResponse } from "next/server";
import {
  readRedirectLookupCache,
  writeRedirectLookupCache,
} from "@/features/seo/redirect-lookup-cache";
import { seoRepository } from "@/repositories/seo.repository";

export const runtime = "nodejs";

const REDIRECT_LOOKUP_TTL_MS = 60_000;

export async function GET(request: NextRequest) {
  const path = request.nextUrl.searchParams.get("path");
  let paths = readRedirectLookupCache(REDIRECT_LOOKUP_TTL_MS);
  if (!paths) {
    const rows = await seoRepository.listRedirects(true);
    paths = new Map(rows.map((r) => [r.fromPath, { toPath: r.toPath, type: r.type }]));
    writeRedirectLookupCache(paths);
  }
  if (!path) {
    return NextResponse.json({ redirects: Object.fromEntries(paths) });
  }
  const hit = paths.get(path);
  return NextResponse.json({ redirect: hit ?? null });
}
