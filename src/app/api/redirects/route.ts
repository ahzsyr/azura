import { NextRequest, NextResponse } from "next/server";
import { seoRepository } from "@/repositories/seo.repository";

export const runtime = "nodejs";

let cache: { paths: Map<string, { toPath: string; type: string }>; at: number } | null = null;

export async function GET(request: NextRequest) {
  const path = request.nextUrl.searchParams.get("path");
  const now = Date.now();
  if (!cache || now - cache.at > 60_000) {
    const rows = await seoRepository.listRedirects(true);
    cache = {
      paths: new Map(rows.map((r) => [r.fromPath, { toPath: r.toPath, type: r.type }])),
      at: now,
    };
  }
  if (!path) {
    return NextResponse.json({ redirects: Object.fromEntries(cache.paths) });
  }
  const hit = cache.paths.get(path);
  return NextResponse.json({ redirect: hit ?? null });
}
