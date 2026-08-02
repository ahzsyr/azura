import { NextResponse } from "next/server";
import { createExecutionContext, seoPlatform } from "@/features/seo/platform";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const entityType = searchParams.get("entityType");
  const entityId = searchParams.get("entityId");
  const locale = searchParams.get("locale") ?? "en";

  if (!entityType || !entityId) {
    return NextResponse.json(
      { error: "entityType and entityId are required" },
      { status: 400 }
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

  return NextResponse.json({
    correlationId: ctx.correlationId,
    snapshot,
    suggestion,
    validation,
    rules,
    recommendations,
  });
}
