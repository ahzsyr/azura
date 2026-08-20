import "server-only";

import { getCompanyInfo } from "@/lib/data";
import { resolveSiteOrigin } from "@/features/seo/resolve-site-origin";
import {
  getSearchIntelligencePlatform,
  type SearchIntelligencePlatform,
} from "../platform";
import { hydrateConnectorsFromSeoConfig } from "../integrations/seo-bridge";
import type { ConnectorConfigSnapshot } from "../integrations/seo-config-map";
import {
  loadExecutionRecords,
  saveExecutionRecords,
} from "../operations/persistence";

let operationsHydration: Promise<void> | null = null;

async function ensureOperationsHydrated(platform: SearchIntelligencePlatform) {
  if (!operationsHydration) {
    operationsHydration = (async () => {
      const records = await loadExecutionRecords().catch(() => []);
      platform.operations.hydrate(records);
      platform.operations.setOnChange((next) => {
        void saveExecutionRecords(next);
      });
    })();
  }
  await operationsHydration;
}

export function resetSearchOperationsHydrationForTests() {
  operationsHydration = null;
}

export async function getSearchOperationsPlatform(): Promise<SearchIntelligencePlatform> {
  const siteOrigin = await resolveSiteOrigin("public");
  const platform = getSearchIntelligencePlatform({ siteOrigin });
  await ensureOperationsHydrated(platform);
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
