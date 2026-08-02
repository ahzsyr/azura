import "server-only";

import { getCompanyInfo } from "@/lib/data";
import { resolveSiteOrigin } from "@/features/seo/resolve-site-origin";
import {
  getSearchIntelligencePlatform,
  type SearchIntelligencePlatform,
} from "../platform";
import { hydrateConnectorsFromSeoConfig } from "../integrations/seo-bridge";
import type { ConnectorConfigSnapshot } from "../integrations/seo-config-map";

export async function getSearchOperationsPlatform(): Promise<SearchIntelligencePlatform> {
  const siteOrigin = await resolveSiteOrigin("public");
  const platform = getSearchIntelligencePlatform({ siteOrigin });
  const company = await getCompanyInfo().catch(() => null);
  if (company?.name) {
    const orgs = await platform.query.findByType("Organization");
    if (orgs.length === 0) {
      await platform.ingestCompanyProfile(company);
    }
  }
  await hydrateConnectorsFromSeoConfig(platform.connectors);
  return platform;
}

export async function getSearchOperationsGoogleWorkspace(): Promise<{
  platform: SearchIntelligencePlatform;
  snapshots: ConnectorConfigSnapshot[];
  health: ReturnType<SearchIntelligencePlatform["connectors"]["listHealth"]>;
}> {
  const platform = await getSearchOperationsPlatform();
  const snapshots = await hydrateConnectorsFromSeoConfig(platform.connectors);
  return {
    platform,
    snapshots,
    health: platform.connectors.listHealth(),
  };
}
