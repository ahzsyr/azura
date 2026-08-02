import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { loadCatalogTaxonomyAdminProps } from "@/features/catalog/admin/load-catalog-taxonomy-props";
import { CatalogTaxonomyClient } from "./catalog-taxonomy-client";

export default async function CatalogTaxonomyAdminPage() {
  const props = await loadCatalogTaxonomyAdminProps();

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Brands & Tags"
        description="Manage canonical brand and tag lists for the JSON product catalog. Use sync to import values from existing products."
      />
      <CatalogTaxonomyClient {...props} />
    </div>
  );
}
