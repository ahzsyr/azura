import type { Locale } from "@/i18n/routing";
import { SectionHeader } from "@/components/marketing/section";
import { getLocalizedField } from "@/lib/utils";
import { resolveItemField } from "@/features/builder/blocks/marketing/lib/resolve-item-locale";
import { productsDataService } from "@/features/products/products-data.service";
import { ProductSpecsTable } from "@/features/products/components/pdp/product-specs-table";
import type { Product, ProductSpecificationGroup } from "@/features/products/types";
import { parseProductSpecificationsProps } from "@/features/builder/blocks/commerce/product-blocks/lib/parse-block-props";

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
    technology: resolveItemField(g as Record<string, unknown>, "title", locale),
    items: g.rows.map((row) => ({
      name: resolveItemField(row as Record<string, unknown>, "name", locale),
      value: resolveItemField(row as Record<string, unknown>, "value", locale),
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
