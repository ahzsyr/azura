import type { ModuleIngressAccess } from "@/config/deployment-profile/site-features";

export type StatusPageMutationDecision =
  | { allow: true }
  | { allow: false; reason: Exclude<ModuleIngressAccess, "active"> };

/**
 * Pure fail-closed decision for Status Page mutations.
 * Unit-tested without Prisma — pass the access string from resolveModuleIngressAccess.
 */
export function decideStatusPageMutation(access: ModuleIngressAccess): StatusPageMutationDecision {
  if (access === "active") return { allow: true };
  return { allow: false, reason: access };
}
