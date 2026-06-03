import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { loadProductsAdminInitialProps } from "@/features/catalog/admin/load-products-admin-props";
import { CatalogProductsClient } from "./catalog-products-client";

export default async function CatalogProductsAdminPage() {
  const props = await loadProductsAdminInitialProps();

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Products"
        description="Manage on-disk product JSON, global storefront CTA, and product page / card layout tokens. Saves trigger collection rule matching."
      />
      <CatalogProductsClient {...props} />
    </div>
  );
}
