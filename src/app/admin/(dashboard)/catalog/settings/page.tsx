import { CatalogWorkspaceShell } from "@/features/catalog/admin/catalog-workspace-shell";
import { CatalogSettingsPanel } from "@/features/catalog/admin/settings/CatalogSettingsPanel";
import { adminLocale } from "@/features/catalog/admin/catalog-admin-config";
import { readSiteSettings } from "@/features/catalog/site-settings.service";
import {
  normalizeProductListingLayoutPartial,
  resolveProductListingLayout,
} from "@/features/catalog/lib/catalog-layout";
import {
  DEFAULT_CATEGORY_CREATION_POLICY,
  type CategoryCreationPolicy,
} from "@/features/catalog/navigation/types";

export const metadata = {
  title: "Catalog Settings",
};

function parsePolicy(raw: unknown): CategoryCreationPolicy {
  if (raw === "manual_only" || raw === "manual_plus_approved" || raw === "automatic") {
    return raw;
  }
  return DEFAULT_CATEGORY_CREATION_POLICY;
}

export default async function CatalogSettingsAdminPage() {
  const site = await readSiteSettings(adminLocale.code);
  const initialPolicy = parsePolicy(site.categoryCreationPolicy);
  const initialListingLayout = resolveProductListingLayout(
    normalizeProductListingLayoutPartial(site.productListingLayout),
  );

  return (
    <CatalogWorkspaceShell>
      <CatalogSettingsPanel
        initialPolicy={initialPolicy === "automatic" ? "manual_only" : initialPolicy}
        initialListingLayout={initialListingLayout}
        locale={adminLocale.code}
      />
    </CatalogWorkspaceShell>
  );
}
