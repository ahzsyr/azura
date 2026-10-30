import { resolveModuleIngressAccess } from "@/config/deployment-profile/site-features";
import { MARKETING_MODULE_ID } from "@/modules/marketing/manifest";
import {
  decideMarketingIngress,
  type MarketingIngressDecision,
} from "@/modules/marketing/ingress-decision";

export type {
  MarketingIngressDecision,
  MarketingIngressDenyReason,
} from "@/modules/marketing/ingress-decision";
export {
  decideMarketingIngress,
  marketingIngressSkipBody,
  marketingIngressSkipResponse,
  marketingWebhookInactiveGetResponse,
} from "@/modules/marketing/ingress-decision";

function readEnvCoreEnabled(): boolean {
  const raw = process.env.MARKETING_CORE_ENABLED?.trim().toLowerCase();
  if (raw === "1" || raw === "true" || raw === "on") return true;
  if (raw === "0" || raw === "false" || raw === "off") return false;
  return true;
}

/**
 * Node-side marketing ingress gate. Fail closed when SiteFeature cannot be read.
 * Profile-omitted is also denied here (defense in depth); middleware may 404
 * `/api/marketing*` separately via compiled disabled API prefixes.
 */
export async function resolveMarketingIngressAccess(): Promise<MarketingIngressDecision> {
  const moduleAccess = await resolveModuleIngressAccess(MARKETING_MODULE_ID);
  return decideMarketingIngress({
    moduleAccess,
    envCoreEnabled: readEnvCoreEnabled(),
  });
}
