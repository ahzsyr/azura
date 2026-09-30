import { NextResponse } from "next/server";
import { seoRepository } from "@/repositories/seo.repository";

export const runtime = "nodejs";

const INDEXNOW_KEY_RE = /^[A-Za-z0-9-]{8,128}$/;

export async function GET(_request: Request, context: { params: Promise<{ key: string }> }) {
  const { key } = await context.params;
  if (!INDEXNOW_KEY_RE.test(key)) {
    return new NextResponse(null, { status: 404 });
  }

  try {
    const config = await seoRepository.getIntegrationsConfig();
    const expected = config.indexnow?.apiKey?.trim() ?? "";
    if (!expected || expected !== key) {
      return new NextResponse(null, { status: 404 });
    }
    return new NextResponse(expected, {
      status: 200,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "public, max-age=300",
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
