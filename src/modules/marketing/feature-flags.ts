import { isModuleActive } from "@/modules/marketing/module-profile";
import type { MarketingCapabilityId } from "@/modules/marketing/core/capabilities/types";

const DEFAULTS: Record<string, boolean> = {
  "marketing.core": true,
  "marketing.connection": true,
  "marketing.publishing": false,
  "marketing.analytics": true,
  "marketing.tracking": true,
  "marketing.leadSync": true,
  "marketing.messaging": false,
  "marketing.advertising": true,
  "marketing.commerce": false,
};

function readEnvFlag(name: string, fallback: boolean): boolean {
  const raw = process.env[name]?.trim().toLowerCase();
  if (raw === "1" || raw === "true" || raw === "on") return true;
  if (raw === "0" || raw === "false" || raw === "off") return false;
  return fallback;
}

export async function isMarketingCoreEnabled(): Promise<boolean> {
  if (!(await isModuleActive())) return false;
  return readEnvFlag("MARKETING_CORE_ENABLED", DEFAULTS["marketing.core"]);
}

export async function assertMarketingModuleActive(): Promise<void> {
  if (!(await isMarketingCoreEnabled())) {
    throw new Error("Marketing module is not enabled in this deployment profile");
  }
}

export async function isMarketingCapabilityEnabled(capability: MarketingCapabilityId): Promise<boolean> {
  if (!(await isMarketingCoreEnabled())) return false;
  const key = `marketing.${capability}` as const;
  const envKey = `MARKETING_${capability.toUpperCase()}_ENABLED`;
  return readEnvFlag(envKey, DEFAULTS[key] ?? false);
}
