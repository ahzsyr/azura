import { seoRepository } from "@/repositories/seo.repository";
import { RedirectsSettingsPanel } from "@/features/seo/admin/redirects-settings-panel";

export default async function RedirectsPage() {
  const redirects = await seoRepository.listRedirects(false);

  return <RedirectsSettingsPanel redirects={redirects} />;
}
