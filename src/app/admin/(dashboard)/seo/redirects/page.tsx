import { seoRepository } from "@/repositories/seo.repository";
import { RedirectsSettingsPanel } from "@/features/seo/admin/redirects-settings-panel";
import { listPublicRouteCatalog } from "@/features/seo/admin/route-catalog.service";

export default async function RedirectsPage() {
  const [redirects, routeCatalog] = await Promise.all([
    seoRepository.listRedirects(false),
    listPublicRouteCatalog().catch(() => []),
  ]);

  return <RedirectsSettingsPanel redirects={redirects} routeCatalog={routeCatalog} />;
}
