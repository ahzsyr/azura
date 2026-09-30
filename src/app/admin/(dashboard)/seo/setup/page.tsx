import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { seoSetupStore } from "@/features/seo/operator/setup-store";
import { SeoSetupWizard } from "@/features/seo/operator/components/seo-setup-wizard";
import { getCompanyInfo } from "@/lib/data";
import { seoIntegrationRegistry } from "@/features/seo/integrations/registry";
import { resolveSiteOrigin } from "@/features/seo/resolve-site-origin";

export default async function AdminSeoSetupPage() {
  const [setup, company, health, origin] = await Promise.all([
    seoSetupStore.get(),
    getCompanyInfo().catch(() => null),
    seoIntegrationRegistry.health({ liveGoogle: false }).catch(() => []),
    resolveSiteOrigin("admin-preview").catch(() => "https://brt-me.com"),
  ]);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="SEO Setup"
        description="Configure once. You can skip and manage everything manually at any time."
      />
      <SeoSetupWizard
        setup={setup}
        siteName={company?.name ?? "Your site"}
        siteUrl={origin.replace(/\/$/, "")}
        googleConnected={health.some((item) => (item.provider === "google" || item.provider === "google_indexing") && item.ok)}
        bingConnected={health.some((item) => item.provider === "bing" && item.ok)}
        indexNowConnected={health.some((item) => item.provider === "indexnow" && item.ok)}
      />
    </div>
  );
}
