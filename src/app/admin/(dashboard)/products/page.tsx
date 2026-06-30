import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { assertAdminRouteEnabled } from "@/config/deployment-profile";
import { loadProductsAdminInitialProps } from "@/features/catalog/admin/load-products-admin-props";
import { CatalogProductsClient } from "./catalog-products-client";

export default async function CatalogProductsAdminPage() {
  assertAdminRouteEnabled("/admin/products");
  const props = await loadProductsAdminInitialProps();

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Products"
        description="Manage catalog products, global storefront CTA, and the visual product page builder."
      />
      <CatalogProductsClient {...props} />
    </div>
  );
}
