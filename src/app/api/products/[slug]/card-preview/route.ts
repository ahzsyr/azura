import { NextResponse } from "next/server";
import { prefixToCatalogLocaleCode } from "@/features/catalog/locales";
import { readSiteSettings } from "@/features/catalog/site-settings.service";
import { resolveCardDisplayByViewport } from "@/features/products/lib/product-card-display";
import { queryListingRecordsByIdentifiers } from "@/features/products/listing/query-listing";

type Params = { params: Promise<{ slug: string }> };

export async function GET(request: Request, { params }: Params) {
  const { slug } = await params;
  const url = new URL(request.url);
  const locale = url.searchParams.get("locale")?.trim() || "en";

  try {
    const records = await queryListingRecordsByIdentifiers(locale, [{ slug }]);
    const record = records[0];
    if (!record) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const catalogLocale = await prefixToCatalogLocaleCode(locale);
    const site = await readSiteSettings(catalogLocale);
    const cardDisplayByViewport = resolveCardDisplayByViewport(site as Record<string, unknown>);

    return NextResponse.json(
      {
        slug: record.slug,
        name: record.name,
        brand: record.brand,
        short_description: record.short_description,
        price: record.price,
        old_price: record.old_price,
        primary_image: record.primary_image,
        gallery_images: record.gallery_images,
        in_stock: record.in_stock,
        rating: record.rating,
        reviews_count: record.reviews_count,
        cardDisplayByViewport,
      },
      {
        headers: {
          "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load preview" },
      { status: 500 },
    );
  }
}
