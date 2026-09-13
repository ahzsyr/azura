import { NextResponse } from "next/server";
import { requireAdmin } from "@/features/auth/guards";
import { createExecutionContext, seoPlatform } from "@/features/seo/platform";
import { resolveSeoDocument } from "@/features/seo/core/seo-resolver";
import { serializeYoastHead } from "@/features/seo/integrations/yoast/yoast-head.serializer";
import { resolveSiteOrigin } from "@/features/seo/resolve-site-origin";

export async function GET(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const entityType = searchParams.get("entityType");
  const entityId = searchParams.get("entityId");
  const locale = searchParams.get("locale") ?? "en";
  const urlParam = searchParams.get("url");

  if (!entityType || !entityId) {
    return NextResponse.json(
      { error: "entityType and entityId are required" },
      { status: 400 },
    );
  }

  const ctx = createExecutionContext({
    entityType,
    entityId,
    locale,
    source: "api",
    trigger: "audit",
    mode: "preview",
  });

  const snapshot = await seoPlatform.content.analyze(ctx);
  const suggestion = await seoPlatform.intelligence.generate(ctx, snapshot);
  const validation = await seoPlatform.governance.validate(ctx, { snapshot, suggestion });
  const rules = await seoPlatform.governance.evaluateRules(ctx, snapshot);
  const recommendations = seoPlatform.recommendations.build(ctx, {
    snapshot,
    validation,
    rules,
  });

  let productionDoc = null;
  let yoast = null;
  if (urlParam?.trim()) {
    productionDoc = await resolveSeoDocument({ url: urlParam.trim() });
    yoast = serializeYoastHead(productionDoc);
  } else {
    const siteOrigin = (await resolveSiteOrigin("public")).replace(/\/$/, "");
    const path = searchParams.get("path") ?? "/";
    productionDoc = await resolveSeoDocument({
      locale,
      path,
      entityType,
      entityId,
      pageKey: searchParams.get("pageKey") ?? undefined,
      slug: searchParams.get("slug") ?? undefined,
    });
    yoast = serializeYoastHead(productionDoc);
  }

  return NextResponse.json({
    correlationId: ctx.correlationId,
    snapshot,
    suggestion,
    validation,
    rules,
    recommendations,
    seo: productionDoc
      ? {
          title: productionDoc.title,
          description: productionDoc.description,
          canonical: productionDoc.canonical,
          robots: productionDoc.robots,
          openGraph: productionDoc.openGraph,
          twitter: productionDoc.twitter,
          schema: productionDoc.schema,
          indexable: productionDoc.indexable,
        }
      : null,
    yoast_head: yoast?.html,
    yoast_head_json: yoast?.json,
    yoast,
  });
}
