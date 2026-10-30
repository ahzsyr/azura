import type { ModuleIngressAccess } from "@/config/deployment-profile/site-features";

export type AdvancedSeoMutationDecision =
  | { allow: true }
  | { allow: false; reason: Exclude<ModuleIngressAccess, "active"> };

/**
 * Pure fail-closed decision for Advanced SEO mutations / Advanced admin pages.
 * Unit-tested without Prisma — pass the access string from resolveModuleIngressAccess.
 */
export function decideAdvancedSeoMutation(access: ModuleIngressAccess): AdvancedSeoMutationDecision {
  if (access === "active") return { allow: true };
  return { allow: false, reason: access };
}
