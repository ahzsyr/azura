import { NextResponse } from "next/server";
import { syncCollections, validateSync } from "@/features/collections/collection-sync.service";
import { requireCatalogAdmin } from "@/lib/catalog-api-auth";
import { isCatalogLocale } from "@/features/catalog/locales";

export async function GET(request: Request) {
  const unauthorized = await requireCatalogAdmin();
  if (unauthorized) return unauthorized;

  try {
    const url = new URL(request.url);
    const locale = String(url.searchParams.get("locale") || "en-us").toLowerCase();
    const report = await validateSync(isCatalogLocale(locale) ? locale : "en-us");
    return NextResponse.json({ report });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Validation failed" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const unauthorized = await requireCatalogAdmin();
  if (unauthorized) return unauthorized;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      locale?: string;
      autoCreate?: boolean;
    };
    const locale = String(body.locale || "en-us").toLowerCase();
    const report = await syncCollections({
      locale: isCatalogLocale(locale) ? locale : "en-us",
      autoCreate: body.autoCreate === true,
    });
    return NextResponse.json({ report });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Sync failed" },
      { status: 500 },
    );
  }
}
