import { CatalogWorkspaceShell } from "@/features/catalog/admin/catalog-workspace-shell";
import { SyncCenterPanel } from "@/features/catalog/admin/sync/SyncCenterPanel";
import { adminLocale } from "@/features/catalog/admin/catalog-admin-config";

export const metadata = {
  title: "Catalog Sync",
};

export default function CatalogSyncAdminPage() {
  return (
    <CatalogWorkspaceShell>
      <SyncCenterPanel locale={adminLocale.code} />
    </CatalogWorkspaceShell>
  );
}
