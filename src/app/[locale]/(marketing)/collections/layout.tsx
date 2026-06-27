import "@/styles/routes/catalog-collections.css";
import { CatalogComparisonShell } from "@/components/comparison/catalog-comparison-shell";
import { loadComparisonShellProps } from "@/features/comparison/load-comparison-shell-props";
import { ProductQuickViewProvider } from "@/features/products/quick-view/product-quick-view-provider";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function CollectionsLayout({ children, params }: Props) {
  const { locale } = await params;
  const comparison = await loadComparisonShellProps(locale);

  return (
    <CatalogComparisonShell locale={locale} comparison={comparison}>
      <ProductQuickViewProvider>{children}</ProductQuickViewProvider>
    </CatalogComparisonShell>
  );
}
