import { NextResponse } from "next/server";
import { resolveSeoDocument } from "@/features/seo/core/seo-resolver";
import { serializeYoastHead } from "@/features/seo/integrations/yoast/yoast-head.serializer";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url?.trim()) {
    return NextResponse.json({ error: "url query parameter is required" }, { status: 400 });
  }

  try {
    const doc = await resolveSeoDocument({ url: url.trim() });
    const head = serializeYoastHead(doc);
    return NextResponse.json(head, { status: head.status === 404 ? 404 : 200 });
  } catch (error) {
    console.error("[api/seo/head] failed:", error);
    return NextResponse.json(
      { error: "Failed to resolve SEO head" },
      { status: 500 },
    );
  }
}
