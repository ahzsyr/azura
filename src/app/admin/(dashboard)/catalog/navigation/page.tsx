import { Suspense } from "react";
import { CatalogWorkspaceShell } from "@/features/catalog/admin/catalog-workspace-shell";
import { themeService } from "@/features/theme/theme.service";
import { getDefaultThemeTokens } from "@/features/theme/default-theme-tokens";
import { CatalogNavigationBuilderFromQuery } from "./navigation-builder-from-query";

export const metadata = {
  title: "Catalog Navigation",
};

export default async function CatalogNavigationAdminPage() {
  const themeTokens =
    (await themeService.getPublished().catch(() => null)) ?? getDefaultThemeTokens();

  return (
    <CatalogWorkspaceShell>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading navigation…</p>}>
        <CatalogNavigationBuilderFromQuery themeTokens={themeTokens} />
      </Suspense>
    </CatalogWorkspaceShell>
  );
}
