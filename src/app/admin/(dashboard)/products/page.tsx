import { Suspense } from "react";
import { assertAdminRouteEnabled } from "@/config/deployment-profile";
import { loadProductsAdminInitialProps } from "@/features/catalog/admin/load-products-admin-props";
import { CatalogWorkspaceShell } from "@/features/catalog/admin/catalog-workspace-shell";
import { CatalogProductsClient } from "./catalog-products-client";

export default async function CatalogProductsAdminPage() {
  assertAdminRouteEnabled("/admin/products");
  const props = await loadProductsAdminInitialProps();

  return (
    <CatalogWorkspaceShell>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading products…</p>}>
        <CatalogProductsClient {...props} />
      </Suspense>
    </CatalogWorkspaceShell>
  );
}
