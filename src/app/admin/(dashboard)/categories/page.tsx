import { loadCollectionsAdminInitialProps } from "@/features/catalog/admin/load-collections-admin-props";
import { CatalogWorkspaceShell } from "@/features/catalog/admin/catalog-workspace-shell";
import { CatalogCollectionsClient } from "@/app/admin/(dashboard)/collections/catalog-collections-client";

/**
 * Canonical Categories admin hub.
 * Reuses the collections admin panel during dual-write.
 */
export default async function AdminCategoriesPage() {
  const props = await loadCollectionsAdminInitialProps();

  return (
    <CatalogWorkspaceShell>
      <CatalogCollectionsClient {...props} />
    </CatalogWorkspaceShell>
  );
}
