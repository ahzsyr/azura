import { NextResponse } from "next/server";
import { previewProductRuleMatches } from "@/features/categories/match-preview.service";
import { requireCatalogAdmin } from "@/lib/catalog-api-auth";
import { normalizeCatalogLocaleCode } from "@/features/catalog/locales";

/**
 * POST /api/categories/match-preview
 * Body: { conditions, locale?, sampleLimit?, explainEntityIdOrSlug?, scope? }
 * Currently PRODUCT scope only (Stage 2).
 */
export async function POST(request: Request) {
  const unauthorized = await requireCatalogAdmin();
  if (unauthorized) return unauthorized;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      conditions?: unknown;
      locale?: string;
      sampleLimit?: number;
      explainEntityIdOrSlug?: string;
      scope?: string;
    };

    const scope = (body.scope ?? "PRODUCT").toUpperCase();
    if (scope !== "PRODUCT") {
      return NextResponse.json(
        { error: `Match preview for scope ${scope} is not implemented yet` },
        { status: 400 }
      );
    }

    if (body.conditions == null) {
      return NextResponse.json({ error: "conditions is required" }, { status: 400 });
    }

    const locale = await normalizeCatalogLocaleCode(String(body.locale || "en-us"));
    const result = await previewProductRuleMatches({
      conditions: body.conditions,
      locale,
      sampleLimit: body.sampleLimit,
      explainEntityIdOrSlug: body.explainEntityIdOrSlug,
    });

    return NextResponse.json({ preview: result });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Match preview failed" },
      { status: 500 }
    );
  }
}
