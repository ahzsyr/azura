import { ComparisonProvider } from "@/features/comparison/comparison-provider";
import type { ComparisonShellProps } from "@/features/comparison/load-comparison-shell-props";

type Props = {
  locale: string;
  children: React.ReactNode;
  comparison: ComparisonShellProps;
};

/** Sync shell — data is preloaded in loadLocaleLayoutData to avoid layout waterfalls. */
export function CatalogComparisonShell({ locale, children, comparison }: Props) {
  if (comparison.comparableTypes.length === 0) {
    return <>{children}</>;
  }

  return (
    <ComparisonProvider
      locale={locale}
      comparableTypes={comparison.comparableTypes}
      labels={comparison.labels}
    >
      {children}
    </ComparisonProvider>
  );
}
