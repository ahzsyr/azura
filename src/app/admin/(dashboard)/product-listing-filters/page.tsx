import { CatalogWorkspaceShell } from "@/features/catalog/admin/catalog-workspace-shell";
import { CatalogPageHeader } from "@/features/catalog/admin/ui/catalog-page-header";
import { readSiteSettings } from "@/features/catalog/site-settings.service";
import { ProductListingFiltersAdminPanel } from "@/features/products/admin/product-listing-filters-panel";
import { resolveProductListingFiltersFromSite } from "@/features/products/listing/resolve-product-listing-filters";

export const metadata = {
  title: "Catalog Filters",
};

export default async function ProductListingFiltersAdminPage() {
  const siteSettings = await readSiteSettings();
  const initialSettings = resolveProductListingFiltersFromSite(siteSettings);

  return (
    <CatalogWorkspaceShell>
      <div className="space-y-6">
        <CatalogPageHeader
          title="Filters"
          description="Control which filters are available in the product catalog sidebar. Enabled filters with no options stay hidden automatically."
        />
        <ProductListingFiltersAdminPanel initialSettings={initialSettings} />
      </div>
    </CatalogWorkspaceShell>
  );
}
