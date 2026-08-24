import "server-only";

import { adminLocale } from "@/features/catalog/admin/catalog-admin-config";
import {
  readCatalogBrandProfiles,
  readCatalogTaxonomy,
} from "@/features/catalog/admin/catalog-taxonomy";
import type { CatalogBrandProfile } from "@/features/catalog/types/catalog-brand-profile";

export type CatalogTaxonomyAdminProps = {
  initialBrands: string[];
  initialTags: string[];
  initialBrandProfiles: CatalogBrandProfile[];
  initialAdminLocaleCode: string;
};

export async function loadCatalogTaxonomyAdminProps(): Promise<CatalogTaxonomyAdminProps> {
  const [{ brands, tags }, brandProfiles] = await Promise.all([
    readCatalogTaxonomy(adminLocale.code),
    readCatalogBrandProfiles(adminLocale.code),
  ]);
  return {
    initialBrands: brands,
    initialTags: tags,
    initialBrandProfiles: brandProfiles,
    initialAdminLocaleCode: adminLocale.code,
  };
}
