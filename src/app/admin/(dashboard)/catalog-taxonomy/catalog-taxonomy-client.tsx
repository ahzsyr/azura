"use client";

import { CatalogTaxonomyPanel } from "@/features/catalog/admin/taxonomy/CatalogTaxonomyPanel";
import type { CatalogTaxonomyAdminProps } from "@/features/catalog/admin/load-catalog-taxonomy-props";

export function CatalogTaxonomyClient(props: CatalogTaxonomyAdminProps) {
  return <CatalogTaxonomyPanel {...props} />;
}
