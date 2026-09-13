import { Suspense } from "react";
import { CatalogWorkspaceShell } from "@/features/catalog/admin/catalog-workspace-shell";
import { CatalogNavigationBuilderFromQuery } from "./navigation-builder-from-query";

export const metadata = {
  title: "Catalog Navigation",
};

export default function CatalogNavigationAdminPage() {
  return (
    <CatalogWorkspaceShell>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading navigation…</p>}>
        <CatalogNavigationBuilderFromQuery />
      </Suspense>
    </CatalogWorkspaceShell>
  );
}
