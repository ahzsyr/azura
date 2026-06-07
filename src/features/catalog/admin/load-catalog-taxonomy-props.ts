import "server-only";

import { adminLocale } from "@/features/catalog/admin/catalog-admin-config";
import { readCatalogTaxonomy } from "@/features/catalog/admin/catalog-taxonomy";

export type CatalogTaxonomyAdminProps = {
  initialBrands: string[];
  initialTags: string[];
  initialAdminLocaleCode: string;
};

export async function loadCatalogTaxonomyAdminProps(): Promise<CatalogTaxonomyAdminProps> {
  const { brands, tags } = await readCatalogTaxonomy(adminLocale.code);
  return {
    initialBrands: brands,
    initialTags: tags,
    initialAdminLocaleCode: adminLocale.code,
  };
}
