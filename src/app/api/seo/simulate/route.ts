import { NextResponse } from "next/server";
import { createExecutionContext, seoPlatform } from "@/features/seo/platform";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const currentScore = Number(searchParams.get("currentScore") ?? "60");
  const accepted = searchParams.get("accepted")?.split(",").filter(Boolean) ?? [];

  const ctx = createExecutionContext({
    entityType: searchParams.get("entityType") ?? "CmsPage",
    entityId: searchParams.get("entityId") ?? "demo",
    locale: searchParams.get("locale") ?? "en",
    source: "api",
    trigger: "audit",
    mode: "preview",
  });

  const validation = {
    score: Number.isFinite(currentScore) ? currentScore : 60,
    violations: [],
    fieldScores: {},
  };

  const recommendations = accepted.map((id) => ({
    id,
    severity: "warn" as const,
    message: `Accepted recommendation ${id}`,
    actions: ["fix"] as const,
    derivedFrom: ["validation"] as const,
  }));

  const simulation = seoPlatform.simulation.project(ctx, {
    current: validation,
    acceptedRecommendationIds: accepted,
    recommendations,
  });

  return NextResponse.json({ correlationId: ctx.correlationId, simulation });
}
