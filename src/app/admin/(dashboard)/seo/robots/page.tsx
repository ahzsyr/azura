import { seoRepository } from "@/repositories/seo.repository";
import type { SeoGlobalConfig } from "@/features/seo/types";
import { RobotsSettingsClient } from "@/features/seo/admin/robots-settings-client";

export default async function AdminRobotsPage() {
  let config: SeoGlobalConfig = {};
  try {
    config = await seoRepository.getGlobalConfig();
  } catch {
    // DB unavailable
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  return <RobotsSettingsClient config={config} siteUrl={siteUrl} />;
}
