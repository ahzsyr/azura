import Papa from "papaparse";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function numOrNull(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function parseCsvProducts(content: string): Record<string, unknown>[] {
  const result = Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  if (result.errors.length > 0) {
    const msg = result.errors.map((e) => e.message).join("; ");
    throw new Error(`CSV parse error: ${msg}`);
  }

  return result.data
    .filter((row) => Object.values(row).some((v) => String(v ?? "").trim() !== ""))
    .map((row) => {
      const title =
        row.productTitle?.trim() ||
        row.name?.trim() ||
        row.title?.trim() ||
        "";
      const slug = row.slug?.trim() || (title ? slugify(title) : "");
      const priceValue = numOrNull(row.price ?? row.priceValue);
      const currency = row.priceCurrency?.trim() || row.currency?.trim() || "USD";

      const product: Record<string, unknown> = {
        slug,
        productTitle: title,
        name: title,
        id: row.id?.trim() || row.sku?.trim() || slug,
        brand: row.brand?.trim() || undefined,
        category: row.category?.trim() || undefined,
        availability: row.availability?.trim() || undefined,
        stock_status: row.stockStatus?.trim() || row.stock_status?.trim() || undefined,
        short_description: row.short_description?.trim() || row.shortDescription?.trim() || undefined,
        mpn: row.mpn?.trim() || row.sku?.trim() || undefined,
        price: {
          value: priceValue ?? 0,
          currency,
        },
        media: { images: [] },
        reviews: { rating: 0, count: 0 },
      };

      if (row.categories?.trim()) {
        product.categories = row.categories.split("|").map((c) => c.trim()).filter(Boolean);
      }
      if (row.tags?.trim()) {
        product.tags = row.tags.split("|").map((t) => t.trim()).filter(Boolean);
      }

      return product;
    });
}
