import { isModuleActive } from "@/modules/marketing/module-profile";
import type { MarketingCapabilityId } from "@/modules/marketing/core/capabilities/types";

const DEFAULTS: Record<string, boolean> = {
  "marketing.core": true,
  "marketing.connection": true,
  "marketing.publishing": false,
  "marketing.analytics": false,
  "marketing.tracking": false,
  "marketing.leadSync": false,
  "marketing.messaging": false,
  "marketing.advertising": false,
  "marketing.commerce": false,
};

function readEnvFlag(name: string, fallback: boolean): boolean {
  const raw = process.env[name]?.trim().toLowerCase();
  if (raw === "1" || raw === "true" || raw === "on") return true;
  if (raw === "0" || raw === "false" || raw === "off") return false;
  return fallback;
}

export function isMarketingCoreEnabled(): boolean {
  if (!isModuleActive()) return false;
  return readEnvFlag("MARKETING_CORE_ENABLED", DEFAULTS["marketing.core"]);
}

export function isMarketingCapabilityEnabled(capability: MarketingCapabilityId): boolean {
  if (!isMarketingCoreEnabled()) return false;
  const key = `marketing.${capability}` as const;
  const envKey = `MARKETING_${capability.toUpperCase()}_ENABLED`;
  return readEnvFlag(envKey, DEFAULTS[key] ?? false);
}
