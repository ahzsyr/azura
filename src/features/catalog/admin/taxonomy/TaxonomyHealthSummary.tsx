"use client";

import { CatalogSection, CatalogStat, CatalogStatGroup } from "@/features/catalog/admin/ui";

export type TaxonomyHealthSummaryProps = {
  total: number;
  empty: number;
  unmatched: number;
  warnings: number;
  title?: string;
  description?: string;
};

export function TaxonomyHealthSummary({
  total,
  empty,
  unmatched,
  warnings,
  title = "Taxonomy health",
  description = "Quick health signals for catalog taxonomy coverage.",
}: TaxonomyHealthSummaryProps) {
  return (
    <CatalogSection title={title} description={description}>
      <CatalogStatGroup>
        <CatalogStat label="Total" value={total} />
        <CatalogStat label="Empty" value={empty} warn={empty > 0} />
        <CatalogStat label="Unmatched" value={unmatched} warn={unmatched > 0} />
        <CatalogStat label="Warnings" value={warnings} warn={warnings > 0} />
      </CatalogStatGroup>
    </CatalogSection>
  );
}
