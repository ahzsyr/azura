import { requireModulePermission } from "@/features/auth/guards";
import { MARKETING_BOUNDARY_MARKER } from "@/modules/marketing/boundary-marker";
import { MARKETING_MODULE_ID } from "@/modules/marketing/manifest";
import { isModuleActive } from "@/modules/marketing/module-profile";
import type { MarketingCapabilityId } from "@/modules/marketing/core/capabilities/types";
import { resolveMarketingIngressAccess } from "@/modules/marketing/ingress-guard";

void MARKETING_BOUNDARY_MARKER;

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

/** Soft availability / capability checks — fail-open via isModuleActive. */
export async function isMarketingCoreEnabled(): Promise<boolean> {
  if (!(await isModuleActive())) return false;
  return readEnvFlag("MARKETING_CORE_ENABLED", DEFAULTS["marketing.core"]);
}

export class MarketingMutationDeniedError extends Error {
  readonly reason: string;

  constructor(reason: string) {
    super(`Marketing module is not available (${reason})`);
    this.name = "MarketingMutationDeniedError";
    this.reason = reason;
  }
}

/**
 * Mutations / jobs / privileged admin writes — fail-closed via resolveMarketingIngressAccess
 * (profile omit, runtime inactive, ledger unavailable, or env kill).
 */
export async function assertMarketingModuleActive(): Promise<void> {
  const decision = await resolveMarketingIngressAccess();
  if (!decision.allow) {
    throw new MarketingMutationDeniedError(decision.reason);
  }
  await requireModulePermission(MARKETING_MODULE_ID, "manage");
}

/** Admin read UI — Module read (section ∩ marketing.read). */
export async function assertMarketingReadAllowed(): Promise<void> {
  await requireModulePermission(MARKETING_MODULE_ID, "read");
}

export async function isMarketingCapabilityEnabled(capability: MarketingCapabilityId): Promise<boolean> {
  if (!(await isMarketingCoreEnabled())) return false;
  const key = `marketing.${capability}` as const;
  const envKey = `MARKETING_${capability.toUpperCase()}_ENABLED`;
  return readEnvFlag(envKey, DEFAULTS[key] ?? false);
}
