import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { loadCollectionsAdminInitialProps } from "@/features/catalog/admin/load-collections-admin-props";
import { CatalogCollectionsClient } from "./catalog-collections-client";

export default async function CatalogCollectionsAdminPage() {
  const props = await loadCollectionsAdminInitialProps();

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Collections"
        description="Rule-based collections for the JSON product catalog. Changes sync to locale files."
      />
      <CatalogCollectionsClient {...props} />
    </div>
  );
}