import { CatalogComparisonShell } from "@/components/comparison/catalog-comparison-shell";
import { loadComparisonShellProps } from "@/features/comparison/load-comparison-shell-props";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function CompareLayout({ children, params }: Props) {
  const { locale } = await params;
  const comparison = await loadComparisonShellProps(locale);

  return (
    <CatalogComparisonShell locale={locale} comparison={comparison}>
      {children}
    </CatalogComparisonShell>
  );
}
