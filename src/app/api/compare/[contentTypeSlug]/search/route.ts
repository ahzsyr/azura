import { NextResponse } from "next/server";
import { searchCompareItems } from "@/features/comparison/comparison-data-adapter";
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
  const q = url.searchParams.get("q") ?? "";
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 12), 24);
  const collection = url.searchParams.get("collection") ?? undefined;
  const tags = url.searchParams.get("tags")?.split(",").map((t) => t.trim()).filter(Boolean);
  const localePrefix = url.searchParams.get("locale") ?? "en-us";

  const items = await searchCompareItems(contentTypeSlug, localePrefix, q, limit, {
    collection,
    tags,
  });

  return NextResponse.json({ items, contentTypeSlug });
}
