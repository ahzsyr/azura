import { NextResponse } from "next/server";
import { loadCompareBundle } from "@/features/comparison/comparison-data-adapter";
import { getComparableContentTypeBySlug } from "@/features/comparison/comparison-registry";
import { resolveCompareContentTypeSlug } from "@/features/comparison/comparison-route-resolver";

type Params = { params: Promise<{ contentTypeSlug: string }> };

export async function GET(request: Request, { params }: Params) {
  const { contentTypeSlug: segment } = await params;
  const contentTypeSlug = resolveCompareContentTypeSlug(segment);
  const type = await getComparableContentTypeBySlug(contentTypeSlug);
  if (!type) {
    return NextResponse.json({ error: "Content type not comparable" }, { status: 404 });
  }

  const url = new URL(request.url);
  const idsParam = url.searchParams.get("ids") ?? "";
  const ids = idsParam
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, type.maxItems);

  if (ids.length === 0) {
    return NextResponse.json({ items: [], specEntries: [], contentTypeSlug });
  }

  const localePrefix = url.searchParams.get("locale") ?? "en-us";
  const mode =
    (url.searchParams.get("mode") as "all" | "differences" | "hideEqual") || "all";

  const bundle = await loadCompareBundle(contentTypeSlug, ids, localePrefix, mode);

  if (bundle.items.length !== ids.length) {
    return NextResponse.json(
      { error: "One or more items are invalid or belong to another content type" },
      { status: 400 }
    );
  }

  return NextResponse.json({ ...bundle, contentTypeSlug });
}
