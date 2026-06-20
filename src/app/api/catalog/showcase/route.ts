import { NextResponse } from "next/server";
import { REVALIDATE } from "@/lib/config/performance";
import { resolveProductsForShowcaseTab } from "@/features/commerce-showcase/lib/resolve-product-source";

export const revalidate = 300;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const locale = url.searchParams.get("locale")?.trim() || "en";
  const taxonomy = url.searchParams.get("taxonomy")?.trim();
  const key = url.searchParams.get("key")?.trim();
  const limit = Number(url.searchParams.get("limit") ?? "8");
  const page = Number(url.searchParams.get("page") ?? "1");
  const sort = url.searchParams.get("sort")?.trim() || "name-asc";

  if (taxonomy !== "category" && taxonomy !== "brand") {
    return NextResponse.json({ error: "taxonomy must be category or brand" }, { status: 400 });
  }
  if (!key) {
    return NextResponse.json({ error: "key is required" }, { status: 400 });
  }

  try {
    const sortBy = sort as "name-asc" | "name-desc" | "price-asc" | "price-desc" | "newest";
    const { records, total } = await resolveProductsForShowcaseTab(locale, taxonomy, key, {
      limit,
      sortBy,
      page,
    });
    const per = Math.min(48, Math.max(1, limit));
    const totalPages = Math.max(1, Math.ceil(total / per));

    return NextResponse.json(
      { records, total, totalPages, page },
      {
        headers: {
          "Cache-Control": `public, s-maxage=${REVALIDATE.marketing}, stale-while-revalidate=60`,
        },
      },
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Showcase query failed" },
      { status: 500 },
    );
  }
}
