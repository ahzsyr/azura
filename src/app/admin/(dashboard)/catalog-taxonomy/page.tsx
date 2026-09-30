import { loadCatalogTaxonomyAdminProps } from "@/features/catalog/admin/load-catalog-taxonomy-props";
import { CatalogWorkspaceShell } from "@/features/catalog/admin/catalog-workspace-shell";
import { CatalogTaxonomyClient } from "./catalog-taxonomy-client";

export default async function CatalogTaxonomyAdminPage() {
  const props = await loadCatalogTaxonomyAdminProps();

  return (
    <CatalogWorkspaceShell>
      <CatalogTaxonomyClient {...props} />
    </CatalogWorkspaceShell>
  );
}
