import { NextResponse } from "next/server";
import { requireAdmin } from "@/features/auth/guards";
import { resolveSeoDocument } from "@/features/seo/core/seo-resolver";
import { serializeYoastHead } from "@/features/seo/integrations/yoast/yoast-head.serializer";

export async function GET(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url?.trim()) {
    return NextResponse.json({ error: "url query parameter is required" }, { status: 400 });
  }

  try {
    const doc = await resolveSeoDocument({ url: url.trim() });
    const yoast = serializeYoastHead(doc);

    return NextResponse.json({
      url: doc.url,
      status: doc.status,
      resolved: {
        entityType: doc.identity.pageType,
        entityId: doc.identity.entityId ?? doc.identity.pageKey ?? doc.identity.slug,
        locale: doc.identity.localePrefix,
      },
      metadata: {
        title: doc.title,
        description: doc.description,
        canonical: doc.canonical,
        robots: doc.robots,
        alternates: doc.alternates,
      },
      openGraph: doc.openGraph,
      twitter: doc.twitter,
      schema: doc.schema,
      indexable: doc.indexable,
      yoast,
    });
  } catch (error) {
    console.error("[api/seo/debug] failed:", error);
    return NextResponse.json({ error: "Failed to resolve SEO debug payload" }, { status: 500 });
  }
}
