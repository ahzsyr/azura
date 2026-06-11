import type { Locale } from "@/i18n/routing";
import { SectionHeader } from "@/components/marketing/section";
import { getLocalizedField } from "@/lib/utils";
import { productsDataService } from "@/features/products/products-data.service";
import { ProductSpecsTable } from "@/features/products/components/pdp/product-specs-table";
import type { Product, ProductSpecificationGroup } from "@/features/products/types";
import { parseProductSpecificationsProps } from "@/features/product-blocks/lib/parse-block-props";

type Props = {
  locale: Locale;
  props: Record<string, unknown>;
  previewMode?: boolean;
};

function manualGroupsToProduct(
  groups: ReturnType<typeof parseProductSpecificationsProps>["manualGroups"],
  locale: string,
): ProductSpecificationGroup[] {
  return groups.map((g) => ({
    technology: locale.startsWith("ar")
      ? g.titleAr || g.titleEn
      : g.titleEn || g.titleAr,
    items: g.rows.map((row) => ({
      name: locale.startsWith("ar") ? row.nameAr || row.nameEn : row.nameEn || row.nameAr,
      value: locale.startsWith("ar") ? row.valueAr || row.valueEn : row.valueEn || row.valueAr,
    })),
  }));
}

export async function ProductSpecificationsBlockRenderer({
  locale,
  props: raw,
  previewMode,
}: Props) {
  const p = parseProductSpecificationsProps(raw);
  const title = getLocalizedField(p, "title", locale);
  let product: Product | null = null;

  if (p.productSlug.trim()) {
    const loaded = await productsDataService.getProduct(locale, p.productSlug.trim());
    product = loaded?.product ?? null;
  }

  if (!product && p.manualGroups.length > 0) {
    product = {
      id: "preview",
      productTitle: "Preview",
      price: { value: 0, currency: "USD" },
      media: { images: [] },
      reviews: { rating: 0, count: 0 },
      specifications: manualGroupsToProduct(p.manualGroups, locale),
    };
  }

  if (!product) {
    if (previewMode) {
      return (
        <p className="text-center text-sm text-muted-foreground py-8">
          Set a product slug or add manual specification groups.
        </p>
      );
    }
    return null;
  }

  return (
    <div>
      {title ? <SectionHeader title={title} /> : null}
      <div className={title ? "mt-8" : undefined}>
        <ProductSpecsTable product={product} />
      </div>
    </div>
  );
}
